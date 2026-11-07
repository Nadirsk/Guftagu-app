import { strFromU8, unzlibSync } from 'fflate';

/**
 * Minimal decoder for SVGA 2.x files (zlib-compressed protobuf `MovieEntity`,
 * see github.com/svga/SVGA-Format), ported from Mehfil. Only what the Store's
 * assets use is decoded: bitmap sprites, per-frame clip paths and matte (mask)
 * sprites. Vector shapes are skipped.
 */

export type SvgaTransform = { a: number; b: number; c: number; d: number; tx: number; ty: number };

export type SvgaFrame = {
  alpha: number;
  width: number;
  height: number;
  transform: SvgaTransform | null;
  clipPath: string | null;
};

export type SvgaSprite = {
  imageKey: string;
  matteKey: string | null;
  frames: SvgaFrame[];
};

export type SvgaMovie = {
  width: number;
  height: number;
  fps: number;
  frames: number;
  /** Encoded image bytes (PNG/WebP) by key. Non-image entries (audio) are kept too. */
  images: Map<string, Uint8Array>;
  sprites: SvgaSprite[];
};

const EMPTY_FRAME: SvgaFrame = { alpha: 0, width: 0, height: 0, transform: null, clipPath: null };

/**
 * A protobuf cursor over one message. Every reader of a file shares the root's
 * buffer and DataView, and fields are walked with `next()` in a plain loop -
 * Hermes runs generators and per-message DataViews slowly enough that a frame
 * of a few thousand sprite-frames took a third of a second to parse.
 */
class Reader {
  pos: number;
  readonly end: number;
  /** The last field read by `next()`. */
  field = 0;
  wire = 0;
  private buf: Uint8Array;
  private view: DataView;
  constructor(buf: Uint8Array, view: DataView, start: number, end: number) {
    this.buf = buf;
    this.view = view;
    this.pos = start;
    this.end = end;
  }
  static of(buf: Uint8Array): Reader {
    return new Reader(buf, new DataView(buf.buffer, buf.byteOffset, buf.byteLength), 0, buf.length);
  }
  /** Reads the next field's key into `field`/`wire`; false at the end of the message. */
  next(): boolean {
    if (this.pos >= this.end) return false;
    const key = this.varint();
    this.field = key >>> 3;
    this.wire = key & 7;
    return true;
  }
  varint(): number {
    const buf = this.buf;
    let byte = buf[this.pos++];
    if (byte < 0x80) return byte;
    let result = byte & 0x7f;
    let shift = 7;
    for (;;) {
      byte = buf[this.pos++];
      result += shift < 28 ? (byte & 0x7f) << shift : (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) return result;
      shift += 7;
    }
  }
  float(): number {
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }
  bytes(): Uint8Array {
    const len = this.varint();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
  sub(): Reader {
    const len = this.varint();
    const r = new Reader(this.buf, this.view, this.pos, this.pos + len);
    this.pos += len;
    return r;
  }
  skip() {
    const wire = this.wire;
    if (wire === 0) this.varint();
    else if (wire === 1) this.pos += 8;
    else if (wire === 2) {
      const len = this.varint();
      this.pos += len;
    } else if (wire === 5) this.pos += 4;
    else throw new Error(`SVGA: unsupported wire type ${wire}`);
  }
}

// Hermes has no TextDecoder; fflate's decoder works on every JS engine.
const utf8 = { decode: (bytes: Uint8Array) => strFromU8(bytes) };

function readTransform(r: Reader): SvgaTransform {
  const t = { a: 0, b: 0, c: 0, d: 0, tx: 0, ty: 0 };
  while (r.next()) {
    const f = r.field;
    if (r.wire !== 5) r.skip();
    else if (f === 1) t.a = r.float();
    else if (f === 2) t.b = r.float();
    else if (f === 3) t.c = r.float();
    else if (f === 4) t.d = r.float();
    else if (f === 5) t.tx = r.float();
    else if (f === 6) t.ty = r.float();
    else r.skip();
  }
  return t;
}

function readFrame(r: Reader): SvgaFrame {
  const frame: SvgaFrame = { alpha: 0, width: 0, height: 0, transform: null, clipPath: null };
  while (r.next()) {
    const f = r.field;
    const w = r.wire;
    if (f === 1 && w === 5) frame.alpha = r.float();
    else if (f === 2 && w === 2) {
      const layout = r.sub();
      while (layout.next()) {
        if (layout.wire !== 5) layout.skip();
        else if (layout.field === 3) frame.width = layout.float();
        else if (layout.field === 4) frame.height = layout.float();
        else layout.skip();
      }
    } else if (f === 3 && w === 2) frame.transform = readTransform(r.sub());
    else if (f === 4 && w === 2) {
      const d = utf8.decode(r.bytes());
      frame.clipPath = d.length > 0 ? d : null;
    } else r.skip();
  }
  return frame;
}

function readSprite(r: Reader, frameCount: number): SvgaSprite {
  const sprite: SvgaSprite = { imageKey: '', matteKey: null, frames: [] };
  while (r.next()) {
    const f = r.field;
    const w = r.wire;
    if (f === 1 && w === 2) sprite.imageKey = utf8.decode(r.bytes());
    else if (f === 2 && w === 2) sprite.frames.push(readFrame(r.sub()));
    else if (f === 3 && w === 2) sprite.matteKey = utf8.decode(r.bytes()) || null;
    else r.skip();
  }
  while (sprite.frames.length < frameCount) sprite.frames.push(EMPTY_FRAME);
  return sprite;
}

/** Inflates raw `.svga` file bytes into the protobuf `decodeSvgaData` reads. */
export function inflateSvga(fileBytes: Uint8Array): Uint8Array {
  return unzlibSync(fileBytes);
}

/** Decodes an already inflated `.svga` (see `inflateSvga`). */
export function decodeSvgaData(data: Uint8Array): SvgaMovie {
  const movie: SvgaMovie = { width: 0, height: 0, fps: 20, frames: 0, images: new Map(), sprites: [] };
  const spriteReaders: Reader[] = [];
  const root = Reader.of(data);

  while (root.next()) {
    const f = root.field;
    const w = root.wire;
    if (f === 2 && w === 2) {
      const params = root.sub();
      while (params.next()) {
        const pf = params.field;
        const pw = params.wire;
        if (pf === 1 && pw === 5) movie.width = params.float();
        else if (pf === 2 && pw === 5) movie.height = params.float();
        else if (pf === 3 && pw === 0) movie.fps = params.varint();
        else if (pf === 4 && pw === 0) movie.frames = params.varint();
        else params.skip();
      }
    } else if (f === 3 && w === 2) {
      const entry = root.sub();
      let key = '';
      let value: Uint8Array = new Uint8Array(0);
      while (entry.next()) {
        if (entry.field === 1 && entry.wire === 2) key = utf8.decode(entry.bytes());
        else if (entry.field === 2 && entry.wire === 2) value = entry.bytes();
        else entry.skip();
      }
      movie.images.set(key, value);
    } else if (f === 4 && w === 2) {
      // Params may come after sprites in the stream; decode sprites last so
      // every sprite is padded to the final frame count.
      spriteReaders.push(root.sub());
    } else root.skip();
  }

  movie.sprites = spriteReaders.map((r) => readSprite(r, movie.frames));
  return movie;
}

/** Decodes raw `.svga` file bytes (still zlib-compressed). */
export function decodeSvga(fileBytes: Uint8Array): SvgaMovie {
  return decodeSvgaData(inflateSvga(fileBytes));
}
