import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all local IPs (127.0.0.1, localhost, LAN) for instant resolution
  },
});
