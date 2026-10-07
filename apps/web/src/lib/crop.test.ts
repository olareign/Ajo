import { clampCrop, coverScale, MAX_ZOOM, outputSize, sourceSquare } from "./crop";

const VIEW = 280;

describe("crop arithmetic", () => {
  it("scales the shorter side to fill the view", () => {
    expect(coverScale(2000, 1000, VIEW)).toBeCloseTo(0.28);
    expect(coverScale(1000, 3000, VIEW)).toBeCloseTo(0.28);
  });

  it("at zoom 1 centred, shows the middle square of the picture", () => {
    const s = sourceSquare(2000, 1000, VIEW, { zoom: 1, x: 0, y: 0 });
    expect(s.side).toBeCloseTo(1000);
    expect(s.left).toBeCloseTo(500);
    expect(s.top).toBeCloseTo(0);
  });

  it("zooming in shows a smaller square, and sliding moves it the other way", () => {
    const zoomed = sourceSquare(2000, 1000, VIEW, { zoom: 2, x: 0, y: 0 });
    expect(zoomed.side).toBeCloseTo(500);
    expect(zoomed.left).toBeCloseTo(750);
    // Dragging the picture right shows what was to its left.
    const slid = sourceSquare(2000, 1000, VIEW, { zoom: 2, x: 100, y: 0 });
    expect(slid.left).toBeLessThan(zoomed.left);
  });

  it("never lets the picture be pulled off an edge, or zoomed outside its limits", () => {
    const far = clampCrop(2000, 1000, VIEW, { zoom: 1, x: 9999, y: 9999 });
    // Zoom 1 on a wide picture: it can slide sideways by half the overhang, and not at all up or down.
    expect(far.x).toBeCloseTo((2000 * 0.28 - VIEW) / 2);
    expect(far.y).toBe(0);
    expect(clampCrop(2000, 1000, VIEW, { zoom: 99, x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
    expect(clampCrop(2000, 1000, VIEW, { zoom: 0.1, x: 0, y: 0 }).zoom).toBe(1);
  });

  it("always stays inside the original, whatever it is asked for", () => {
    for (const crop of [
      { zoom: 1, x: -9999, y: 9999 },
      { zoom: 4, x: 9999, y: -9999 },
      { zoom: 2.5, x: 0, y: 0 },
    ]) {
      const s = sourceSquare(640, 480, VIEW, crop);
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.top).toBeGreaterThanOrEqual(0);
      expect(s.left + s.side).toBeLessThanOrEqual(640 + 1e-6);
      expect(s.top + s.side).toBeLessThanOrEqual(480 + 1e-6);
    }
  });

  it("saves at most 512 pixels square, and never blows a small picture up", () => {
    expect(outputSize(3000)).toBe(512);
    expect(outputSize(300)).toBe(300);
    expect(outputSize(10)).toBe(64);
  });
});
