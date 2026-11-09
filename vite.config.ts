import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000' } },
  test: {
    environment: 'jsdom', setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'dist-server/**'],
    fileParallelism: false, maxWorkers: 1,
  },
  build: {
    rollupOptions: {
      output: { manualChunks(id) {
        if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
        if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'react-vendor';
      } },
    },
  },
});
