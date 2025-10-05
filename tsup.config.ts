import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts', 
    'src/types/index.ts',
    'src/queryUtils/index.ts',
    'src/queryKinds/dml/index.ts',
    'src/queryKinds/ddl/index.ts',
    'src/queryKinds/ddl/table/index.ts',
  ],
  target: ['esnext', 'node21'],
  format: ['cjs', 'esm'],
  ignoreWatch: ['**/*.test.ts', '**/*.spec.ts'],
  dts: true,
  outDir: 'dist',
  clean: true,
  treeshake: 'smallest',
  minifyIdentifiers: true,
  minifySyntax: true
})
