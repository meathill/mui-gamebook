/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts', // We will create this file next
    include: ['packages/*/src/**/*.{test,spec}.{ts,tsx}'],
  },
});
