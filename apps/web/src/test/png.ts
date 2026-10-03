import { inflateSync } from "node:zlib";

export type Picture = Readonly<{
  width: number;
  height: number;
  channels: 3 | 4;
  data: Uint8Array;
}>;

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads an 8-bit, non-interlaced RGB or RGBA PNG: enough to look at the app's own icons in tests. */
export function decodePng(file: Buffer): Picture {
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  let width = 0;
  let height = 0;
  let channels: 3 | 4 = 3;
  const compressed: Buffer[] = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at);
    const type = file.toString("latin1", at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, color, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) {
        throw new Error("only 8-bit non-interlaced RGB or RGBA PNGs are supported");
      }
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") compressed.push(body);
    at += 12 + length;
  }

  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(compressed));
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const byte = raw[y * (stride + 1) + 1 + x]!;
      const left = x >= channels ? data[y * stride + x - channels]! : 0;
      const up = y > 0 ? data[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? data[(y - 1) * stride + x - channels]! : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? (left + up) >> 1
                : paeth(left, up, upLeft);
      data[y * stride + x] = (byte + predictor) & 255;
    }
  }
  return { width, height, channels, data };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Where the picture is not its own background (taken from the top-left pixel). */
export function inkBox(picture: Picture): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  pixels: [number, number][];
} {
  const { width, height, channels, data } = picture;
  const bg = [data[0]!, data[1]!, data[2]!];
  const box = { left: width, top: height, right: -1, bottom: -1, pixels: [] as [number, number][] };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const distance =
        Math.abs(data[i]! - bg[0]!) +
        Math.abs(data[i + 1]! - bg[1]!) +
        Math.abs(data[i + 2]! - bg[2]!);
      if (distance < 60) continue;
      box.left = Math.min(box.left, x);
      box.top = Math.min(box.top, y);
      box.right = Math.max(box.right, x);
      box.bottom = Math.max(box.bottom, y);
      box.pixels.push([x, y]);
    }
  }
  return box;
}
