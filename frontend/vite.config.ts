import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const backendHost = process.env.BACKEND_HOST || 'http://backend:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: backendHost,
        changeOrigin: true,
        secure: false,
        xfwd: true,
        headers: {
          host: 'localhost',
        },
      },
    },
  },
});
