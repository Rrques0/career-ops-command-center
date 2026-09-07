import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4317' } },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'career-hub.[hash].js',
        assetFileNames: 'career-hub.[hash][extname]'
      }
    }
  }
});
