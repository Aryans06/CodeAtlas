import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    // Proxy /api calls to the Express backend on port 3001
    // This means when the frontend calls fetch('/api/chat'),
    // Vite forwards it to http://localhost:3001/api/chat
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
