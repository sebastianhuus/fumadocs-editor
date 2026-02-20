import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    dts: true,
    fixedExtension: false,
    target: 'es6',
    format: 'esm',
    entry: [
      'src/index.ts',
      'src/plugin.ts',
      'src/server.ts',
    ],
  },
  {
    dts: true,
    fixedExtension: false,
    target: 'es6',
    format: 'esm',
    entry: [
      'src/components/index.ts',
      'src/adapters/mdx-editor.tsx',
    ],
    banner: '"use client";',
  },
]);
