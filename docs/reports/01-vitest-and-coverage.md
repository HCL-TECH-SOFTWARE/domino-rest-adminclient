# 01 — Vitest Migration & Test-Coverage Strategy

> Companion to `reports/00-code-quality.md` — general code-quality issues are catalogued
> there and are **not** repeated here. This report is scoped to the test toolchain and
> coverage.

> **Refreshed 2026-07-30** against branch `new_code` @ `0d5458c`. Previous refreshes:
> `fcab645` (2026-07-28), `e17010c` and `7594672` (both 2026-07-27); originally written
> 2026-07-24 as a Jest→Vitest migration plan.
>
> **Part A (the migration) is COMPLETE** — landed in `f7907a3` / PR #649, with the test
> tree relocated in `4d7ab3b` / PR #663. **Part B is now substantially complete too**:
> Phase 1 (pure logic), Phase 2 (React components — 23 suites, up from 6) and Phase 3
> (Lit elements) have all landed, and the thunk coverage that #690 opened was finished by
> #801–#805.
>
> ✅ **The suite is GREEN on this branch.** `npm run test` exits 0 with
> **133 files / 1709 tests**, all thresholds met. See
> [§0 Current status](#0-current-status--suite-is-green).


## TL;DR

- **Jest is gone.** Vitest 4.1 runs on the same Vite plugin graph as the build
  (`@vitejs/plugin-react-swc`), so the Lit decorators transform identically to
  `npm run build`. The graph was `@wyw-in-js` + SWC until #825 removed the first half; the
  property that matters — *the same* graph in both configs — is unchanged, and
  `test/decorator-config.test.ts` is what enforces it.
- **4 tests → 1709 tests across 133 files** (was 747 / 70 at the last refresh — the suite
  more than doubled in one refresh). Global line coverage went from ~0 % to **70.18 %**,
  with `src/utils` at **99.3 %**, `src/router` at **97.8 %**, `src/services` at **96.1 %**,
  `src/components/keep-elements` at **89.7 %**, `src/store/databases` at **84.4 %**, and
  every `src/store/**/reducer.ts` at **100 %**.
- **The ratchet grew from 4 per-directory gates to 14**, and the global floor was raised
  30 % → **61 %**. #880 was the important one: it found that three well-covered areas had
  **no gate at all** — a directory nobody lists is not a low floor, it is *no* floor, and
  drift reporting cannot show you a gap (§B3).
- **Monaco is tested twice, on purpose.** A fake-`monaco-editor` suite covers component
  behaviour; a second, deliberately tiny suite drives the **real** editor in jsdom to
  cover Monaco-internal invariants a fake cannot reach. The second one caught a
  dispose-ordering bug the fake suite passed straight through (§A10).
- **Source-scanning tests are now an established genre, and load-bearing.**
  `shell-dead-code.test.ts`, `theme-selectors.test.ts`, `keep-theme.test.ts`,
  `csp-inline-styles.test.ts`, `csp-policy.test.ts`, `copyright-headers.test.ts`,
  `bundle-budget.test.ts`, `decorator-config.test.ts`, `node-modules-root.test.ts`,
  `people-groups-removed.test.ts` and `keep-element-wrappers.test.ts` parse source, CSS and
  build output as *text* rather than executing it — because `vitest.config.ts` runs with
  `css: false` and cannot see styling at all. They are the only automated guard several
  whole subsystems have (§B4).
- **What this suite still cannot do is see CSS.** `css: false` is the single largest gap in
  the strategy, and it is the reason two painted-colour defects shipped and were found by
  reading compiled values rather than by a test. Every layout or colour change needs a
  browser pass.
- Remaining work is raising floors as coverage grows, and the `src/components/**` long tail
  at **29.6 %** — which #806 is converting out from under this report rather than testing
  in place.

---

## 0. Current status — suite is GREEN

`npm run test` on `new_code` @ `0d5458c`:

```
 Test Files  133 passed (133)
      Tests  1709 passed (1709)
   Duration  16.43s
```

Exit code **0**. No threshold breach, no suite fails to load. 110 `.ts` suites + 23 `.tsx`.

### 0.1 What changed since `fcab645`

**319 commits, 99 merged PRs (#753–#922).** **75 new test files, 10 deleted**,
+16,175/−1,144 lines under `test/` — the largest single-refresh growth in the suite's
history, and `vitest.config.ts` itself grew by 106 lines, almost all of it new gates and the
reasoning behind them.

| PR | What landed | Effect on this report |
|---|---|---|
| #801–#805 | Thunk suites for the 13 modules #711 split `databases/action.ts` into | closes **#690**. `store/databases/**` went **5.8 % → 84.4 %** — the single largest coverage gain in the program |
| #880 | Re-measured every floor **and found three areas with no gate at all** | the important ratchet PR: `store/databases/**`, `src/router/**` and `FormController` were well covered and **ungated**. Drift reporting cannot show you a gap (§B3) |
| #820 | Earlier ratchet raise at `7ec97b1` (87 files / 996 tests) | intermediate step; superseded by #880 |
| #716 | In-repo router replaces `react-router-dom` | `router/router.test.ts` (458) + `router/react.test.tsx` (598) — a new **97.8 %**-covered subsystem, initially ungated |
| #813 | Route-level code splitting + prefetch contracts | extended the router suites; `bundle-budget.test.ts` became a real gate |
| #807/#885/#888 | `FormController` + characterization against the five real Formik shapes | `FormController.test.ts` (412), `.form-shapes.test.ts` (421), `.react.test.tsx` (326). **The characterization found two real defects** — #887 double-submit re-entry and #890 a crashing validator read as "valid" |
| #798 | `StoreController` | the other React-removal primitive; gated close to measurement |
| #806's PRs (#835, #863, #865, #870, #876 …) | React leaves → Lit elements | ~25 new element suites; `keep-elements/**` 84.5 % → **89.7 %** across 54 files |
| #884 | The unsaved-changes guard, which had **no tests** | `NavigationGuardContext.test.tsx` (475) at **100 %/100 %/100 %/100 %**, plus a new `components/navigation/**` gate |
| #892–#900 | The Quick Config bug cluster, fixed and converted together | `keep-quick-config-form.test.ts` (536) — seven bugs, each with a regression test |
| #710 | `createSlice` migration | reducer suites rewritten; still **100 %** lines |
| #718/#913 | Icons → `wa-icon` | `KeepIcon.test.tsx`; `icon-library.test.ts` extended to scan React wrappers, which it was previously blind to |
| #770 | People/Groups screens deleted with `@mui/x-data-grid` | `people-groups-removed.test.ts` — a guard against reintroduction |
| CI | `typecheck` and `bundle:budget` added as gating steps | §0.3 — CI is now six gates, not four |

**The pattern worth naming:** four of this refresh's PRs (#884, #880, #885, #892–#900)
found real defects *while writing tests for code that already worked*. Two of them
(#887, #890) were in `FormController`, which had 100 % coverage at the time and still
harboured a double-submit and a crashing-validator-reads-as-valid bug. High coverage bought
less than characterizing the real shapes did.

### 0.2 Every regression and nit this report has carried is now closed ✅

Recorded because the *reasons* still matter.

**Regression 1 — jsdom lacks `document.queryCommandSupported`.** Fixed at
`e17010c` by a stub in `test/setupTests.ts`; the **duplicated** copy of that stub (C13,
two branches solving it in parallel) was deleted in #678. One block remains, at
`test/setupTests.ts:94`.

**The durable fix has now landed too.** C3 asked for the Monaco import to move inside
`firstUpdated()` so the React bridge stays cheap and the editor code-splits out of the
entry chunk. #693/#729 did exactly that — `keep-monaco-editor.ts` now `import()`s
`monaco-editor`, its three workers and the editor CSS lazily, and the entry chunk fell
from 6,322.51 kB to **2,111.11 kB**. The setup stub stays anyway: it is cheap, and it
still covers the real-Monaco lifecycle suite, which *does* evaluate the bundle.

**Regression 2 — the `keep-elements` coverage gate.** Fixed at `e17010c` by writing the
missing test rather than excluding the file. The directory now sits at **89.1 %** across 54
files (**89.7 %** for the gated `keep-elements/**` glob, which includes the `react/` subdir),
and its gate has been raised twice more since — 70 → 80 (#686) → **85** (#880) — so
the headroom cannot silently be spent.

### 0.4 The "Vite server won't exit" tail — halved, not fixed

C10 recorded a ~10 s tail on every run. #692/#738 capped `teardownTimeout`, which removed
roughly 9 s from the *coverage* path. The message itself still prints —

```
Tests closed successfully but something prevents Vite server from exiting
```

— so the underlying open handle is still there; what changed is that it no longer costs
the full timeout. The issue stays open as **#692**. Practical impact today is a message,
not a delay: the run above completed in **16.43 s** wall-clock for 133 files / 1709 tests —
so the suite roughly doubled in size for ~6 s of extra wall-clock, which is the ratio you
want.

### 0.3 CI, as it runs today

`.github/workflows/pr_check.yml`, Node 24:

```
npm ci → npm run lint → npm run typecheck → npm run build → npm run bundle:budget
       → npm run test → publish coverage summary → Sonar scan → quality gate
```

**Two gates were added since the last refresh**, and both matter to this report:

- **`npm run typecheck`** (`tsc -b`) runs *before* `build`. `build` is
  `tsc -b tsconfig.app.json` — the app project only — so a type error under `test/` passes
  the build and only `typecheck` catches it. Adding it closed a real hole: the test tree was
  type-checked by nothing in CI between #687 and this change.
- **`npm run bundle:budget`** gates the eager closure at 901.2 kB raw / 245.9 kB gzip.
  ⚠️ **raw headroom was widened 2 % → 3 % for the duration of #806** (a tight raw budget fails on migration churn, not on regressions); gzip stays at 2 %.

⚠️ **Both new gates precede `test`.** That ordering is deliberate — a type error should not
wait behind a 16 s suite — but it means a failure in any of the first three makes CI report
red **without ever running the suite**. `5f0b913` demonstrated it for exactly two commits: one
unused import, three failing gates, and no test results at all. Green again as of `0d5458c`.

The last step is new (#671). It runs with `if: always()`, so a *failing* run still
reports its numbers, and pipes `coverage/coverage-summary.json` through `jq` into
`$GITHUB_STEP_SUMMARY` as a lines/statements/functions/branches table. That is the first
time coverage has been visible on a PR without downloading an artifact — and it is why
`json-summary` was added to the reporter list back during the migration (§A2).

---

## Current state snapshot (verified 2026-07-30)

| Area | 2026-07-24 | **Today** | Source of truth |
|---|---|---|---|
| Test files / tests | 4 / 34 | **133 / 1709** (110 `.ts`, 23 `.tsx`) | `npm test` |
| Global line coverage | ~0 % | **70.18 %** (3352/4776) | `coverage/coverage-summary.json` |
| Per-path coverage gates | none | **14**, plus a global floor of 61/61/63/49 | `vitest.config.ts` |
| Runner | Jest 30 | **Vitest 4.1.10** | `package.json` `test`, `vitest.config.ts` |
| Transform | `ts-jest` **and** `@swc/jest` (redundant) | **Vite plugin graph** — `@vitejs/plugin-react-swc` (was `@wyw-in-js/vite` + it, until #825) | `vitest.config.ts` |
| Decorators | n/a | `tsDecorators: true` + `useDefineForClassFields: false` (mirrors `vite.config.mts`) | `vitest.config.ts` |
| Environment | `jest-environment-jsdom` | **`jsdom` 30.0.1**, `url: http://localhost/admin/ui` | `vitest.config.ts:31` |
| ESM allow-list | `transformIgnorePatterns` | **not needed** — Vite transforms `node_modules` natively | — |
| Asset/style mocks | `__mocks__/fileMock.js`, `styleMock.js` | **deleted** — `css: false` + Vite asset URLs | `vitest.config.ts` |
| Setup file | `src/setupTests.ts` existed but was **never loaded** | **`test/setupTests.ts`, wired via `setupFiles`** | `vitest.config.ts` |
| Test location | 4 files scattered under `src/` | **top-level `test/` tree** mirroring `src/` | `4d7ab3b` |
| Test helpers | none | **`test/test-utils/lit.ts`**, **`monaco.ts`**, **`renderWithProviders.tsx`** (#689) | §A10 |
| Sonar | `jest-sonar-reporter` | **`vitest-sonar-reporter` 3.0** → `coverage/sonar-report.xml` (CI only), **now consumed by a real scanner** (§C9) | `vitest.config.ts`, `sonar-project.properties` |
| Coverage | Istanbul via `--coverage` | **`@vitest/coverage-v8`** → `text`, `lcov`, `html`, `json-summary` | `vitest.config.ts` |
| Thresholds | none | **global floor + 14 per-path gates**, all passing | `vitest.config.ts` |
| CI | `build` + `test` | **`lint` → `typecheck` → `build` → `bundle:budget` → `test` → `coverage summary` → `Sonar scan` → `quality gate`** on Node 24 | `.github/workflows/pr_check.yml` |

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

> ✅ **A scanner now consumes both files** (#688). `sonar-project.properties` points
> SonarQube Cloud at `coverage/lcov.info` and `coverage/sonar-report.xml`, and two
> workflows run it: `pr_check.yml` (pull-request analysis, alongside the existing
> lint/build/test job) and `sonar.yml` (branch analysis on pushes to `main` and
> `new_code`, so new-code metrics have a baseline to diff against). `publish.yml` and
> `push-snapshot.yml` are untouched.
>
> Two deliberate limits, both one-line changes when the time comes:
>
> - **The analysis skips instead of failing when `SONAR_TOKEN` is absent** — which is
>   the case for fork PRs, and for every run until an admin provisions the secret. The
>   job summary says so explicitly rather than going quietly green.
> - **The quality gate is report-only** (`continue-on-error: true`): its status lands
>   in the job summary but does not fail the run while the gate is still being tuned
>   server-side. So the **enforcement that actually blocks a merge today is still the
>   `vitest.config.ts` threshold block** (plus, since #671, the coverage table on
>   every PR). Dropping `continue-on-error` makes the gate binding.

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

`npm run test` at `0d5458c`, all 133 files running:

```
Statements   : 70.49 % ( 3627/5145 )
Branches     : 58.44 % ( 1346/2303 )
Functions    : 72.94 % ( 1081/1482 )
Lines        : 70.18 % ( 3352/4776 )
```

| Area | Lines | Status |
|---|---|---|
| `src/store/**/reducer.ts` | **100 %** | ✅ 10 reducers, all on `createSlice` (#710), table-driven, gate 97 % |
| `src/store/{access,consents}`, controllers, `hooks`, `store` | **100 %** | ✅ `StoreController`, `FormController`, `FormController.react` all at 100 % |
| `src/components/navigation/**` | **100 %** (70/70) | ✅ was **4.3 %** — #884 gave the unsaved-changes guard its first tests, and found a real bug doing it |
| `src/utils/**` | **99.3 %** (151/152) | ✅ Phase 1 complete |
| `src/router/**` | **97.8 %** (179/183) | ✅ the in-repo router (#716, #813) — a subsystem that did not exist last refresh |
| `src/services/**` | **96.1 %** (147/153) | ✅ gate 93 % |
| `src/store/applications` | **94.5 %** (103/109) | ✅ was 24.6 % |
| `src/components/keep-elements/**` | **89.7 %** (1079/1203) | ✅ gate raised 80 → **85** (#880); largest area in the tree now. The directory alone is 89.1 % (1042/1169); the glob adds the 34-line `react/` wrapper subdir at 100 % |
| `src/store/databases` | **84.4 %** (878/1040) | ✅ **was 22.0 %** — #711's split + #801–#805's thunk suites. The largest single coverage gain in the program |
| `src/store/account` | **78.3 %** (90/115) | ✅ |
| `src/components/forms` | 63.8 % (173/271) | partially converted by #806 |
| `src/components/database` | 35.3 % (72/204) | 🟡 the Quick Config pair converted (#892–#900); the rest is tier B/D |
| `src` (shell) | 35.7 % (30/84) | 🟡 `AppShell.tsx` 10.3 %, `Views.tsx` 0 % — P4 of #806, and the one gap not queued for imminent deletion |
| `src/components/{access,login,applications}` | 11–25 % | 🟡 queued for conversion by #806 — **testing in place is wasted work** |
| `src/components/{schemas,scopes}` | **0 %** (140 lines) | 🟡 same; their card views already converted, these are the list shells |

Per-directory line coverage, largest directories first:

| Directory | Lines % | Lines |
|---|---|---|
| `src/components/keep-elements` | **89.1** | 1169 |
| `src/store/databases` | **84.4** | 1040 |
| `src/components/access` | 11.1 | 521 |
| `src/components/forms` | 63.8 | 271 |
| `src/components/database` | 35.3 | 204 |
| `src/router` | **97.8** | 183 |
| `src/services` | **96.1** | 153 |
| `src/utils` | **99.3** | 152 |
| `src/components/login` | 15.9 | 138 |
| `src/store` (controllers, hooks, store) | **100.0** | 138 |
| `src/store/account` | **78.3** | 115 |
| `src/store/applications` | **94.5** | 109 |
| `src` (shell: `App`, `AppShell`, `Views`) | 35.7 | 84 |
| `src/components/schemas` | 0.0 | 82 |
| `src/components/navigation` | **100.0** | 70 |
| `src/components/scopes` | 0.0 | 58 |
| `src/components/applications` | 25.0 | 52 |
| `src/store/consents` | **100.0** | 39 |
| `src/components/keep-elements/react` | **100.0** | 34 |
| `src/styles` | **100.0** | 20 |
| `src/store/access` | **100.0** | 18 |

**The shape of the tree changed as much as the numbers did.** `keep-elements` overtook
`store/databases` as the largest directory (1,169 lines vs 1,040) because #806 keeps moving
React leaves into it — and it arrives *tested*, at 89.1 %. Nine directories from the previous
table are simply gone: `components/people`, `components/groups`, `store/people`,
`store/peopleSelector`, `store/groups` (all deleted by #770 with `@mui/x-data-grid`), and
`components/commons` shrank to a `cardviews` remnant as #863–#876 converted it.

⚠️ **This time the headline gain is real, and large.** Covered lines went 1,626 → **3,349**
while executable lines went 4,682 → **4,776** — so 1,723 newly covered lines against a
denominator that barely moved. That is the opposite of the last refresh, where most of the
+2.3 points came from the denominator shrinking. Two PR families account for it:
#801–#805 (`store/databases` 22.0 % → 84.4 %, ~640 newly covered lines in one area) and
#806's element conversions.

**What is still uncovered is now almost entirely React views that are queued for deletion.**
`components/access` (521 lines, 11.1 %), `components/schemas` and `components/scopes` (140
lines, **0 %**), `components/login` (138, 15.9 %). Writing component tests for these is
mostly wasted work — #806 converts them to Lit elements, and the element arrives with its
own suite. That inverts the previous refresh's advice.

Ranked by payoff ÷ effort, what remains:

| Rank | Module(s) | Why | Test type | Effort |
|---|---|---|---|---|
| 1 | **Nothing in the store** | ✅ The store is done: `databases` 84.4 %, `applications` 94.5 %, `consents`/`access`/controllers 100 %, every reducer 100 %. #690's queue is empty | — | — |
| 2 | `src/AppShell.tsx` (10.3 %) and `src/Views.tsx` (0 %) | the shell is the one *untested* area that is **not** queued for imminent deletion — P4 of #806 rewrites it, but not soon, and `app-shell.test.ts` only covers the dead-code guard | component + source-scan | M |
| 3 | `keep-source.ts` (776 lines) | **excluded from the ratchet entirely** — covered at the API level only. The largest single blind spot left, and it is a Lit element, so it is not going away | extend existing suite | M–L |
| 4 | `components/access` (521, 11.1 %) | ⚠️ **do not test in place.** `TabsAccess.tsx` alone is 1,002 lines and is tier D of #806; it gets a suite when it becomes an element | — (defer) | — |
| 5 | `keep-monaco-editor.ts` residual | diff-mode paths and the prettier round-trip | extend existing suites | S |

## B2. Phased plan — status

**Phase 1 — Pure logic.** ✅ **DONE.** `src/utils/*` + all `src/store/*/reducer.ts` (now 10,
on `createSlice` since #710) at **100 %** lines. Table-driven per reducer, exactly as
sketched. ⚠️ One migration hazard worth recording: `createSlice` needs `extraReducers` for
the shared `INIT_STATE` action, and a dispatch of a raw type string becomes a **silent
no-op** rather than an error — the reducer tests are what caught that.

**Phase 1b — Services.** ✅ **DONE** (#669, #670). Six suites, `src/services` at **96.1 %**
lines, gate 93 %.

**Phase 1c — Thunks/actions.** ✅ **DONE** (#801–#805). What was "still one file" last
refresh is now the best-covered large area in the tree. #711 split the 2,885-line
`databases/action.ts` into 13 per-concern modules and #801–#805 covered them: `store/databases`
went **22.0 % → 84.4 %**, `store/applications` **24.6 % → 94.5 %**, `store/consents` and
`store/access` to **100 %**. #690 is closed.

⚠️ **The lesson from these suites is that a thunk test must actually execute the thunk.** A
test that dispatches into a recording mock and asserts the recorded action covers *nothing* —
the thunk body never runs. And `apiRequestWithRetry` swallows programmer errors alongside
network ones, so a `TypeError` inside a thunk can surface as a benign-looking failed request.
Both traps produced green tests over untested code before they were caught.

**Phase 2 — React component tests.** ✅ **DONE, in the sense that matters.** **23 `.tsx`
suites**, up from 6 — `LoginPage` alone has three (`.layout`, `.form`, `.validity`, 679 lines
in `.form` alone), plus `TabsAccess`, `AppItem`, `AppsTable`, `EditView`, `ViewsTable`,
`FormsTable`, `ConsentsTable`, `ConsentItem`, `AddImportDialog`, `NavigationGuardContext`
and more. `renderWithProviders.tsx` (#689) is the shared harness.

⚠️ **But #691's original goal has been overtaken by #806 and should not be pursued as
written.** Its remaining targets — `components/access` at 11 %, `schemas`/`scopes` at 0 % —
are React views scheduled for conversion to Lit elements, and an element arrives with its own
suite. Writing RTL tests for them now buys coverage that is deleted with the file. The
exception is a *characterization* suite written deliberately to pin behaviour **before** a
conversion; #880 did exactly that for `BreadcrumbRouter`, and #885 for the five Formik shapes.
That is the pattern to follow, not blanket smoke tests.

**Phase 3 — Web-component (Lit/WebAwesome) tests.** ✅ **DONE, and it went much further than
planned.** ~45 suites in `test/components/keep-elements/` cover **50** `@customElement`
registrations across 54 modules, with `keep-monaco-editor` carrying two (§A10) and several
cross-cutting suites — `theme-selectors.test.ts` (#708), `validity-states.test.ts` (#744) and
`keep-element-wrappers.test.ts` (#806) — asserting invariants across the whole directory
rather than per element. Backed by `test/test-utils/lit.ts`:

```ts
// mountLit: create by tag, assign reactive props, append, await updateComplete
const el = await mountLit<KeepButton>('keep-button', { variant: 'brand' });
// cleanupLit(): document.body.innerHTML = '' in afterEach
```

The original guidance to *"assert on the light-DOM tag, not shadow content"* turned out to
be **too conservative**: with the `attachInternals` stub installed unconditionally (A3),
shadow-DOM assertions work fine in jsdom, and the element suites assert on shadow content
directly. That is how the directory reached 89.1 % lines.

⚠️ **One thing jsdom genuinely cannot do: form association.** `wa-*` form participation is
untestable in this suite — the behaviour has to be split out and verified in a real browser.
Do not write a jsdom test that appears to cover it.

## B3. The ratchet — as configured

**The ratchet grew from 4 per-path gates to 14**, and the global floor from 30 % to 61 %:

```ts
thresholds: {
  lines: 61, statements: 61, functions: 63, branches: 49,   // global floor
  'src/store/**/reducer.ts':          { lines: 97, statements: 97, functions: 97, branches: 92 },
  'src/store/access/action.ts':       { lines: 97, ... branches: 84 },
  'src/store/consents/action.ts':     { lines: 97, ... branches: 67 },
  'src/store/applications/action.ts': { lines: 90, ... branches: 68 },
  'src/store/databases/**':           { lines: 81, ... branches: 64 },   // new (#880)
  'src/store/StoreController.ts':     { lines: 97, ... branches: 95 },
  'src/store/FormController.ts':      { lines: 97, ... branches: 95 },   // new (#880)
  'src/store/FormController.react.ts':{ lines: 100, ... branches: 100 },
  'src/store/store.ts':               { lines: 95, ... branches: 90 },
  'src/router/**':                    { lines: 94, ... branches: 91 },   // new (#880)
  'src/utils/**':                     { lines: 96, ... branches: 93 },
  'src/components/keep-elements/**':  { lines: 85, ... branches: 68 },
  'src/services/**':                  { lines: 93, ... branches: 91 },
  'src/components/navigation/**':     { lines: 100, ... branches: 100 },  // new (#884)
}
```

### #880 found the failure mode that drift reporting cannot show you

Two separate problems, and **the second matters more**:

- **Drift.** The global floor sat ~20 points under reality — #801–#805's thunk suites,
  #806's element conversions and #807 had all landed behind it. Fixable by re-measuring.
- **Gaps.** Three well-tested areas had **no gate at all**: `src/store/databases/**` (13
  files, 84.4 %), `src/router/**` (97.8 %) and `src/store/FormController.ts` (100 %). **A
  directory nobody lists is not a low floor — it is no floor**, and a drift report comparing
  configured-vs-measured cannot surface it, because there is nothing to compare. All three
  arrived *after* the previous ratchet PR wrote its list, which is exactly how it happens.

The practical rule that follows: **when a new directory becomes well covered, add a gate in
the same PR.** Re-measuring existing floors is the easy half.

| Milestone | Global lines | `utils/**` | `store/**/reducer` | `keep-elements/**` | `services/**` |
|---|---|---|---|---|---|
| Configured at `e17010c` | 20 % | 85 % | 95 % | 70 % | — missing |
| Configured at `fcab645` (#686) | 30 % | 85 % | 95 % | 80 % | 90 % |
| **Configured today** (#880) | **61 %** | **96 %** | **97 %** | **85 %** | **93 %** |
| **Measured today** | **70.1 %** | **99.3 %** | **100 %** | **89.7 %** | **96.1 %** |
| Steady state | +2 %/PR toward ~80 % | 96 % | 97 % | 90 % | 93 % |

Branch floors deliberately keep ~4 points of slack and the rest ~3: branch counts move under
ordinary refactoring (an added guard clause, a removed `default:` arm) in a way line counts do
not.

⚠️ **Two honesty notes on the gates.**

1. **`keep-source.ts` (776 lines) is excluded from coverage entirely** — an interactive
   tree/source editor whose exhaustive unit coverage in jsdom is impractical. It is the
   largest blind spot in the tree, and it does not show up as a low number anywhere; it
   shows up as an `exclude` entry. Covered at the API level by `keep-source.test.ts`.
2. **`FormController.react.ts` is gated at 100/100/100/100 and is meant to be deleted.** The
   config says so explicitly: delete the entry *with the file*, when the last `.tsx` consumer
   becomes a Lit element. A floor on a path that no longer exists protects nothing while
   looking like it does.

A note on tightening floors that came out of #880's review: **restore the real pre-fix
expression when checking whether a gate would have caught a regression** — deleting the fixed
line is not the same mutation, and it can make a check look effective when it is not. And read
the last uncovered branch rather than lowering a floor to meet it.

A Sonar **Quality Gate on New Code** (e.g. "coverage on new code ≥ 80 %") would be the
ideal enforcement for incoming work — it holds every PR to a high bar while the legacy
baseline catches up, reading `coverage/lcov.info`. **The scanner that feeds it now runs**
(#688, §A4–A9), but the gate itself is **report-only** until it is defined in SonarQube
Cloud and `continue-on-error` is dropped from the workflows. Until then the per-directory
thresholds remain the only *blocking* enforcement, so keep ratcheting them — and prefer *adding* a directory gate when a new
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
| **Monaco editor** | ✅ **handled, two ways** | `queryCommandSupported` polyfilled in setup; the behavioural suite mocks `monaco-editor` wholesale; the lifecycle suite runs the real thing on `test/test-utils/monaco.ts` stubs (§A10). The import is now **dynamic** (#729), so the React bridge no longer drags Monaco into every suite that touches it. `@monaco-editor/react` / `@monaco-editor/loader` were deleted from `package.json` in #675. |
| **Real Monaco reports errors on a timer** | ✅ handled, non-obvious | `captureMonacoErrors()` hooks `process.on('uncaughtException')`, because Monaco's `ErrorHandler` rethrows inside `setTimeout` — `expect(…).not.toThrow()` cannot see it (§A10). |
| **Redux store helper** | ✅ **DONE** (#689) | `test/test-utils/renderWithProviders.tsx` now sits alongside `lit.ts` and `monaco.ts`; the duplicated `createMockStore()` declarations in `EditView.test.tsx` and `TabsAccess.test.tsx` are gone. |
| ~~**react-router 7**~~ | ➖ **gone** | #716 replaced `react-router-dom` with the in-repo router at `src/router/`. Tests use its own harness; `router.test.ts` (458 lines) + `react.test.tsx` (598) cover it at **97.8 %**. |
| ~~**MUI 9 / Linaria**~~ | ➖ **gone** | Both packages are uninstalled — MUI with #709, Linaria and `wyw` with #825 — so neither the `matchMedia` stub's original reason nor the `wyw`-stays-in-the-plugin-list rule applies any more. `css: false` still means no computed styles, and that constraint is its own row below. |
| **`css: false` makes styling invisible** | 🟡 **structural, mitigated by a new test genre — and it has already cost us a bug** | This is why #708's tokenization has *no* runtime test: `getComputedStyle()` returns nothing useful and jsdom has no canvas backend to resolve `color-mix()`. The workaround that emerged is **source-scanning suites** — `keep-theme.test.ts` parses `keep-theme.css` as text and pins each token to `getTheme()`; `theme-selectors.test.ts` greps the element sources for `light-dark(` outside the editor-palette carve-out; `shell-dead-code.test.ts` asserts deleted shell code stays deleted. **They pin structure, not appearance.** 🐛 Worked example, found in this refresh: `validity-states.test.ts` (#744) asserts that the invalid-state rules use `:state(user-invalid)` and that the state flips correctly — and passes — while the colour those rules apply, `var(--wa-color-danger-600)`, names a token WA 3.10 does not define, with no fallback, so the border never paints. A structural test caught the dead selector and could not catch the dead value. See report 03 finding 11b. |
| **`wa-*` form association** | 🔴 **not testable here** | jsdom cannot run form association at all, so `wa-*` form participation has no jsdom coverage. Split those assertions out and verify them in Chrome; do not write a jsdom test that *looks* like it covers them. |
| **WebAwesome / Lit custom elements** | ✅ handled, with a twist | jsdom's own `attachInternals` is *incompatible* with WA form-associated elements, so the stub is installed **unconditionally** rather than conditionally. Registration still happens automatically on import. Shadow-DOM assertions are fine. |
| **Popover / top layer** | ✅ handled | polyfilled in setup for `keep-alert`. |
| **`beforeunload` / native events** | ✅ handled | `EditView.test.tsx` pattern ported unchanged. |
| **jsdom `localStorage` timing** | ✅ handled | stubbed in setup because `store/styles/reducer.ts` reads it at import time. |
| **Vite server won't exit** | 🟡 cosmetic, **cost removed** (#738) | The message still prints — `something prevents Vite server from exiting` — so the open handle is still there, but capping `teardownTimeout` took ~9 s off the coverage path. A full run is **16.43 s** wall-clock for 133 files / 1709 tests. Chase the handle with the `hanging-process` reporter when convenient; tracked as **#692**. |
| **Noisy stderr** | ➖ benign | Every Lit suite prints `Lit is in dev mode`, and Node prints an `ExperimentalWarning` about `localStorage` per worker. Neither affects results; both make a failing run harder to read. |

---

## Master checklist

| # | Task | Status | Effort |
|---|---|---|---|
| A1–A11 | Jest → Vitest migration (deps, config, setup, port 4 tests, flip script, purge Jest) | ✅ **DONE** (`f7907a3`, PR #649) | — |
| A12 | Move tests to a top-level `test/` tree | ✅ **DONE** (`4d7ab3b`, PR #663) | — |
| B1 | Phase 1 — `utils/*` + all `store/*/reducer.ts` (now 10, on `createSlice`) | ✅ **DONE** | — |
| B2 | Phase 3 — element suites + `test/test-utils/lit.ts` | ✅ **DONE** (PRs #652–#659, completed by #668) | — |
| B3 | Coverage thresholds + per-directory gates | ✅ **DONE** | — |
| C1 | Polyfill `document.queryCommandSupported` in `test/setupTests.ts` | ✅ **DONE** (PR #668) | — |
| C2 | Test `keep-monaco-editor.ts` — restores the `keep-elements` gate | ✅ **DONE** (PR #668; directory now **89.1 %** across 54 files) | — |
| C4 | Test `src/services/**` | ✅ **DONE** (PRs #669, #670; 6 suites, **96.1 %**) | — |
| C11 | Publish the coverage summary to the CI job summary | ✅ **DONE** (PR #671) | — |
| C3 | Make the Monaco import dynamic so the React bridge stays cheap | ✅ **DONE** (#693/#729). ⚠️ Measure the **eager closure**, not the entry-chunk line: 887.5 kB raw / 243.7 kB gzip, gated by `bundle:budget` | — |
| C7 | Raise the ratchet to the §B3 "next PR" row | ✅ **DONE** (#686) — global 20→30, `keep-elements` 70→80, `services` gate added at 90 | — |
| C5 | Extract `test/test-utils/renderWithProviders.tsx`; stop re-declaring `createMockStore()` | ✅ **DONE** (#689) | — |
| C8 | Split `tsconfig` so `npm run build` stops type-checking `test/` | ✅ **DONE** (#687) — solution-style root referencing `tsconfig.app.json` (build) and `tsconfig.test.json` (typecheck) | — |
| C9 | Resolve the dead Sonar reporting (§A4–A9) — wired a scanner into CI: `sonar-project.properties` + PR analysis in `pr_check.yml` + branch analysis in `sonar.yml`, skipping when `SONAR_TOKEN` is absent, gate report-only | ✅ **DONE** (#688) | — |
| C13 | Delete the duplicated `queryCommandSupported` block in `test/setupTests.ts` | ✅ **DONE** (#678) | — |
| C12 | Phase 1c — thunk tests for the remaining `store/*/action.ts` | ✅ **DONE** (#801–#805, after #711 split the file as this row advised). `store/databases` **22.0 % → 84.4 %**; #690 closed | — |
| C6 | Phase 2 — React component tests | ✅ **23 suites** (was 6). ⚠️ **#691's remaining targets are superseded** — `people`/`groups` were deleted (#770); `schemas`/`scopes`/`access` are queued for conversion by #806 and an element arrives with its own suite. Write *characterization* suites before a conversion (#880, #885), not blanket smoke tests | — |
| C14 | Define the Sonar **Quality Gate on New Code** in SonarQube Cloud and drop `continue-on-error`, so the gate blocks rather than reports | 🟡 TODO | S |
| **C17** | **Cover the shell** — `AppShell.tsx` 10.3 %, `Views.tsx` 0 %. The only substantial untested area *not* queued for deletion | 🟡 TODO | M |
| **C18** | **Decide about `keep-source.ts`** (776 lines, excluded from coverage outright). The largest blind spot in the tree, and it is a Lit element, so it is not going away | 🟡 TODO | M–L |
| C10 | Find the handle that keeps the Vite server alive (`hanging-process` reporter); the ~9 s cost is gone but the message remains | 🟢 nice-to-have (**#692**) | S |
| C15 | Tighten the gates with free headroom | ✅ **DONE** (#880) — `utils/**` 85 → **96**, `store/**/reducer.ts` 95 → **97**, `keep-elements/**` 80 → **85**, global 30 → **61**, and four missing gates added | — |

_For unrelated code-quality findings, see `reports/00-code-quality.md`._
