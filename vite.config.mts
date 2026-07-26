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
        'Content-Security-Policy-Report-Only': `
        default-src 'self';
        connect-src 'self';
        font-src 'self' data:;
        img-src 'self' data:;
        script-src 'self';
        style-src 'self' 'unsafe-inline';
        worker-src 'self' data:;
        report-uri /api/csp-violation-report
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
