/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { Plugin } from 'vite';
import { transform } from '@swc/core';

/**
 * The standard (TC39) decorator transform, as one plugin shared by both bundler configs
 * (#996).
 *
 * ## Why this exists at all
 *
 * The Lit elements use standard decorators with the `accessor` keyword (#747), and **SWC is
 * the only implementation of that transform in this tree.** Measured on the installed
 * toolchain rather than assumed:
 *
 *   - No transform at all: `npm run build` exits 0 and the bundle carries 386 untransformed
 *     `accessor <name>=` fields with `@decorator` syntax intact. Chrome throws `Invalid or
 *     unexpected token`, `keep-app` never upgrades, the page is blank.
 *   - Vite 8 is Rolldown + Oxc and does expose `oxc.decorator`, but its two switches
 *     (`legacy`, `emitDecoratorMetadata`) are both for the *pre-TC39* TypeScript flavour that
 *     #747 moved off. With `oxc: { decorator: { legacy: false } }` set explicitly the count is
 *     still 386 — Oxc has no standard-decorator transform and passes them straight through.
 *     Upstream (oxc-project/oxc#9170) is open, deferred and unassigned.
 *
 * So this replaces `@vitejs/plugin-react-swc`, which was doing exactly this and nothing else
 * we used: it is a React plugin in a repo with zero `.tsx` files. Its React halves — the
 * refresh runtime, the virtual preamble, `reactCompRE`, `runtime: 'automatic'`, the
 * `.tsx`/`.jsx`/`.mdx` parser branches — were all dead weight.
 *
 * ## The trap that plugin hid
 *
 * It registered its **build-time** transform only when `plugins` or
 * `useAtYourOwnRisk_mutateSwcOptions` was passed. The whole reason SWC ran during
 * `vite build` here was that the config set that hook — which reads like a decorator tweak.
 * Deleting it would not have fallen back to legacy decorators; the build-time transform would
 * have vanished entirely, silently, into the blank page above. Stating it because it is the
 * kind of thing that gets "tidied".
 *
 * ## Every option below is load-bearing
 *
 * | Option | Why |
 * |---|---|
 * | `enforce: 'pre'` | must run before Vite's own oxc TypeScript transform |
 * | `parser.decorators: true` | SWC's *parser* flag — this was `tsDecorators`, a misleading name. False makes SWC reject `@` outright. It is not a choice of semantics. |
 * | `transform.decoratorVersion` | the semantics. SWC defaults to legacy `'2021-12'`, under which `accessor` members are emitted **untransformed** rather than erroring. |
 * | `transform.useDefineForClassFields` | class-field semantics, which is the whole of #747 |
 * | `swcrc` / `configFile: false` | do not read stray SWC config from anywhere up the tree |
 *
 * SWC does not read `tsconfig.json` (esbuild does), so this file — not `tsconfig.app.json` —
 * is what governs both the build and the test suite.
 *
 * ## `jsc.target` is deliberately one value, not two
 *
 * `@vitejs/plugin-react-swc` registered two plugin instances with different targets:
 * `'esnext'` for build and `devTarget` (defaulting to `'es2020'`) for dev. That asymmetry was
 * inherited, not chosen, and dev/build drift is precisely what `test/decorator-config.test.ts`
 * exists to catch. `'esnext'` for both: it is the value the shipped bundle already used, and
 * downlevelling is Vite's job through `build.target`, not this transform's.
 *
 * Relatedly, this plugin does **not** disable Vite's oxc pass. The old plugin set
 * `oxc: false` on its dev instance only, so dev ran SWC alone while build ran SWC *then* oxc.
 * Leaving oxc on in both makes dev match build; oxc receives plain JavaScript here because
 * SWC has already stripped the types.
 */
export function standardDecorators(): Plugin {
  return {
    name: 'keep-standard-decorators',
    enforce: 'pre',
    async transform(code, id) {
      // Vite ids carry suffixes (`?v=`, `?worker`, `?url`); the extension is what decides.
      const file = id.split('?')[0];

      // `.ts`/`.mts` only. There are no `.tsx` files (`test/react-removed.test.ts` keeps it
      // that way), and dependencies ship compiled `.js` that must not be re-parsed as
      // TypeScript. Narrow on purpose: a file this declines is still type-stripped by Vite's
      // oxc pass, so the failure mode of an over-narrow filter is a loud parse error on
      // `accessor`, not a silently half-transformed bundle.
      if (!/\.m?ts$/.test(file) || file.includes('/node_modules/')) return null;

      const output = await transform(code, {
        filename: file,
        swcrc: false,
        configFile: false,
        sourceMaps: true,
        jsc: {
          target: 'esnext',
          parser: { syntax: 'typescript', tsx: false, decorators: true },
          transform: { useDefineForClassFields: true, decoratorVersion: '2022-03' }
        }
      });

      return { code: output.code, map: output.map };
    }
  };
}
