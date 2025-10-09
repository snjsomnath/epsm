import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const backendHost = process.env.BACKEND_HOST || 'http://backend:8000';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['driver.js'],
  },
  build: {
    // Ensure assets are copied properly
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  publicDir: 'public',
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: backendHost,
        changeOrigin: true,
        secure: false,
        xfwd: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, 'to', backendHost);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
