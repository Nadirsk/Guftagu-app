import { BlendMode, ClipOp, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';

import type { SvgaFrame, SvgaSprite } from './decode';
import { getSvgaImage, getSvgaPath, type LoadedSvga } from './load';

// Built lazily, not at module scope - on web, Skia's WASM backend is still
// loading when this module is first imported, so an eager Skia.Paint() crashes.
let _paint: ReturnType<typeof Skia.Paint> | undefined;
let _mattePaint: ReturnType<typeof Skia.Paint> | undefined;

function getPaint() {
  if (!_paint) _paint = Skia.Paint();
  return _paint;
}

function getMattePaint() {
  if (!_mattePaint) {
    _mattePaint = Skia.Paint();
    _mattePaint.setBlendMode(BlendMode.DstIn);
  }
  return _mattePaint;
}

function drawSprite(canvas: SkCanvas, movie: LoadedSvga, sprite: SvgaSprite, frame: SvgaFrame, alphaPaint = getPaint()) {
  const image = getSvgaImage(movie, sprite.imageKey);
  if (!image) return;
  canvas.save();
  const t = frame.transform;
  if (t) canvas.concat([t.a, t.c, t.tx, t.b, t.d, t.ty, 0, 0, 1]);
  if (frame.clipPath) {
    const path = getSvgaPath(frame.clipPath);
    if (path) canvas.clipPath(path, ClipOp.Intersect, true);
  }
  alphaPaint.setAlphaf(Math.min(1, frame.alpha));
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, frame.width || image.width(), frame.height || image.height()),
    alphaPaint,
  );
  canvas.restore();
}

function drawFrame(canvas: SkCanvas, movie: LoadedSvga, index: number) {
  const byKey = new Map<string, SvgaSprite>();
  for (const s of movie.sprites) byKey.set(s.imageKey, s);

  for (const sprite of movie.sprites) {
    // Matte sprites (`*.matte`) only act as masks for the sprite referencing them.
    if (sprite.imageKey.endsWith('.matte')) continue;
    const frame = sprite.frames[index];
    if (!frame || frame.alpha <= 0) continue;

    const matte = sprite.matteKey ? byKey.get(sprite.matteKey) : undefined;
    const matteFrame = matte?.frames[index];
    if (!matte || !matteFrame) {
      drawSprite(canvas, movie, sprite, frame);
      continue;
    }
    canvas.saveLayer();
    drawSprite(canvas, movie, sprite, frame);
    if (matteFrame.alpha > 0) drawSprite(canvas, movie, matte, matteFrame, getMattePaint());
    canvas.restore();
  }
}

const pictureCache = new Map<string, SkPicture>();

/** Records one frame in movie (viewBox) coordinates. */
export function recordSvgaFrame(movie: LoadedSvga, index: number): SkPicture {
  const key = `${movie.id}:${index}`;
  const cached = movie.cacheFrames ? pictureCache.get(key) : undefined;
  if (cached) return cached;

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, movie.width, movie.height));
  drawFrame(canvas, movie, index);
  const picture = recorder.finishRecordingAsPicture();
  if (movie.cacheFrames) pictureCache.set(key, picture);
  return picture;
}
