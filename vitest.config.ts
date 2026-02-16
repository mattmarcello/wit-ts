import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test-d.ts"],
    root: __dirname,
    typecheck: {
      enabled: false,
      checker: "tsc",
    },
  },
});
