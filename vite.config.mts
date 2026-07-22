import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    wyw({
      include: ['**/*.{ts,tsx}'],
    }),
    react(),
  ],
  build: {
    assetsDir: 'admin/assets'
  },
  server: {
    headers: {
      'content-security-policy': `
        default-src 'self' data: gap: 'unsafe-inline' *; 
        script-src 'self' 'unsafe-inline' data: gap: https://ssl.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/; 
        worker-src 'self' blob:; 
        connect-src 'self' data: *; 
        style-src-attr 'none'; 
        style-src-elem 'self' https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/ 'unsafe-hashes' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='; 
        font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/; 
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
