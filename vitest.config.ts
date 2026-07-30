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
      // Re-measured on `new_code` @ fc470a8, 120 files / 1,507 tests. Previous pass was
      // #820 at 7ec97b1 (87 files / 996), and the one before that #690 at 53/509.
      //
      // Two different problems this time, and the second matters more.
      //
      // **Drift.** The global floor sat 20 points under reality — #801–#805's thunk
      // suites, #806's element conversions and #807 all landed behind it.
      //
      //                        floor was → is        measured @ fc470a8
      //   global               44/44/42/38 → 61/61/63/49    64.4 / 64.7 / 66.9 / 53.1
      //   keep-elements        83/83/82/67 → 85/85/84/68    88.8 / 88.0 / 87.8 / 72.8
      //   utils                96/96/93/91 → 96/96/93/93    99.3 / 99.4 / 96.6 / 97.4
      //   access/action.ts     97/97/97/80 → 97/97/97/84     100 /  100 /  100 / 87.5
      //   applications/action  88/88/88/66 → 90/90/92/68    93.5 / 93.5 / 95.2 / 71.9
      //   (reducers, services, consents, StoreController, store.ts unchanged — already
      //    sit the right distance under their measurements)
      //
      // **Gaps.** Three well-tested areas had *no gate at all*, which drift cannot show:
      // a directory nobody listed is not a low floor, it is no floor. All three arrived
      // after #820 wrote this block, which is exactly how it happens.
      //
      //   src/store/databases/**    13 files, 84.4 % lines — #711's split modules and the
      //                             ~500 thunk tests from #801–#805
      //   src/router/**              2 files, 97.8 % — the in-repo router (#716, #813)
      //   src/store/FormController   1 file, 100 % — and its sibling StoreController was
      //                             gated, for a reason that applies equally to it
      //
      // Branch floors keep ~4 points of slack and the rest ~3: branch counts move under
      // ordinary refactoring (an added guard clause, a removed `default:` arm) in a way
      // line counts do not.
      thresholds: {
        lines: 61,
        statements: 61,
        functions: 63,
        branches: 49,
        'src/store/**/reducer.ts': { lines: 97, statements: 97, functions: 97, branches: 92 },
        // Thunk suites, per slice (#690). Gated individually rather than through one
        // `**/action.ts` glob, because they are covered to very different depths.
        'src/store/access/action.ts': { lines: 97, statements: 97, functions: 97, branches: 84 },
        'src/store/consents/action.ts': { lines: 97, statements: 97, functions: 97, branches: 67 },
        'src/store/applications/action.ts': { lines: 90, statements: 90, functions: 92, branches: 68 },
        // #711 split the 2,926-line databases/action.ts into one module per concern, and
        // #801–#805 covered them. That is the single largest body of store logic in the
        // tree and it was ungated until now — the old comment here even said the file
        // was "still at 15 %", which stopped being true several PRs ago.
        'src/store/databases/**': { lines: 81, statements: 81, functions: 86, branches: 64 },
        // The React-removal primitives (#715, #807). Small, and every element converted
        // in #719 depends on them being right, so they are gated close to the measurement
        // rather than a few points below. FormController is the newer half and had no
        // floor at all; the argument for gating it is the same one written for its
        // sibling, and 15 tier-D files are about to depend on it.
        //
        // FormController's floors were 97/97/88/88 against a measurement of 100/100/100/92.85,
        // because 14 branches make each one worth 7 points and there was no room to sit closer.
        // #887 and #890 took it to 100/100/100/100 over 18 branches, so it now gets its
        // sibling's numbers exactly — which is what the paragraph above always intended.
        'src/store/StoreController.ts': { lines: 97, statements: 97, functions: 97, branches: 95 },
        'src/store/FormController.ts': { lines: 97, statements: 97, functions: 97, branches: 95 },
        // The React host for FormController (#717), measured at 100/100/100/100. Gated at the
        // measurement rather than a few points under, because it is a bridge that 15 tier-D
        // conversions call, and the two things it exists to get right — one controller instance
        // across renders, and fresh `onSubmit`/`schema` closures on every submit — both fail
        // *silently*. A stale closure is a save that writes the wrong thing, only sometimes.
        //
        // **Delete this entry with the file.** `FormController.react.ts` goes when the last
        // `.tsx` consumer becomes a Lit element; a floor on a path that no longer exists
        // protects nothing while looking like it does.
        'src/store/FormController.react.ts': { lines: 100, statements: 100, functions: 100, branches: 100 },
        // store.ts is one `configureStore` call: 100 % lines, and *zero* functions and
        // zero branches to count. Those two floors are vacuous — left where they are
        // rather than raised to imply a measurement that does not exist.
        'src/store/store.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        // The router that replaced react-router-dom (#716), plus the code-splitting and
        // prefetch contracts added in #813. `react.tsx` is deleted when the views become
        // Lit elements; `router.ts` is not, and is what the Lit controller will bind to.
        'src/router/**': { lines: 94, statements: 94, functions: 90, branches: 91 },
        'src/utils/**': { lines: 96, statements: 96, functions: 93, branches: 93 },
        // The converted Lit elements — 93 files now, including the per-element React
        // wrappers #813 split out of the KeepElements barrel.
        'src/components/keep-elements/**': { lines: 85, statements: 85, functions: 84, branches: 68 },
        // Pure, well-covered helpers (log, theme, icon library, WA token readers).
        // Nothing here should ever ship untested.
        'src/services/**': { lines: 93, statements: 93, functions: 90, branches: 91 },
      },
    },
  },
});
