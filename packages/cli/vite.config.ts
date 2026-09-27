import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'node18',
    ssr: true,
    lib: {
      entry: {
        bin: resolve(__dirname, 'src/bin.ts'),
        index: resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^node:/, 'fs', 'path', 'http', 'url', 'util', 'os', 'crypto', 'events', 'stream'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
