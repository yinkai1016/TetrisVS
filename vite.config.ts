import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@client': fileURLToPath(new URL('./client', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'client/**/*.test.ts'],
  },
  server: {
    host: true,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
    },
  },
});
