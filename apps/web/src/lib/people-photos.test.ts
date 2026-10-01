// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listPeoplePhotos } from "./people-photos";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "people-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("listPeoplePhotos", () => {
  it("returns the photos that exist, in order, as public paths", () => {
    for (const f of ["03.jpg", "01.jpg", "02.webp"]) writeFileSync(join(dir, f), "x");
    expect(listPeoplePhotos(dir)).toEqual(["/people/01.jpg", "/people/02.webp", "/people/03.jpg"]);
  });

  it("ignores anything that is not a numbered image", () => {
    for (const f of ["README.md", ".gitkeep", "ada.jpg", "01.txt", "1.jpg", "01.JPG"])
      writeFileSync(join(dir, f), "x");
    expect(listPeoplePhotos(dir)).toEqual(["/people/01.JPG"]);
  });

  it("returns nothing, rather than failing, when the folder is missing or empty", () => {
    expect(listPeoplePhotos(join(dir, "nope"))).toEqual([]);
    expect(listPeoplePhotos(dir)).toEqual([]);
  });
});
