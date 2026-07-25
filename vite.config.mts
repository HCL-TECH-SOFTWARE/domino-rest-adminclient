import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    wyw({
      include: ['**/*.{ts,tsx}']
    }),
    // tsDecorators + useDefineForClassFields:false let SWC transpile the Lit
    // elements' TypeScript experimental decorators (@customElement/@property/
    // @state/@query) with legacy semantics, so decorated class fields don't
    // shadow Lit's reactive accessors (see lit.dev/msg/class-field-shadowing).
    react({
      tsDecorators: true,
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc ??= {};
        options.jsc.transform ??= {};
        options.jsc.transform.useDefineForClassFields = false;
      },
    })
  ],
  build: {
    assetsDir: 'admin/assets'
  },
  server: {
    headers: {
      'disabledContent-Security-Policy': `
        default-src 'self' data: gap: 'unsafe-inline' *;
        script-src 'self' 'unsafe-inline' data: gap: https://ssl.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
        worker-src 'self' blob:;
        connect-src 'self' data: *;
        style-src-attr 'none';
        style-src-elem 'self' https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/ 'unsafe-hashes' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
        font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
        img-src 'self' data: gap:;
        report-uri /admin/ui
      `
        .replace(/\s+/g, ' ')
        .trim()
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
