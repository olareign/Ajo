import { outputSize, sourceSquare, type Crop } from "./crop";

/** Draws the chosen square into a small JPEG. The one place the picture meets a canvas. */
export function cropToJpeg(
  image: HTMLImageElement,
  view: number,
  crop: Crop,
): Promise<Blob | null> {
  const { side, left, top } = sourceSquare(image.naturalWidth, image.naturalHeight, view, crop);
  const size = outputSize(side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, left, top, side, side, 0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}
