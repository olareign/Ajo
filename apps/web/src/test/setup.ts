import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { forgetAll } from "@/lib/visit-cache";

afterEach(() => {
  cleanup();
  // Each test starts a fresh visit.
  forgetAll();
});
