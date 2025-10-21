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
      'content-security-policy': `
        default-src 'self' data: gap: 'unsafe-inline' *; 
        script-src 'self' 'unsafe-inline' data: gap: https://ssl.gstatic.com https://cdn.jsdelivr.net/npm/@shoelace-style/; 
        worker-src 'self' blob:; 
        connect-src 'self' data: *; 
        style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/npm/@shoelace-style/; 
        font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@shoelace-style/; 
        img-src 'self' data: gap:;
        report-uri /admin/ui
      `.replace(/\s+/g, ' ').trim(),
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
