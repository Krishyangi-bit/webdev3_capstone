import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app proxies API, upload and socket traffic to the
// Express server, so the browser sees a single origin. This keeps the
// HttpOnly refresh-token cookie same-site and avoids CORS configuration.
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:5100';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
      '/uploads': { target: BACKEND_URL, changeOrigin: true },
      '/socket.io': { target: BACKEND_URL, changeOrigin: true, ws: true },
    },
  },
});
