import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Screens load in a request or two; on a busy machine the default one second is too tight.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});
