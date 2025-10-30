import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      reporter: ["json", "html", "text"],
      exclude: [
        "node_modules",
        "dist",
        "**/*.test.ts",
        "**/*.spec.ts",
        "vitest.config.ts",
        "**/getOptionalPackages.ts",
        "**/index.ts",
      ],
      include: ["src/**/*.ts"],
    },
    retry: 3,
  },
});
