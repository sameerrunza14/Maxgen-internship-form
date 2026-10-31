import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // During development, send /api requests to the Node.js backend
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
