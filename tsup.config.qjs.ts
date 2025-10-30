import { defineConfig } from "tsup";

export default defineConfig({
  name: "For QuickJS",
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/queryUtils/index.ts",
    "src/queryKinds/dml/index.ts",
    "src/queryKinds/ddl/index.ts",
    "src/queryKinds/ddl/table/index.ts",
  ],
  target: ["es2023"],
  platform: "neutral",
  format: ["esm"],
  ignoreWatch: ["**/*.test.ts", "**/*.spec.ts"],
  dts: true,
  outDir: "dist-qjs",
  clean: true,
  treeshake: "smallest",
  minifyIdentifiers: true,
  minifySyntax: true,
});
