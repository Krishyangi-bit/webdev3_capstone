import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app proxies API, upload and socket traffic to the
// Express server, so the browser sees a single origin. This keeps the
// HttpOnly refresh-token cookie same-site and avoids CORS configuration.
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:5100';

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to IPv4 loopback so both http://localhost and http://127.0.0.1 work
    // (by default Vite may listen on IPv6 ::1 only on Windows).
    host: '127.0.0.1',
    // Fixed, uncommon port so CampusFix never silently lands on another app's port.
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
      '/uploads': { target: BACKEND_URL, changeOrigin: true },
      '/socket.io': { target: BACKEND_URL, changeOrigin: true, ws: true },
    },
  },
});
