import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Security: no dynamic code execution or raw HTML injection.
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "react/no-danger": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
