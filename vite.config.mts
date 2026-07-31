/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';

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
    // The Lit elements use standard (TC39) decorators with `accessor` (#747).
    //
    // `tsDecorators` is a misleading name: in @vitejs/plugin-react-swc it only sets SWC's
    // *parser* flag. It must stay `true` or SWC refuses to parse `@` at all — it is not a
    // choice of decorator semantics.
    //
    // The semantics are `decoratorVersion`, which SWC defaults to legacy ('2021-12'). Under
    // that default it silently emits `accessor` members untransformed, so the hook below is
    // required and cannot be dropped. SWC does not read tsconfig.json (esbuild does), so
    // this copy — not tsconfig.app.json — is what governs the build.
    //
    // Getting it wrong is loud, not silent: Lit's standard decorators reject a plain field
    // with "Unsupported decorator location: field" at module load, in dev and production
    // alike. That is the point of the migration.
    react({
      tsDecorators: true,
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc ??= {};
        options.jsc.transform ??= {};
        options.jsc.transform.decoratorVersion = '2022-03';
      }
    })
  ],
  build: {
    assetsDir: 'admin/assets',
    /*
     * Emits `dist/.vite/manifest.json`, which `scripts/bundle-budget.mjs` reads to walk the
     * entry's transitive closure — the chunks a browser must have before it can paint.
     *
     * The build log cannot answer that question. It lists all 104 chunks by size with no
     * indication of which are eager, so "the bundle is 15.4 MB" and "the bundle is 1.6 MB"
     * are both defensible readings of the same output. The manifest records each chunk's
     * `imports` (static) and `dynamicImports` (lazy), which is the distinction the budget
     * gate needs and the only place Vite writes it down.
     *
     * Note this ships `dist/.vite/manifest.json` with the app if the server serves `dist`
     * verbatim. It leaks nothing the asset filenames do not already, and the alternative —
     * a second throwaway build just to produce it — doubles CI build time.
     */
    manifest: true
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
