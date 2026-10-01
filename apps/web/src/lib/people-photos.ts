import { readdirSync } from "node:fs";

const PHOTO = /^\d{2}\.(jpe?g|webp|avif|png)$/i;

/**
 * Photos of members for the sample circle, taken from a folder (public/people): 01.jpg, 02.jpg and
 * so on, in spot order. Returns the public paths of the ones that exist, so a missing photo is never
 * requested and the circle falls back to initials instead of showing a broken image.
 */
export function listPeoplePhotos(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((file) => PHOTO.test(file))
      .sort()
      .map((file) => `/people/${file}`);
  } catch {
    return [];
  }
}
