# #747 — keep-elements: standard decorators + `accessor`

Branch: `chore/747-standard-decorators` off `new_code`.

## Gate result (done before any source change, per the issue)

SWC 1.15.46 standard-decorator output is **correct**, verified behaviourally in dev *and*
production, with a negative control proving the harness can fail.

| Check | Result |
|---|---|
| SWC emits real TC39 helper (`_apply_decs_2203_r`) | pass |
| Dev build, 10 runtime assertions (reactivity, converters, `@query`, changedProperties) | pass |
| Production build, 9 runtime assertions (Lit prod build, no dev guard) | pass |
| `tsc` with `experimentalDecorators: false`, `useDefineForClassFields: true` | pass |
| Negative control: plain fields under standard decorators | throws, as required |

### Three corrections to the issue

1. **`tsDecorators: false` is wrong.** In `@vitejs/plugin-react-swc` it is the *parser*
   flag (`index.js:202` → `parser.decorators`). Setting it false makes SWC reject `@`
   outright: `Expression expected`. It must stay `true`.
2. **The `useAtYourOwnRisk_mutateSwcOptions` hook cannot be removed.** SWC defaults to
   legacy decorators and *silently passes `accessor` members through untransformed*. The
   hook stays; its payload changes from `useDefineForClassFields: false` to
   `decoratorVersion: '2022-03'`. Acceptance criteria #3/#4 are amended accordingly.
3. **`@query` does need `accessor`.** Without it: `field decorators must return a
   function or void 0` — Lit returns a getter descriptor, legal only for an `accessor`
   decorator. The issue states the opposite.

### Why it is still worth doing

The config dependency moves rather than disappears — but it stops being silent. A missing
`accessor` throws `Unsupported decorator location: field` at module load in **dev and
production**. The issue's actual fear was a silent production regression; that is what
goes away.

### Corrected scope

81 fields across 23 files (not 89/25 — People/Groups removal shrank it):
72 `@property` + 6 `@state` + 3 `@query`. 23 `@customElement` need no change.
All 81 are single-line declarations. Decorators are confined to `keep-elements/`.

## Tasks

- [x] Add `accessor` to 72 `@property` fields
- [x] Add `accessor` to 6 `@state` fields
- [x] Add `accessor` to 3 `@query` fields
- [x] `tsconfig.app.json`: drop `experimentalDecorators` and `useDefineForClassFields`
- [x] `vite.config.mts`: hook payload → `decoratorVersion: '2022-03'`, rewrite comment
- [x] `vitest.config.ts`: same, rewrite comment
- [x] Full suite green + coverage thresholds met
- [x] `tsc` clean, lint clean
- [x] Production build + runtime smoke test (checkbox toggle, tree re-render)
- [x] Remove scratch dirs
- [x] PR against `new_code` with "closes #747" — [#790](https://github.com/HCL-TECH-SOFTWARE/domino-rest-adminclient/pull/790)

## Review

Final state: 69 test files / 763 tests pass, coverage thresholds met, `tsc` (app + test),
lint and `npm run build` all clean.

### Three things the issue did not anticipate

1. **`tsDecorators` is a parser flag, not a semantics flag.** The issue's plan to set it
   `false` would have broken the build immediately (`Expression expected`). The hook stays;
   only its payload changes. Acceptance criteria #3/#4 amended — agreed with you up front.
2. **`@query` needs `accessor`.** Without it Lit throws `field decorators must return a
   function or void 0`, because it returns a getter descriptor.
3. **wyw-in-js could not handle `accessor` at all.** `npm run build` failed with
   `Private field '#___private_isSchema_3' must be declared in an enclosing class` —
   wyw strips types with oxc-transform 0.131, which mis-desugars the keyword. The Lit
   elements contain no Linaria (their `css` is `lit`'s), so they are now excluded from
   wyw in both configs. Two `.ts` files outside the elements *do* declare Linaria
   `styled` components, so a blanket `**/*.tsx`-only include would have been wrong.

Only the build caught #3 — the whole suite was green at that point. Worth remembering that
`vitest` passing is not evidence the bundle builds.

### Two incidental fixes, both forced by the compiler

- Four fields were `foo?: T`; `accessor` cannot be optional (TS1276). Now `T | undefined`.
  No effect on React consumers — `@lit/react` types props as
  `Partial<Omit<I, keyof HTMLElement>>`, so they were never required.
- `keep-schema-status`'s `status` initializer read `schemasWithScopes` and `item` (TS2729).
  It ran during construction when both were still at their defaults, so it could only ever
  produce `'Not used by Scopes'`, and `updated()` overwrites it as soon as `item` arrives.
  Replaced with that literal plus a comment. No behaviour change.

### Verification that the migration is safe

Before touching source: SWC's standard-decorator output was checked behaviourally in a
dev build (10 assertions) and a production build (9 assertions), plus a negative control
proving the harness could fail. After the migration, the same smoke test was re-run
against **real** `keep-checkbox` and `keep-tree` built through the production pipeline —
9/9, including "toggle actually re-renders" and "assigning nodes re-renders".

`test/decorator-config.test.ts` now guards the invariant in CI: every decorated field has
`accessor`, both bundler configs agree on `decoratorVersion`, tsconfig stays off
experimental decorators, and the elements stay out of wyw. Confirmed it fails when an
`accessor` is removed.

### Net effect

The config dependency did not disappear, but it stopped being silent. A missing `accessor`
now throws `Unsupported decorator location: field` at module load in dev *and* production,
and CI fails before that. The silent-production-regression risk the issue was written
about is gone.
