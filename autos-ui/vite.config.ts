import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/autos-ui/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../Login/public/autos-ui',
    emptyOutDir: true,
  },
});
