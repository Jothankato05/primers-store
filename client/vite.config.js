import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 takes a function here: keep three.js and the React runtime in their own cached files.
        manualChunks(id) {
          if (/node_modules\/three\//.test(id)) return 'three';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor';
        },
      },
    },
  },
});
