/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

/**
 * Injects `<meta name="admin-ui-daily-build-version">` into the served/built HTML.
 *
 * This replaces the old `prebuild` step (`updateBuildVersion.js`), which rewrote the
 * *tracked* `index.html` in place by round-tripping it through JSDOM — so every build
 * reformatted the whole file (collapsed the doctype, stripped every self-closing slash,
 * dropped the trailing newline) and left the working tree dirty. `transformIndexHtml`
 * stamps the output instead, and the source file is never touched.
 *
 * Runs in dev too, so `Footer.tsx` and `LoginPage.tsx` — the two readers — see a value
 * either way. Same source of truth as before: the CI-provided run number, falling back
 * to the build timestamp.
 */
function stampBuildVersion(): Plugin {
  const content = process.env.REACT_APP_ADMIN_UI_BUILD_VERSION || new Date().toISOString();
  return {
    name: 'keep-stamp-build-version',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { name: 'admin-ui-daily-build-version', content },
        injectTo: 'head'
      }
    ]
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    stampBuildVersion(),
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
      }
    })
  ],
  build: {
    assetsDir: 'admin/assets'
  },
  server: {
    headers: {
      /*
       * Mirrors the `/admin/ui` policy in `jar/config/config.json`, directive for directive.
       * That is the whole point of it: a dev policy looser than production reports nothing
       * and proves nothing.
       *
       * It used to send `style-src-attr 'unsafe-inline'` where production sends `'none'`,
       * which is exactly how #685's inline styles went unnoticed — the one directive the app
       * was violating was the one dev did not enforce.
       *
       * Two caveats when reading the output, both dev-only:
       *   - Vite's HMR client is an inline script, so `script-src 'self'` reports it. The
       *     built bundle has no inline script; index.html loads two modules by src.
       *   - Lit's dev build injects `<style>` elements, so `style-src-elem 'self'` reports
       *     those too. Production Lit uses adoptedStyleSheets, which CSP does not govern.
       * Neither appears against `npm run build` output. Anything else that reports here is
       * real, and will be refused in production.
       */
      'Content-Security-Policy-Report-Only': `
        default-src 'self' data: 'report-sample';
        script-src 'self' 'report-sample';
        style-src-attr 'none' 'report-sample';
        style-src-elem 'self' 'report-sample';
        font-src 'self' data: 'report-sample';
        img-src 'self' data: 'report-sample';
        worker-src 'self' blob: 'report-sample';
        connect-src 'self' data: * 'report-sample';
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
