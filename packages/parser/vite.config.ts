import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createRequire } from 'module';

const pkg = require('./package.json') as { dependencies?: Record<string, string> };

// 发 npm 用的 dist：JS 由 vite 打包（顺手修掉 extensionless 相对导入，
// 原生 node 可直接跑），d.ts 由 tsc 另行产出。workspace 内开发/测试
// 继续走 main 指向的 src，不受影响。
export default defineConfig({
  build: {
    target: 'node18',
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^node:/, ...Object.keys(pkg.dependencies ?? {})],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
