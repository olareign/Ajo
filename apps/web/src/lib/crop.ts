/**
 * A square crop of a picture, the way the photo screen works it: the picture is scaled to just cover
 * the square view (`zoom` 1) or larger, and slid about by (x, y), the picture centre's distance from
 * the view's centre in view pixels. Pure arithmetic, so it can be tested without a screen.
 */
export type Crop = Readonly<{ zoom: number; x: number; y: number }>;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

/** How much the picture is scaled at zoom 1: just enough that its shorter side fills the view. */
export const coverScale = (width: number, height: number, view: number) =>
  view / Math.min(width, height);

/** Keeps the picture covering the whole view: it can be slid, never pulled away from an edge. */
export function clampCrop(width: number, height: number, view: number, crop: Crop): Crop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const scale = coverScale(width, height, view) * zoom;
  const slackX = Math.max(0, (width * scale - view) / 2);
  const slackY = Math.max(0, (height * scale - view) / 2);
  return { zoom, x: clamp(crop.x, -slackX, slackX), y: clamp(crop.y, -slackY, slackY) };
}

/** The square of the original picture, in its own pixels, that the view is showing. */
export function sourceSquare(width: number, height: number, view: number, crop: Crop) {
  const { zoom, x, y } = clampCrop(width, height, view, crop);
  const scale = coverScale(width, height, view) * zoom;
  const side = view / scale;
  return {
    side,
    left: clamp(width / 2 - (view / 2 + x) / scale, 0, width - side),
    top: clamp(height / 2 - (view / 2 + y) / scale, 0, height - side),
  };
}

/** The saved picture: as sharp as the original allows, never larger than the server keeps. */
export const outputSize = (side: number) => Math.max(64, Math.min(512, Math.round(side)));
