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
      include: ['**/*.{ts,tsx}'],
      // The Lit elements are excluded because they contain no Linaria at all — their
      // `css` comes from `lit`, not `@linaria/core`. Running them through wyw was always
      // wasted work; since #747 it is also broken. wyw strips types with oxc-transform
      // (0.131), which mis-desugars the `accessor` keyword and emits a reference to a
      // private field it never declares:
      //     Private field '#___private_isSchema_3' must be declared in an enclosing class
      // Only `keep-elements/*.ts` is excluded. `KeepElements.tsx` stays in scope, as do
      // `access/styles.ts` and `database/settings/sections/styles.ts` — the two non-.tsx
      // files that really do declare Linaria `styled` components.
      exclude: ['**/components/keep-elements/*.ts']
    }),
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
    assetsDir: 'admin/assets'
  },
  server: {
    headers: {
      'Content-Security-Policy-Report-Only': `
        default-src 'self' 'report-sample';
        connect-src 'self' data: 'report-sample';
        font-src 'self' data: 'report-sample';
        img-src 'self' data: 'report-sample';
        script-src 'self' 'report-sample';
        style-src 'self' 'report-sample';
        style-src-attr 'unsafe-inline' 'report-sample';
        style-src-elem 'self' 'unsafe-inline' 'report-sample';
        worker-src 'self' blob data: 'report-sample';
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
