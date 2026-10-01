import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      // Money logic must be fully covered (docs/project-plan.md, Definition of Done).
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
