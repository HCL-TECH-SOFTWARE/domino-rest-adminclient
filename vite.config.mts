/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { defineConfig, type Plugin } from 'vite';
import { standardDecorators } from './scripts/standard-decorators.mjs';
// Monaco 0.56's exports map hides its own stylesheet; monaco-css.mts explains and resolves it.
import { monacoCssAlias } from './monaco-css.mjs';
// Guards src/monaco-registrations.ts — both of its failure modes are silent. See the file.
import { assertMonacoImports } from './monaco-imports.mjs';

/** The appearance boot module, as a Rollup input name and as a source path. */
const APPEARANCE_BOOT = { name: 'appearance-boot', path: 'src/appearance-boot.ts' };

/**
 * Gives `src/appearance-boot.ts` its own `<script>` tag in the built HTML (#987).
 *
 * The module writes the theme class from `localStorage` and has to land before the first
 * paint, which is why #707 made it a second module script rather than folding it into the app
 * entry. **That never worked in a build.** Vite emits **one entry chunk per HTML page**
 * regardless of how many `<script type="module" src>` tags it finds — measured both ways, and
 * moving the tag between `<head>` and `<body>` changes not one byte of the output. So the
 * 300-byte boot was concatenated into the ~90 kB app chunk and could not run until all of it
 * had arrived. The ordering *within* the chunk was right, which is why nothing looked wrong.
 *
 * Declaring the module as a second Rollup input (below) splits the code out but is not enough
 * on its own: with no tag of its own it becomes a *static import* of the app chunk, so the
 * browser still has to fetch and parse ~90 kB before it can discover it. The tag is the point.
 *
 * `head-prepend`, so it precedes the entry script Vite injects into `<head>`. Both are
 * `type="module"` and therefore deferred, so document order is execution order.
 *
 * It is a tag and not an inline block because the production CSP sends `script-src 'self'`
 * (#752); `test/csp-policy.test.ts` pins that directive.
 */
function appearanceBootScript(): Plugin {
  let base = '/';
  return {
    name: 'keep-appearance-boot-script',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      // `post`, so `ctx.bundle` is populated — the hashed filename is only known once the
      // chunks exist. In dev there is no bundle and the source path is served as-is.
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) {
          return [
            {
              tag: 'script',
              attrs: { type: 'module', src: `${base}${APPEARANCE_BOOT.path}` },
              injectTo: 'head-prepend'
            }
          ];
        }

        const chunk = bootChunk(ctx.bundle);
        /*
         * Preload what the boot imports, or the head start is spent on a second round trip.
         *
         * The chunk is ~80 bytes and imports `services/theme-service`, which Rollup emits as
         * its own small chunk because the shell imports it too. Without these links the
         * browser has to fetch the boot, parse it, discover the import and fetch again — one
         * sequential RTT in front of the very write this is here to bring forward. Vite emits
         * the same links for the entry it injects itself; ours is injected, so it does not.
         */
        return [
          ...(chunk.imports ?? []).map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `${base}${file}` },
            injectTo: 'head-prepend' as const
          })),
          {
            tag: 'script',
            attrs: { type: 'module', crossorigin: true, src: `${base}${chunk.fileName}` },
            injectTo: 'head-prepend' as const
          }
        ];
      }
    }
  };

  /**
   * The emitted boot entry chunk.
   *
   * Throws rather than skipping the tag. A missing tag is invisible — the app boots, every test
   * passes, and the only symptom is a flash of the light theme on a dark-mode load, which is
   * exactly the bug this exists to prevent.
   */
  function bootChunk(bundle: Record<string, unknown>): { fileName: string; imports?: string[] } {
    const chunk = Object.values(bundle).find(
      (output): output is { type: string; isEntry: boolean; name: string; fileName: string; imports?: string[] } => {
        const candidate = output as { type?: string; isEntry?: boolean; name?: string };
        return candidate.type === 'chunk' && !!candidate.isEntry && candidate.name === APPEARANCE_BOOT.name;
      }
    );
    if (!chunk) {
      throw new Error(
        `No "${APPEARANCE_BOOT.name}" entry chunk in the bundle. It is declared in ` +
          'build.rollupOptions.input; if that entry was renamed or removed, this plugin has ' +
          'no tag to inject and the theme flash (#987, #707) comes back silently.'
      );
    }
    return chunk;
  }
}

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
assertMonacoImports();

export default defineConfig({
  // The one alias the app cannot build without. `vitest.config.ts` repeats it, because these
  // two configs are standalone; `monaco-css.mts` holds the single definition and the reason.
  resolve: {
    alias: [...monacoCssAlias]
  },
  plugins: [
    stampBuildVersion(),
    appearanceBootScript(),
    // The Lit elements use standard (TC39) decorators with `accessor` (#747), and SWC is the
    // only transform in the tree that implements them. This was `@vitejs/plugin-react-swc`
    // until #996 — a React plugin in a repo with zero `.tsx` files, kept solely for this.
    // Every option, and why each is load-bearing, is documented at the plugin.
    //
    // Getting it wrong is loud, not silent: Lit's standard decorators reject a plain field
    // with "Unsupported decorator location: field" at module load, in dev and production
    // alike. That is the point of the migration. Getting the *transform* wrong is the silent
    // one — SWC's legacy default emits `accessor` untransformed and the build still exits 0.
    //
    // Must stay identical to the registration in `vitest.config.ts`; sharing one module is
    // what makes that true by construction rather than by review.
    standardDecorators()
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
    manifest: true,
    /*
     * Two entries, and `index.html` no longer declares the second one as a script tag —
     * `appearanceBootScript()` injects that. Naming the module here is what makes Rollup emit
     * it as its own ~300-byte entry chunk instead of concatenating it into the app's.
     *
     * The pair is not a duplication: with the tag gone from the HTML, nothing in the app graph
     * imports this module, so its code appears exactly once. Verified by grepping the entry
     * chunk for the appearance write — zero matches.
     */
    rollupOptions: {
      input: {
        index: 'index.html',
        [APPEARANCE_BOOT.name]: APPEARANCE_BOOT.path
      }
    }
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
        connect-src 'self' data: https: 'report-sample';
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
