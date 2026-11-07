import { Skia, type SkImage, type SkPath } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { decodeSvgaData, inflateSvga, type SvgaMovie } from './decode';

export type LoadedSvga = SvgaMovie & {
  id: string;
  /** Small looping decorations (avatar frames, mic waves) cache whole frames. */
  cacheFrames: boolean;
};

const movies = new Map<string, Promise<LoadedSvga>>();
const MAX_MOVIES = 24;

/**
 * Decodes one embedded bitmap. The decoder's bitmaps are views into one big
 * inflated buffer, and RN Skia's `Data.fromBytes` copies a view's whole
 * `.buffer` (ignoring its offset and length) - so a view must be handed over
 * as an exact-size copy or Skia sees the entire SVGA instead of one PNG.
 */
function decodeImage(bytes: Uint8Array): SkImage | null {
  const exact = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice();
  return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(exact));
}

async function readBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('file:')) {
    return new Uint8Array(await new File(uri).arrayBuffer());
  }
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * A remote `.svga` (a Store item's `animation_url`) is downloaded into the cache
 * and kept there inflated. Inflating runs in JS and blocks it for over half a
 * second per file on a phone, so it is paid once per file, not on every launch.
 * Admin uploads get a new timestamped name on every upload, so a cached copy of
 * a URL is never stale.
 */
async function remoteData(url: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') return inflateSvga(await readBytes(url));
  const name = `svga-${url.replace(/[^a-z0-9.]/gi, '_').slice(-150)}`;
  const inflated = new File(Paths.cache, `${name}.raw`);
  if (inflated.exists) return readBytes(inflated.uri);

  const cached = new File(Paths.cache, name);
  if (!cached.exists) {
    // Downloaded under a temporary name first: an interrupted download must not
    // leave a truncated file that would then fail to decode on every launch.
    const part = await File.downloadFileAsync(url, new File(Paths.cache, `${name}.part`), { idempotent: true });
    await part.move(cached);
  }
  const data = inflateSvga(await readBytes(cached.uri));
  // Same temporary-name rule. Not awaited: playing need not wait for the disk,
  // and a failed write only means inflating again next launch.
  const part = new File(Paths.cache, `${name}.raw.part`);
  (async () => {
    part.create({ overwrite: true });
    await part.write(data);
    await part.move(inflated);
    cached.delete();
  })().catch(() => {});
  return data;
}

/**
 * Loads and decodes a `.svga` once; later calls share the result. On web, Skia's
 * WASM is only there if it was loaded before the app imported Skia; without it
 * this rejects and callers keep showing the still artwork.
 */
export function loadSvga(url: string): Promise<LoadedSvga> {
  let pending = movies.get(url);
  if (pending) {
    // Most recently used last, for the trim below.
    movies.delete(url);
    movies.set(url, pending);
  } else {
    pending = (async () => {
      const movie = decodeSvgaData(await remoteData(url));
      // A movie whose bitmaps cannot be decoded would "play" invisibly - and the
      // still artwork shown until the first frame would be taken away for nothing.
      const firstImage = movie.images.values().next().value;
      if (!firstImage || !decodeImage(firstImage)) {
        throw new Error(`SVGA has no drawable images: ${url}`);
      }
      let imageBytes = 0;
      movie.images.forEach((b) => (imageBytes += b.byteLength));
      return {
        ...movie,
        id: url,
        cacheFrames: movie.width <= 512 && movie.height <= 512 && imageBytes < 3_000_000,
      };
    })();
    pending.catch(() => movies.delete(url));
    movies.set(url, pending);
    // Each decoded movie holds its whole inflated file (one to two MB), so only
    // the latest few stay in memory; an evicted one reloads from disk quickly.
    for (const key of movies.keys()) {
      if (movies.size <= MAX_MOVIES) break;
      movies.delete(key);
    }
  }
  return pending;
}

/**
 * Loads `urls` one after another in the background, so a later `SvgaPlayer`
 * for any of them paints at once. Decoding holds the JS thread, so the files
 * go one at a time with a pause between, leaving taps room to get through.
 * Returns a function that stops before the next file.
 */
export function preloadSvgas(urls: string[]): () => void {
  let stopped = false;
  (async () => {
    for (const url of urls) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (stopped) return;
      await loadSvga(url).catch(() => {});
    }
  })();
  return () => {
    stopped = true;
  };
}

// Decoded bitmaps are the expensive part, so keep a shared pixel-budgeted LRU
// instead of decoding every image up front.
const IMAGE_PIXEL_BUDGET = 40_000_000;
const images = new Map<string, SkImage>();
let cachedPixels = 0;

export function getSvgaImage(movie: LoadedSvga, key: string): SkImage | null {
  const cacheKey = `${movie.id}:${key}`;
  const hit = images.get(cacheKey);
  if (hit) {
    images.delete(cacheKey);
    images.set(cacheKey, hit);
    return hit;
  }
  const bytes = movie.images.get(key);
  if (!bytes || bytes.byteLength === 0) return null;
  const image = decodeImage(bytes);
  if (!image) return null;

  images.set(cacheKey, image);
  cachedPixels += image.width() * image.height();
  for (const [k, img] of images) {
    if (cachedPixels <= IMAGE_PIXEL_BUDGET || k === cacheKey) break;
    images.delete(k);
    cachedPixels -= img.width() * img.height();
  }
  return image;
}

const paths = new Map<string, SkPath | null>();

export function getSvgaPath(d: string): SkPath | null {
  let path = paths.get(d);
  if (path === undefined) {
    path = Skia.Path.MakeFromSVGString(d);
    paths.set(d, path);
  }
  return path;
}
