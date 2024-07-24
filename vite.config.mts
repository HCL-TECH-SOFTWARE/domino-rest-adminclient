import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'admin/assets'
  },
  server: {
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
