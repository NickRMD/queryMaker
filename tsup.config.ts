import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  target: ['esnext', 'node21'],
  format: ['cjs', 'esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  treeshake: 'smallest',
  minifyIdentifiers: true,
  minifySyntax: true
})
