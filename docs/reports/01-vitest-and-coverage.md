# 01 — Vitest Migration & Test-Coverage Strategy

> Companion to `reports/00-code-quality.md` — general code-quality issues are catalogued
> there and are **not** repeated here. This report is scoped to the test toolchain and
> coverage.

> **Refreshed 2026-07-27** against branch `new_code` @ `e17010c`. Previously refreshed
> 2026-07-27 against `7594672`; originally written 2026-07-24 as a Jest→Vitest migration
> plan.
>
> **Part A (the migration) is COMPLETE** — landed in `f7907a3` / PR #649, with the test
> tree relocated in `4d7ab3b` / PR #663. **Part B Phase 1 (pure logic) is COMPLETE**;
> Phase 3 (Lit elements) landed alongside the TypeScript conversion in PRs #652–#659 and
> was finished off by PR #668.
>
> ✅ **The suite is GREEN on this branch.** `npm run test` exits 0 with
> **63 files / 636 tests**, all thresholds met. Both regressions flagged in the previous
> refresh are fixed. See [§0 Current status](#0-current-status--suite-is-green).

## TL;DR

- **Jest is gone.** Vitest 4.1 runs on the same Vite plugin graph as the build
  (`@wyw-in-js` + `@vitejs/plugin-react-swc`), so Linaria `styled` components and the Lit
  decorators transform identically to `npm run build`.
- **4 tests → 636 tests across 63 files** (was 509 / 53 at the last refresh). Global line
  coverage went from ~0 % to **32.44 %**, with `src/utils` at **99.1 %**, `src/services`
  at **96.8 %**, `src/components/keep-elements` at **84.2 %**, and every
  `src/store/**/reducer.ts` above the **95 %** gate.
- **The coverage ratchet is real and enforced**, and it is now comfortably *green*:
  `vitest.config.ts` sets a global floor plus three per-directory gates, and every one
  passes with headroom. The floors are now stale-low and should be raised (§B3).
- **Monaco is tested twice, on purpose.** A fake-`monaco-editor` suite covers component
  behaviour; a second, deliberately tiny suite drives the **real** editor in jsdom to
  cover Monaco-internal invariants a fake cannot reach. The second one caught a
  dispose-ordering bug the 32-test fake suite passed straight through (§A10).
- Remaining work is **Phase 2 (React component tests)**, thunk/action coverage — now
  started, one file in (§B2) — and raising the ratchet. The toolchain questions this
  report opened are all settled.

---

## 0. Current status — suite is GREEN

`npm run test` on `new_code` @ `e17010c`:

```
 Test Files  63 passed (63)
      Tests  636 passed (636)
   Duration  11.47s
```

Exit code **0**. No threshold breach, no suite fails to load.

### 0.1 What changed since `7594672`

22 commits, five substantive PRs:

| PR | What landed | Effect on this report |
|---|---|---|
| #668 | `test(keep-elements)`: 32-test **fake-Monaco** suite for `keep-monaco-editor`, plus the `document.queryCommandSupported` polyfill in `test/setupTests.ts` | closes **C1** and **C2** — the two 🔴 items of the last refresh |
| #669 | Source tab → `keep-monaco-editor`, self-hosted Font Awesome icons, Diff view, `wa-dark` theme toggle | retires the last `@monaco-editor/react` usage (§B4); adds `services/icon-library.ts` + `services/theme-service.ts`, each with a test |
| #670 | `test(services)`: unit tests for `log-service`, `editor-theme`, `wa-color`, `wa-typography` | closes **C4** — `src/services` went 10.6 % → **96.8 %** lines |
| #671 | `ci`: publish the coverage summary to the GitHub Actions job summary | coverage is now readable per PR without downloading an artifact (§0.3) |
| #673 | P0 code-quality fixes (P0-4, 5, 6, 9, 10 + diff dispose ordering) | adds `test/store/account/action.test.ts` — the **first thunk test in the tree** (§B2) — and `keep-monaco-editor.lifecycle.test.ts` + `test/test-utils/monaco.ts` (§A10); makes prettier a lazy import, shrinking the entry chunk 6.94 MB → 6.32 MB |

Ten new test files, +2,006 lines under `test/`:

| Area | Files | Tests |
|---|---|---|
| `test/services/**` | 6 (`log-service`, `editor-theme`, `wa-color`, `wa-typography`, `icon-library`, `theme-service`) | 74 |
| `test/components/keep-elements/keep-monaco-editor.test.ts` | 1 (fake monaco) | 32 |
| `test/components/keep-elements/keep-monaco-editor.lifecycle.test.ts` | 1 (real monaco) | 3 |
| `test/store/account/action.test.ts` | 1 (first *action*/thunk suite) | 8 |
| `test/components/forms/compare-form-names.test.ts` | 1 | 5 |
| `test/test-utils/monaco.ts` | — (helper, 169 lines) | — |

### 0.2 The two regressions from `7594672` — both fixed ✅

Recorded because the *reason* they happened still matters.

**Regression 1 — jsdom lacks `document.queryCommandSupported`.**
`src/components/keep-elements/keep-monaco-editor.ts` does a **top-level**
`import * as monaco from 'monaco-editor'`, and `KeepElements.tsx` imports that module to
export the `KeepMonacoEditor` wrapper, so every test touching *any* component behind the
React bridge evaluated the whole Monaco ESM bundle inside jsdom — which calls
`document.queryCommandSupported` at module scope. Four suites failed at import with 0
tests run. **Fixed** by the setup stub (returning `false` is accurate for jsdom and simply
leaves the paste command unregistered).

> ⚠️ **Nit, live:** the polyfill is in `test/setupTests.ts` **twice** — once at lines
> 56–65 (from `6dd2384`, on the #669 branch) and again at lines 106–114 (from `2dd9c8c`,
> PR #668). Two branches solved the same problem in parallel and both merged. It is
> harmless (the second block's `if` never fires) but it is dead code with a misleading
> comment; delete one (C13).

**The durable fix is still open:** move the Monaco import inside `firstUpdated()`
(dynamic `import('monaco-editor')`), so the React bridge stays cheap and the editor is
code-split out of the 6.32 MB entry chunk (report 00 P2-3/P0-10; C3 below). PR #673 did
exactly this for prettier and it worked — prettier now splits into `babel` 316.53 kB /
`estree` 210.43 kB / `standalone` 81.05 kB, loaded on demand.

**Regression 2 — the `keep-elements` coverage gate.** `keep-monaco-editor.ts` (582 lines)
was the only element in the directory without a test, dragging the directory to 60.3 %
against a 70 % gate. **Fixed** by writing the test rather than by excluding the file —
option 1 of the two the previous refresh offered, and the right one.
`keep-monaco-editor.ts` now sits at **73.9 %** lines (147/199 executable) and the
directory at **84.2 %**.

### 0.3 CI, as it runs today

`.github/workflows/pr_check.yml`, Node 24:

```
npm ci → npm run lint → npm run build → npm run test → publish coverage summary
```

The last step is new (#671). It runs with `if: always()`, so a *failing* run still
reports its numbers, and pipes `coverage/coverage-summary.json` through `jq` into
`$GITHUB_STEP_SUMMARY` as a lines/statements/functions/branches table. That is the first
time coverage has been visible on a PR without downloading an artifact — and it is why
`json-summary` was added to the reporter list back during the migration (§A2).

---

## Current state snapshot (verified 2026-07-27)

| Area | 2026-07-24 | **Today** | Source of truth |
|---|---|---|---|
| Runner | Jest 30 | **Vitest 4.1.10** | `package.json` `test`, `vitest.config.ts` |
| Transform | `ts-jest` **and** `@swc/jest` (redundant) | **Vite plugin graph** — `@wyw-in-js/vite` + `@vitejs/plugin-react-swc` | `vitest.config.ts` |
| Decorators | n/a | `tsDecorators: true` + `useDefineForClassFields: false` (mirrors `vite.config.mts`) | `vitest.config.ts` |
| Environment | `jest-environment-jsdom` | **`jsdom` 29.1.1**, `url: http://localhost/admin/ui` | `vitest.config.ts:31` |
| ESM allow-list | `transformIgnorePatterns` | **not needed** — Vite transforms `node_modules` natively | — |
| Asset/style mocks | `__mocks__/fileMock.js`, `styleMock.js` | **deleted** — `css: false` + Vite asset URLs | `vitest.config.ts` |
| Setup file | `src/setupTests.ts` existed but was **never loaded** | **`test/setupTests.ts`, wired via `setupFiles`** | `vitest.config.ts` |
| Test location | 4 files scattered under `src/` | **top-level `test/` tree** mirroring `src/` | `4d7ab3b` |
| Test helpers | none | **`test/test-utils/lit.ts`** + **`test/test-utils/monaco.ts`** | §A10 |
| Sonar | `jest-sonar-reporter` | **`vitest-sonar-reporter` 3.0** → `coverage/sonar-report.xml` (CI only, **consumed by nobody**) | `vitest.config.ts` |
| Coverage | Istanbul via `--coverage` | **`@vitest/coverage-v8`** → `text`, `lcov`, `html`, `json-summary` | `vitest.config.ts` |
| Thresholds | none | **global floor + 3 per-directory gates**, all passing | `vitest.config.ts` |
| Test files / tests | 4 / 34 | **63 / 636** | `npm test` |
| Global line coverage | ~0 % | **32.44 %** | `coverage/coverage-summary.json` |
| CI | `build` + `test` | **`lint` → `build` → `test` → `publish coverage summary`** on Node 24 | `.github/workflows/pr_check.yml` |

### Scripts as shipped

```jsonc
"test":       "cross-env CI=true vitest run --coverage",
"test:watch": "vitest",
"test:ui":    "vitest --ui",
"coverage":   "vitest run --coverage"
```

`CI=true` drives the Sonar reporter branch in the config (and keeps `vitest run`
non-interactive).

---

# Part A — Migration ✅ COMPLETE

Recorded as-built, so the decisions stay discoverable. Nothing here is outstanding work.

## A1. Why Vitest was the right fit — confirmed in practice

Vitest consumes the same plugin graph as the build. This paid off immediately during the
`.js` → TypeScript Lit conversion (report 02): the decorator configuration
(`tsDecorators` + `useDefineForClassFields: false`) had to be identical in
`vite.config.mts` and `vitest.config.ts`, and because both files construct the plugin the
same way, "passes in tests, breaks in prod" never happened. Had Jest kept its own
`ts-jest`/`@swc/jest` pipeline, the class-field-shadowing bug
([lit.dev/msg/class-field-shadowing](https://lit.dev/msg/class-field-shadowing)) would
have behaved differently in each.

It kept paying off in #673: the real-Monaco lifecycle suite (§A10) imports
`monaco-editor` from `node_modules` with no transform allow-list and no bundler config of
its own, because Vite already resolves it exactly as the app does.

## A2. `vitest.config.ts` — as shipped

Standalone rather than a `test` block inside `vite.config.mts`, so the dev-server CSP
header and `/api` proxy stay out of the test context. Key deviations from the original
plan:

| Planned | Shipped | Why |
|---|---|---|
| `setupFiles: ['./src/setupTests.ts']` | `['./test/setupTests.ts']` | whole test tree moved out of `src/` (`4d7ab3b`) |
| `include: ['src/**/*.{test,spec}.{ts,tsx}']` | `['test/**/*.{test,spec}.{ts,tsx}']` | ditto |
| `reporter: ['text','lcov','html']` | `+ 'json-summary'` | machine-readable badge/ratchet input — now actually consumed by the CI job summary (§0.3) |
| `exclude: [... 'src/**/*.js']` | `+ 'src/components/keep-elements/keep-source.ts'`, `+ '**/types.ts'`, `+ 'src/index.tsx'` | `keep-source.ts` is a 760-line interactive tree/source editor, covered at API level by `keep-source.test.ts`; exhaustive jsdom coverage impractical. **Documented in-config.** |
| `thresholds: { lines: 5, … }` | global **20/20/17/16** + 3 per-directory gates | ratcheted up as phases landed (§B3) |
| — | `react({ tsDecorators, useAtYourOwnRisk_mutateSwcOptions })` | required by the Lit conversion (see A1) |

## A3. `test/setupTests.ts` — what it actually polyfills

Wiring the previously-dead setup file was the highest-leverage part of the migration.
It now centralises:

| Stub | Why it is needed | Note |
|---|---|---|
| `@testing-library/jest-dom/vitest` | matchers registered against Vitest's `expect` | replaces per-file imports |
| `TextEncoder` / `TextDecoder` | uuid/nanoid/react-router in some jsdom builds | was `jest.config` `globals` |
| `HTMLElement.prototype.attachInternals` | **installed unconditionally** — jsdom ships its own `ElementInternals` that lacks `setValidity`, which WebAwesome's form-associated elements call during Lit's update cycle | a discovery from the migration; the original plan's `if (!…)` guard would have been wrong |
| `HTMLDialogElement.showModal` / `.close` | jsdom has no `<dialog>` modal methods | was copy-pasted per test file |
| Popover API (`showPopover`/`hidePopover`/`togglePopover`) | used by `keep-alert` | added during the overlay batch |
| ✅ `document.queryCommandSupported` / `execCommand` | monaco-editor's clipboard contribution calls it at **module** scope | added in #668/#669 — **present twice**, see §0.2 |
| `localStorage` stub | `store/styles/reducer.ts` reads it at import time | jsdom does not always expose it before module evaluation |
| `window.matchMedia` | MUI reads it on mount | as planned |

Note the division of labour: `setupTests.ts` holds what *every* suite needs. Stubs that
only the Monaco suites need (`ResizeObserver`, `Worker`, canvas 2-D) live in
`test/test-utils/monaco.ts` and are installed by the one suite that drives real Monaco
(§A10) — keeping a heavy, behaviour-changing canvas mock out of the other 62 files.

## A4–A9. Migration mechanics — resolved

All three predicted sharp edges materialised and were handled:

- **Default-export component mocks** — every `jest.mock('./X', () => Fn)` became
  `vi.mock('./X', () => ({ default: Fn }))`. This was the silent breaker, exactly as
  flagged.
- **`as jest.Mock` casts** — replaced with `vi.mocked(…)`.
- **`jest.requireMock`** — replaced by relying on the hoisted top-level import.

Removed in the process: `jest`, `@types/jest`, `jest-environment-jsdom`, `@swc/jest`,
`ts-jest`, `jest-sonar-reporter`, `jest.config.ts`, `babel.config.js`, `__mocks__/*`, the
`jestSonar` block, and the `react-app/jest` lint preset. Type globals moved to
`src/vitest.d.ts` (`/// <reference types="vitest/globals" />`).

**Sonar wiring is unchanged in shape:** `sonar.testExecutionReportPaths` ←
`coverage/sonar-report.xml` (now from `vitest-sonar-reporter`),
`sonar.javascript.lcov.reportPaths` ← `coverage/lcov.info` (now from v8 instead of
Istanbul).

> ⚠️ **But nothing consumes either file.** Re-verified at `e17010c`: no
> `sonar-project.properties` exists, none of the three GitHub Actions workflows
> (`pr_check`, `publish`, `push-snapshot`) invokes a scanner, and `pom.xml` has no Sonar
> configuration. Every CI run therefore writes a `coverage/sonar-report.xml` that is read
> by no one. Either wire up an analysis step (see §B3) or drop `vitest-sonar-reporter` and
> the reporter branch in `vitest.config.ts` — carrying dead reporting config invites the
> assumption that quality gates are being enforced somewhere when they are not. The
> **enforcement that actually exists today is the `vitest.config.ts` threshold block**
> (plus, since #671, the coverage table on every PR).

## A10. Monaco under jsdom — two suites, deliberately

New at `e17010c`, and the most transferable lesson in this report.

**`test/test-utils/monaco.ts` (169 lines)** makes jsdom survive a *real*
`monaco.editor.create()`. It fills three gaps, none of which is what is under test:

| Gap | Why Monaco needs it | Failure mode without it |
|---|---|---|
| `ResizeObserver` | `firstUpdated()` constructs one directly | `ReferenceError` at mount |
| `Worker` | `MonacoEnvironment.getWorker` spawns one per language service the moment a `json`/`javascript` model is created | uncaught `ReferenceError` **on a timer**, after the test body returned |
| canvas 2-D context | `pixelRatio.js` reads `webkitBackingStorePixelRatio` during construction; the minimap calls `createImageData` on first async render | `null` dereference, again **after** the test finishes |

The stub returns plausible geometry (8 px glyphs) rather than zeroes, so Monaco's layout
maths produces finite values.

It also exports **`captureMonacoErrors()`**, which is the load-bearing piece:

> Monaco does not throw at the call site. Its `ErrorHandler` default sink rethrows inside
> a `setTimeout(…, 0)`, so a broken invariant surfaces as a **process-level uncaught
> exception** — not a `window` error event, not a rejected promise. An
> `expect(() => el.remove()).not.toThrow()` therefore passes *while Monaco is loudly
> reporting that its state is corrupt.*

`captureMonacoErrors()` swaps out Vitest's own `process.on('uncaughtException')`
listeners, records everything, and restores them in `afterAll`. That is not a loosening:
because *every* error is recorded, a test asserting the list is empty fails on any
uncaught error, expected or not. A sibling helper, `ignoreMonacoCancellations()`, filters
exactly one thing — Monaco's `CancellationError` from `Delayer.cancel()` on dispose,
which is by-design and unavoidable while the stubbed worker never answers — and delegates
every other unhandled rejection to the original listeners.

**Why two suites:**

| Suite | Monaco | Size | Covers |
|---|---|---|---|
| `keep-monaco-editor.test.ts` | **fake** (`vi.mock`) | 702 lines, 32 tests | the component's own behaviour: option forwarding, `value`/`language`/`theme` reactivity, the `_suppressChange` guard, emitted events, disposal calls |
| `keep-monaco-editor.lifecycle.test.ts` | **real** | 93 lines, 3 tests | only what lives *inside* Monaco: assertions the fake structurally cannot have |

The motivating case: `DiffEditorWidget` subscribes to its models' `onWillDispose` and
throws *"TextModel got disposed before DiffEditorWidget model got reset"* if a model is
disposed while the widget still holds it. A fake has no such subscription, so its dispose
assertions pass either way — **the bug shipped and survived the 32-test fake-based
suite.** It is fixed in `7f1c162` (dispose widgets before the models they hold), and the
lifecycle suite now guards it.

> **The lesson, stated plainly: a fake validates your assumptions, not the library's.**
> Where a component's whole job *is* the integration, a hand-written mock can only confirm
> that your calls match your own mental model of the dependency. Keep the fake — it is
> fast, deterministic and the right place for behaviour — but pair it with a small suite
> against the real thing, scoped to the invariants only the real thing enforces. Three
> tests were enough here. The lifecycle suite is deliberately kept small; duplicating the
> behavioural suite against real Monaco would only double the maintenance.

Cost: the real-Monaco suite runs in ~820 ms against ~170 ms for the fake — an acceptable
price for the only test in the tree that can catch this class of bug.

---

# Part B — Coverage

## B1. Where coverage actually stands

`npm run test` at `e17010c`, all 63 files running:

```
Statements   : 32.75 % ( 1607/4906 )
Branches     : 29.64 % (  692/2334 )
Functions    : 28.91 % (  360/1245 )
Lines        : 32.44 % ( 1528/4709 )
```

| Area | Lines | Status |
|---|---|---|
| `src/utils/**` | **99.1 %** (106/107; branches 90.6 %) | ✅ Phase 1 complete — `common`, `form`, `mapper`, `token-emitter`, `api-retry` |
| `src/store/**/reducer.ts` | **≥95 %** (gate passes) | ✅ Phase 1 complete — 17 reducers, table-driven |
| `src/services/**` | **96.8 %** (120/124; branches 95.2 %) | ✅ **NEW** — all six services tested (#669, #670) |
| `src/components/keep-elements/**` | **84.2 %** (502/596; branches 68.6 %) | ✅ gate is 70 % — was 60.3 % 🔴 at the last refresh |
| `src/styles` | 83.3 % | incidental |
| `src` (top level) | 61.5 % (32/52) | `App.test.tsx` |
| `src/components/forms` | 59.4 % (168/283) | `EditView.test.tsx` + `compare-form-names.test.ts` |
| `src/store/account` | 38.7 % (48/124) | reducer + the first thunk suite |
| `src/store/databases` | 22.0 % (240/1090) | 🟡 largest single gap — 2,883-line `action.ts` |
| `src/components/**` (other React views) | 0.8 – 15 % | 🟡 **Phase 2 — the remaining gap** |

Per-directory line coverage, largest directories first:

| Directory | Lines % | Lines |
|---|---|---|
| `src/store/databases` | 22.0 | 1090 |
| `src/components/keep-elements` | **84.2** | 596 |
| `src/components/access` | 5.2 | 504 |
| `src/components/database` | 3.8 | 319 |
| `src/components/forms` | 59.4 | 283 |
| `src/components/commons` | 9.9 | 171 |
| `src/components/login` | 13.6 | 140 |
| `src/services` | **96.8** | 124 |
| `src/components/people` | 0.8 | 124 |
| `src/store/account` | 38.7 | 124 |
| `src/store/applications` | 24.6 | 118 |
| `src/components/groups` | 0.9 | 116 |
| `src/utils` | **99.1** | 107 |
| `src/store/people` | 20.7 | 92 |
| `src/store/peopleSelector` | 15.6 | 90 |
| `src/store/groups` | 17.9 | 84 |
| `src/components/schemas` | 1.3 | 79 |
| `src/components/navigation` | 4.3 | 69 |

Ranked by payoff ÷ effort, the previous table is now consumed down to its last two rows.
What remains:

| Rank | Module(s) | Why | Test type | Effort |
|---|---|---|---|---|
| 1 | `src/store/databases/action.ts` (2,883) | by far the largest untested file in the tree; `store/databases` is 22 % and is 23 % of all executable lines | unit w/ `fetch` mocks | **M–L** |
| 2 | Remaining `src/store/*/action.ts` thunks (`people`, `peopleSelector`, `groups`, `applications`) | same shape as the `account/action.ts` suite that already exists — copy the pattern | unit w/ mocks | M |
| 3 | Presentational React components (`components/people`, `groups`, `schemas`, `navigation` — all <5 %) | RTL smoke renders; cheap per file | component | M |
| 4 | `src/components/access` (504 lines, 5.2 %) | `TabsAccess.tsx` alone is 1,010 lines and has one suite | component | M–L |
| 5 | `keep-monaco-editor.ts` residual 26 % | diff-mode paths and the prettier round-trip | extend existing suites | S |

## B2. Phased plan — status

**Phase 1 — Pure logic.** ✅ **DONE.** `src/utils/*` + all 17 `src/store/*/reducer.ts`,
plus `store/databases/scripts.ts`. Table-driven per reducer (unknown action → same state;
each `case` → expected transition), exactly as sketched.

**Phase 1b — Services.** ✅ **DONE** (#669, #670). Six suites, 74 tests, `src/services`
at 96.8 % lines. These were rows 1, 2 and 4 of the previous refresh's payoff table and
they landed as predicted — all pure or jsdom-friendly, all **S**.

**Phase 1c — Thunks/actions.** 🟡 **STARTED — one file.**
`test/store/account/action.test.ts` (8 tests) is the **first *action* test in the tree**;
every store suite before it tested reducers only. It is worth reading before writing the
next one: it enumerates every failure path of `renewToken` (4xx, 5xx, an HTML error page,
a dropped connection, malformed JSON) rather than asserting one happy path, stubs only the
parts of `Response` that `checkForResponse` touches, and silences the deliberate logging
via `Logger.setLevel(Level.OFF)` so the suite output stays clean. That is the template for
the 16 remaining `src/store/*/action.ts` files.

**Phase 2 — React component tests.** 🟡 **NOT STARTED.** The 4 pre-existing suites
(`App`, `TabsAccess`, `EditView`, `UnsavedChangesDialog`) still carry the whole React-view
coverage story; `compare-form-names.test.ts` (#673) tests an extracted comparator, not a
component. The shared `renderWithProviders()` helper proposed in the original B2 is
**still not extracted** — `createMockStore()` remains re-declared in
`EditView.test.tsx` and `TabsAccess.test.tsx`. That extraction is the natural first move
when Phase 2 starts, and it is cheap now that `test/test-utils/` is an established home
for helpers (`lit.ts`, `monaco.ts`).

**Phase 3 — Web-component (Lit/WebAwesome) tests.** ✅ **DONE, and it went further than
planned.** 28 suites in `test/components/keep-elements/` cover all 27 element modules
(26 `@customElement` registrations plus the `keep-element` base), with `keep-monaco-editor`
carrying two (§A10). Backed by `test/test-utils/lit.ts`:

```ts
// mountLit: create by tag, assign reactive props, append, await updateComplete
const el = await mountLit<KeepButton>('keep-button', { variant: 'brand' });
// cleanupLit(): document.body.innerHTML = '' in afterEach
```

The original guidance to *"assert on the light-DOM tag, not shadow content"* turned out to
be **too conservative**: with the `attachInternals` stub installed unconditionally (A3),
shadow-DOM assertions work fine in jsdom, and the element suites assert on shadow content
directly. That is how the directory reached 84.2 % lines.

## B3. The ratchet — as configured

```ts
thresholds: {
  lines: 20, statements: 20, functions: 17, branches: 16,   // global floor
  'src/store/**/reducer.ts': { lines: 95, statements: 95, functions: 90, branches: 88 },
  'src/utils/**':            { lines: 85, statements: 85, functions: 55, branches: 60 },
  'src/components/keep-elements/**': { lines: 70, statements: 70, functions: 60, branches: 50 },
}
```

**Unchanged since the last refresh — and now materially behind reality.** The global floor
is 20 % against a measured 32.44 %; the `keep-elements` gate is 70 % against a measured
84.2 %; `src/services` reached 96.8 % with **no gate at all**, so nothing stops it from
rotting. A floor 12 points below the baseline no longer catches regressions, which is the
one job it has.

**Recommended next move — raise the floors to just under today's measurements and add a
`services` gate:**

| Milestone | Global lines | `utils/**` | `store/**/reducer` | `keep-elements/**` | `services/**` |
|---|---|---|---|---|---|
| Configured today | 20 % 🟡 stale | 85 % | 95 % | 70 % 🟡 stale | — 🟡 missing |
| **Measured today** | **32.4 %** | **99.1 %** | ≥95 % | **84.2 %** | **96.8 %** |
| **Next PR (no new tests needed)** | **30 %** | 90 % | 95 % | **80 %** | **90 %** |
| After thunk coverage (B1 #1–#2) | 40 % | 90 % | 95 % | 85 % | 90 % |
| After Phase 2 | 50 % | 90 % | 95 % | 85 % | 90 % |
| Steady state | +2 %/PR toward ~65 % | 90 % | 95 % | 90 % | 90 % |

The "next PR" row costs nothing to adopt — it only writes down coverage that already
exists — and it is the row that stops the next `7594672` from happening.

A Sonar **Quality Gate on New Code** (e.g. "coverage on new code ≥ 80 %") would be the
ideal enforcement for incoming work — it holds every PR to a high bar while the legacy
baseline catches up, reading `coverage/lcov.info`. **This still does not exist** (§A4–A9):
no scanner runs in CI. Until one does, the per-directory thresholds are the only
enforcement, so keep ratcheting them — and prefer *adding* a directory gate when a new
area gets covered over nudging the global floor, since a directory gate is what catches a
single untested file (which is precisely how the `keep-monaco-editor` gap was caught).

> **Ratchet hygiene:** `7594672` remains the cautionary tale. A 582-line component landed
> with no test and the gate caught it — but only *after* merge, because the same commit
> also broke suite loading, which masks threshold output behind a hard failure. Fix red
> suites before trusting a green threshold report. Both halves are fixed at `e17010c`, and
> the #671 job summary now surfaces the numbers on every PR, so the failure mode is
> visible earlier next time.

## B4. Pitfalls specific to this stack — updated

| Pitfall | Status | Mitigation |
|---|---|---|
| **Monaco editor** | ✅ **handled, two ways** | `queryCommandSupported` polyfilled in setup; the behavioural suite mocks `monaco-editor` wholesale; the lifecycle suite runs the real thing on `test/test-utils/monaco.ts` stubs (§A10). The old `@monaco-editor/react` advice is **obsolete** — #669 moved the Source tab in `FormsContainer.tsx` onto `KeepMonacoEditor`, and `@monaco-editor/react` / `@monaco-editor/loader` now have **zero imports in `src`** (they remain in `dependencies`; report 05 tracks the removal). |
| **Real Monaco reports errors on a timer** | ✅ handled, non-obvious | `captureMonacoErrors()` hooks `process.on('uncaughtException')`, because Monaco's `ErrorHandler` rethrows inside `setTimeout` — `expect(…).not.toThrow()` cannot see it (§A10). |
| **Redux store helper** | 🟡 open | `createMockStore()` is still re-declared in `EditView.test.tsx` and `TabsAccess.test.tsx`. Extract `test/test-utils/renderWithProviders.tsx` alongside `lit.ts` and `monaco.ts`. |
| **react-router 7** | ✅ handled | `<MemoryRouter initialEntries={[…]}>` as before. |
| **MUI 9 / Linaria** | ✅ handled | `matchMedia` stub in setup; `css: false` means no computed styles — assert on roles/text/`data-testid`. `wyw` stays in the plugin list so `styled` components remain real components. |
| **WebAwesome / Lit custom elements** | ✅ handled, with a twist | jsdom's own `attachInternals` is *incompatible* with WA form-associated elements, so the stub is installed **unconditionally** rather than conditionally. Registration still happens automatically on import. Shadow-DOM assertions are fine. |
| **Popover / top layer** | ✅ handled | polyfilled in setup for `keep-alert`. |
| **`beforeunload` / native events** | ✅ handled | `EditView.test.tsx` pattern ported unchanged. |
| **jsdom `localStorage` timing** | ✅ handled | stubbed in setup because `store/styles/reducer.ts` reads it at import time. |
| **Vite server won't exit** | 🟡 cosmetic, **still present** | Every run still ends with `close timed out after 10000ms / something prevents Vite server from exiting`. Harmless (exit code is correct) but it adds ~10 s to a run whose tests take 11.5 s. Chase with the `hanging-process` reporter when convenient. |
| **Noisy stderr** | ➖ benign | Every Lit suite prints `Lit is in dev mode`, and Node prints an `ExperimentalWarning` about `localStorage` per worker. Neither affects results; both make a failing run harder to read. |

---

## Master checklist

| # | Task | Status | Effort |
|---|---|---|---|
| A1–A11 | Jest → Vitest migration (deps, config, setup, port 4 tests, flip script, purge Jest) | ✅ **DONE** (`f7907a3`, PR #649) | — |
| A12 | Move tests to a top-level `test/` tree | ✅ **DONE** (`4d7ab3b`, PR #663) | — |
| B1 | Phase 1 — `utils/*` + all 17 `store/*/reducer.ts` | ✅ **DONE** | — |
| B2 | Phase 3 — element suites + `test/test-utils/lit.ts` | ✅ **DONE** (PRs #652–#659, completed by #668) | — |
| B3 | Coverage thresholds + per-directory gates | ✅ **DONE** | — |
| C1 | Polyfill `document.queryCommandSupported` in `test/setupTests.ts` | ✅ **DONE** (PR #668) | — |
| C2 | Test `keep-monaco-editor.ts` — restores the `keep-elements` gate | ✅ **DONE** (PR #668; 32 tests, directory now 84.2 %) | — |
| C4 | Test `src/services/**` | ✅ **DONE** (PRs #669, #670; 6 suites, 96.8 %) | — |
| C11 | Publish the coverage summary to the CI job summary | ✅ **DONE** (PR #671) | — |
| **C3** | **Make the Monaco import dynamic** so the React bridge stays cheap (also cuts the 6.32 MB entry chunk) — prettier already did this in #673 | 🟡 TODO | S–M |
| **C7** | **Raise the ratchet to the §B3 "next PR" row** — costs nothing, only records existing coverage | 🟡 TODO | **S** |
| C5 | Extract `test/test-utils/renderWithProviders.tsx`; stop re-declaring `createMockStore()` | 🟡 TODO | S |
| C6 | Phase 2 — React component smoke tests, starting with the presentational leaves | 🟡 TODO | M |
| C12 | Phase 1c — thunk tests for the remaining `store/*/action.ts`, following `store/account/action.test.ts`; `store/databases/action.ts` first | 🟡 TODO | M–L |
| C8 | Split `tsconfig` so `npm run build` stops type-checking `test/` (`tsconfig.json` still has `"include": ["src", "test", …]`; report 00 P1-9) | 🟡 TODO | S |
| C9 | Resolve the dead Sonar reporting (§A4–A9): wire a scanner into CI, or drop `vitest-sonar-reporter` | 🟡 TODO | S |
| C13 | Delete the duplicated `queryCommandSupported` block in `test/setupTests.ts` (§0.2) | 🟢 nice-to-have | **XS** |
| C10 | Investigate the 10 s "Vite server won't exit" tail on every run | 🟢 nice-to-have | S |

_For unrelated code-quality findings, see `reports/00-code-quality.md`._
