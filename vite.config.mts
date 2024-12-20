import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'admin/assets'
  },
  server: {
    headers: {
      'content-security-policy':
        "default-src 'self' data: ; script-src 'self' data: gap: https://ssl.gstatic.com https://cdn.jsdelivr.net/npm/@shoelace-style/; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/npm/@shoelace-style/; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@shoelace-style/; img-src 'self' data: gap:"
    },
    proxy: {
      '/api': {
        target: 'https://frascati.projectkeep.io',
        changeOrigin: true
      },
      '/adminui.json': {
        target: 'https://frascati.projectkeep.io',
        changeOrigin: true
      }
    }
  }
});
