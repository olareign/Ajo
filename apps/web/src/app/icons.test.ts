// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng, inkBox } from "@/test/png";
import manifest from "./manifest";

const file = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)));
const publicFile = (src: string) => file(`../../public${src}`);

/** The whole Àjọ logo is wider than it is tall (about 1.6 to 1). A square cut out of its middle is not. */
const WORDMARK_RATIO = [1.45, 1.85] as const;

function measure(png: Buffer) {
  const picture = decodePng(png);
  const ink = inkBox(picture);
  const width = ink.right - ink.left + 1;
  const height = ink.bottom - ink.top + 1;
  const size = picture.width;
  return {
    picture,
    ink,
    ratio: width / height,
    widthShare: width / size,
    centreX: (ink.left + ink.right) / 2 / size,
    centreY: (ink.top + ink.bottom) / 2 / size,
    margin: Math.min(ink.left, ink.top, size - 1 - ink.right, size - 1 - ink.bottom) / size,
  };
}

const icons = manifest().icons ?? [];
const any = icons.filter((i) => i.purpose === "any");
const maskable = icons.filter((i) => i.purpose === "maskable");

describe("the app icons show the whole logo", () => {
  it("declares icons for every use: plain at two sizes, and a maskable one", () => {
    expect(any.map((i) => i.sizes).sort()).toEqual(["192x192", "512x512"]);
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });

  it.each(any.map((i) => [i.src, i.sizes] as const))(
    "%s: the full wordmark, centred, with room around it",
    (src, sizes) => {
      const m = measure(publicFile(src));
      expect(`${m.picture.width}x${m.picture.height}`).toBe(sizes);
      expect(m.ratio).toBeGreaterThanOrEqual(WORDMARK_RATIO[0]);
      expect(m.ratio).toBeLessThanOrEqual(WORDMARK_RATIO[1]);
      expect(m.widthShare).toBeGreaterThanOrEqual(0.68);
      expect(m.widthShare).toBeLessThanOrEqual(0.92);
      expect(m.margin).toBeGreaterThanOrEqual(0.04);
      expect(Math.abs(m.centreX - 0.5)).toBeLessThan(0.02);
      expect(Math.abs(m.centreY - 0.5)).toBeLessThan(0.04);
    },
  );

  it.each(maskable.map((i) => [i.src, i.sizes] as const))(
    "%s: the whole logo stays inside the circle phones crop to",
    (src, sizes) => {
      const m = measure(publicFile(src));
      expect(`${m.picture.width}x${m.picture.height}`).toBe(sizes);
      expect(m.ratio).toBeGreaterThanOrEqual(WORDMARK_RATIO[0]);
      expect(m.ratio).toBeLessThanOrEqual(WORDMARK_RATIO[1]);
      expect(m.widthShare).toBeGreaterThanOrEqual(0.55);
      // The safe zone is a circle of 40% of the icon's width, whatever shape the phone cuts.
      const size = m.picture.width;
      const outside = m.ink.pixels.filter(
        ([x, y]) => Math.hypot(x - size / 2, y - size / 2) > size * 0.4,
      );
      expect(outside).toHaveLength(0);
    },
  );

  it("uses a different file for the maskable icon, since it needs more room around the logo", () => {
    const plain = new Set(any.map((i) => i.src));
    for (const icon of maskable) expect(plain.has(icon.src)).toBe(false);
  });

  it("gives iPhones the whole logo too (the home-screen icon the system rounds itself)", () => {
    const m = measure(file("./apple-icon.png"));
    expect(m.picture.width).toBe(180);
    expect(m.ratio).toBeGreaterThanOrEqual(WORDMARK_RATIO[0]);
    expect(m.ratio).toBeLessThanOrEqual(WORDMARK_RATIO[1]);
    expect(m.widthShare).toBeGreaterThanOrEqual(0.68);
    expect(m.margin).toBeGreaterThanOrEqual(0.04);
  });

  it("keeps the browser-tab icon to the pig-and-coin mark, big and square, because a wordmark cannot be read at 16 pixels", () => {
    const m = measure(file("./icon.png"));
    expect(m.picture.width).toBe(192);
    expect(m.ratio).toBeGreaterThan(0.5);
    expect(m.ratio).toBeLessThan(1.2);
    expect(m.margin).toBeGreaterThanOrEqual(0.03);
    expect(m.ink.bottom - m.ink.top + 1).toBeGreaterThanOrEqual(m.picture.height * 0.7);
  });
});

describe("the logo the emails load", () => {
  const png = publicFile("/email/logo.png");

  it("is a PNG (email clients cannot show webp or svg), wide enough to stay sharp on a phone", () => {
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const picture = decodePng(png);
    expect(picture.width).toBe(480);
    expect(picture.width / picture.height).toBeGreaterThan(WORDMARK_RATIO[0]);
    expect(picture.width / picture.height).toBeLessThan(WORDMARK_RATIO[1]);
  });

  it("is the whole logo with no margin, so the email decides the space around it", () => {
    const ink = inkBox(decodePng(png));
    expect(ink.left).toBeLessThanOrEqual(1);
    expect(ink.top).toBeLessThanOrEqual(1);
  });
});

