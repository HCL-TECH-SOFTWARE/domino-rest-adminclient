/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

// Standalone Vitest config. It reuses the same plugin graph as the Vite build
// (Linaria via @wyw-in-js + SWC/React) so components transform identically to
// `npm run build`/`dev`, but deliberately omits the dev-server CSP header and
// /api proxy from vite.config.mts, which are irrelevant in a test context.
export default defineConfig({
  // Resolve dependencies through their `browser` export condition. Both keys are needed —
  // they fix two different packages, and each was silently degrading every component test
  // in this suite. Found while fixing #742.
  //
  // 1. `ssr.resolve.conditions` → `lit`. Vitest loads test modules through Vite's SSR
  //    pipeline, which resolves with Node conditions. `lit` ships a per-condition
  //    `is-server` module and the Node one hardcodes `isServer = true`, so every
  //    Lit/WebAwesome component ran in server mode despite jsdom providing `window` and
  //    `document`. WebAwesome gates real behaviour on that flag:
  //        static get validators() { return isServer ? [] : [CustomErrorValidator()]; }
  //    With an empty validator list `updateValidity()` returns early, never reaching
  //    `setValidity()` — so **no WebAwesome form control could ever be invalid in a test.**
  //
  // 2. `resolve.conditions` → `@lit/react`. Its exports map has a `node` branch pointing at
  //    a build compiled with `NODE_MODE = true`, which omits the `useLayoutEffect` that
  //    applies props to the underlying custom element. Every `Keep*` wrapper therefore
  //    rendered with **no props at all**: `<KeepInputText label="Username" required id="x">`
  //    produced an element whose `label` was `''`, `required` was `false` and `id` was
  //    unset. Any assertion about a wrapped element's configured state was vacuous.
  //
  // Together with the no-op `attachInternals` that `test/setupTests.ts` used to install,
  // this is how #742's 18 dead `data-user-invalid` selectors survived unnoticed.
  ssr: { resolve: { conditions: ['browser'] } },
  resolve: { conditions: ['browser'] },
  plugins: [
    // Keep wyw so Linaria `styled` components resolve to real components.
    // `exclude` mirrors vite.config.mts — the Lit elements use `css` from `lit`, never
    // Linaria, and wyw's oxc type-stripper mis-desugars the `accessor` keyword. See the
    // longer note there.
    wyw({
      include: ['**/*.{ts,tsx}'],
      exclude: ['**/components/keep-elements/**'],
    }),
    // Must mirror vite.config.mts exactly — see the longer note there.
    //
    // `tsDecorators` is SWC's *parser* flag, not a semantics choice: false makes SWC
    // reject `@` outright. `decoratorVersion: '2022-03'` selects standard (TC39)
    // decorators, which the Lit elements need for `accessor` (#747); SWC's default is
    // legacy, and under it `accessor` members are emitted untransformed.
    react({
      tsDecorators: true,
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc ??= {};
        options.jsc.transform ??= {};
        options.jsc.transform.decoratorVersion = '2022-03';
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/admin/ui' }, // == old jest testEnvironmentOptions.url
    },
    setupFiles: ['./test/setupTests.ts'],
    css: false, // ignore CSS/Linaria virtual modules (replaces __mocks__/styleMock.js)
    // Every run used to end with "close timed out after 10000ms / something prevents Vite
    // server from exiting", adding ~10s to each local and CI run (#692).
    //
    // It is not a leak in our tests. `--reporter=hanging-process` blames ~2,956 FILEHANDLE
    // entries with no stack, alongside `napi_rs_threadsafe_function` — a native addon, not
    // a timer or observer of ours. Bisected to the coverage provider, not to any test:
    //
    //   vitest run test/utils/form.test.ts               0.97s, clean
    //   vitest run test/utils/form.test.ts --coverage    13.28s, "close timed out"
    //   vitest run <a Monaco/Lit suite>                  1.04s, clean
    //
    // So the handles belong to @vitest/coverage-v8 (4.1.10, matching vitest), and there is
    // nothing in this repo to dispose. Tests have already finished and the exit code is
    // already 0 by the time this timer starts — it only bounds how long Vitest waits for a
    // server that will not close. Capping it at 1s takes a full-suite run from ~13s of
    // teardown to ~1s. Revisit when coverage-v8 stops holding them.
    teardownTimeout: 1000,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true, // reset mock history between tests (replaces jest.clearAllMocks)
    reporters: process.env.CI
      ? ['default', ['vitest-sonar-reporter', { outputFile: 'coverage/sonar-report.xml' }]]
      : ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts', // pure type/const modules
        'src/index.tsx',
        // keep-source is a 752-line interactive tree/source editor (context
        // menus, drag, dialogs, validation). It is covered at the API level
        // by keep-source.test.ts, but exhaustive unit coverage in jsdom is
        // impractical, so it is excluded from the coverage ratchet.
        'src/components/keep-elements/keep-source.ts',
      ],
      // Enforced ratchet gate. Every floor sits a few points below what is actually
      // measured, so a routine refactor does not fail CI but a real regression does.
      // Raise these as coverage grows — a gate far below reality protects nothing.
      //
      // Re-measured on `new_code` @ 7ec97b1, 87 files / 996 tests. The previous numbers
      // were set at #690, when the suite was 53 files / 509 tests; #788, #789, #790,
      // #793–#799 have landed since and every gate had drifted below what it guards. The
      // worst was `utils` functions — floor 55 against a real 96.4, a 41-point gap that
      // would have let three quarters of that directory's functions go untested without
      // failing CI.
      //
      //                        floor was → is        measured @ 7ec97b1
      //   global               40/40/38/35 → 44/44/42/38     46.7 / 47.1 / 45.7 / 41.4
      //   keep-elements        80/80/72/62 → 83/83/82/67     86.7 / 86.1 / 86.1 / 70.9
      //   services             90/90/90/88 → 93/93/90/91     96.0 / 96.2 / 93.2 / 94.9
      //   store reducers       95/95/90/88 → 97/97/97/92      100 /  100 /  100 / 95.8
      //   utils                85/85/55/60 → 96/96/93/91     99.3 / 99.4 / 96.4 / 95.4
      //   access/action.ts     95/95/95/78 → 97/97/97/80      100 /  100 /  100 / 83.3
      //   consents/action.ts   95/95/95/65 → 97/97/97/67      100 /  100 /  100 / 70.0
      //   applications/action  87/87/87/65 → 88/88/88/66     91.6 / 91.6 / 91.7 / 69.6
      //   StoreController.ts   95/95/95/90 → 97/97/97/95      100 /  100 /  100 /  100
      //
      // Branch floors keep ~4 points of slack and the rest ~3: branch counts move under
      // ordinary refactoring (an added guard clause, a removed `default:` arm) in a way
      // line counts do not.
      thresholds: {
        lines: 44,
        statements: 44,
        functions: 42,
        branches: 38,
        'src/store/**/reducer.ts': { lines: 97, statements: 97, functions: 97, branches: 92 },
        // Thunk suites, per slice (#690). Gated individually rather than through one
        // `**/action.ts` glob: databases/action.ts is still at 15 %, so a shared floor
        // would have to sit there and would gate nothing for the slices that are done.
        'src/store/access/action.ts': { lines: 97, statements: 97, functions: 97, branches: 80 },
        'src/store/consents/action.ts': { lines: 97, statements: 97, functions: 97, branches: 67 },
        'src/store/applications/action.ts': { lines: 88, statements: 88, functions: 88, branches: 66 },
        // The React-removal primitives (#715). Measured at 100/100/100/100 — they are
        // small, and every element converted in #719 depends on them being right, so
        // they are gated close to the measurement rather than a few points below.
        'src/store/StoreController.ts': { lines: 97, statements: 97, functions: 97, branches: 95 },
        // store.ts is one `configureStore` call: 100 % lines, and *zero* functions and
        // zero branches to count. Those two floors are vacuous — left where they are
        // rather than raised to imply a measurement that does not exist.
        'src/store/store.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/utils/**': { lines: 96, statements: 96, functions: 93, branches: 91 },
        // The 27 converted Lit elements. Raised from 80/80/72/62 — itself raised from
        // 70/70/60/50 once the element suites and the Monaco tests landed.
        'src/components/keep-elements/**': { lines: 83, statements: 83, functions: 82, branches: 67 },
        // Pure, well-covered helpers (log, theme, icon library, WA token readers).
        // Nothing here should ever ship untested.
        'src/services/**': { lines: 93, statements: 93, functions: 90, branches: 91 },
      },
    },
  },
});
