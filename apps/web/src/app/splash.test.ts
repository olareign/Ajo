// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng, inkBox } from "@/test/png";
import { SPLASH, splashFile, splashMedia } from "@/lib/splash";

const publicFile = (src: string) =>
  readFileSync(fileURLToPath(new URL(`../../public${src}`, import.meta.url)));

describe("iPhone launch screens", () => {
  it("covers every size once, with a media query iOS can match exactly", () => {
    const sizes = SPLASH.map((s) => `${s.width}x${s.height}`);
    expect(new Set(sizes).size).toBe(sizes.length);
    for (const s of SPLASH) {
      expect(s.width % s.ratio).toBe(0);
      expect(s.height % s.ratio).toBe(0);
    }
    expect(splashMedia({ width: 1179, height: 2556, ratio: 3 })).toBe(
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
  });

  it.each(SPLASH.map((s) => [splashFile(s), s] as const))(
    "%s exists at exactly its size, with the whole logo centred and not cut",
    (src, s) => {
      const picture = decodePng(publicFile(src));
      expect([picture.width, picture.height]).toEqual([s.width, s.height]);
      const ink = inkBox(picture);
      const width = ink.right - ink.left + 1;
      const height = ink.bottom - ink.top + 1;
      // The wordmark is about 1.6 times wider than tall, as in the app icons.
      expect(width / height).toBeGreaterThan(1.45);
      expect(width / height).toBeLessThan(1.85);
      expect(width / s.width).toBeGreaterThan(0.4);
      expect(width / s.width).toBeLessThan(0.6);
      expect(Math.abs((ink.left + ink.right) / 2 / s.width - 0.5)).toBeLessThan(0.02);
      expect(Math.abs((ink.top + ink.bottom) / 2 / s.height - 0.5)).toBeLessThan(0.02);
    },
  );
});
