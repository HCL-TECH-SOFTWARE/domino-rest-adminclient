# 01 — Vitest Migration & Test-Coverage Strategy

> Companion to `reports/00-code-quality.md` — general code-quality issues are catalogued
> there and are **not** repeated here. This report is scoped to the test toolchain and
> coverage.

> **Refreshed 2026-07-28** against branch `new_code` @ `fcab645`. Previous refreshes:
> `e17010c` and `7594672` (both 2026-07-27); originally written 2026-07-24 as a
> Jest→Vitest migration plan.
>
> **Part A (the migration) is COMPLETE** — landed in `f7907a3` / PR #649, with the test
> tree relocated in `4d7ab3b` / PR #663. **Part B Phase 1 (pure logic) is COMPLETE**;
> Phase 3 (Lit elements) landed alongside the TypeScript conversion in PRs #652–#659 and
> was finished off by PR #668.
>
> ✅ **The suite is GREEN on this branch.** `npm run test` exits 0 with
> **70 files / 747 tests**, all thresholds met. See
> [§0 Current status](#0-current-status--suite-is-green).

## TL;DR

- **Jest is gone.** Vitest 4.1 runs on the same Vite plugin graph as the build
  (`@wyw-in-js` + `@vitejs/plugin-react-swc`), so Linaria `styled` components and the Lit
  decorators transform identically to `npm run build`.
- **4 tests → 747 tests across 70 files** (was 636 / 63 at the last refresh). Global line
  coverage went from ~0 % to **34.72 %**, with `src/utils` at **99.3 %**, `src/services`
  at **96.8 %**, `src/components/keep-elements` at **84.5 %**, and every
  `src/store/**/reducer.ts` at **100 %**.
- **The coverage ratchet is real, enforced, and was raised once already** (#686 lifted the
  `keep-elements` gate 70 → 80 after the element suites landed). Every gate passes with
  headroom; the global floor at 30 % is now the stale one (§B3).
- **Monaco is tested twice, on purpose.** A fake-`monaco-editor` suite covers component
  behaviour; a second, deliberately tiny suite drives the **real** editor in jsdom to
  cover Monaco-internal invariants a fake cannot reach. The second one caught a
  dispose-ordering bug the fake suite passed straight through (§A10).
- **A new test genre appeared this round: source-scanning tests.** `shell-dead-code.test.ts`,
  `theme-selectors.test.ts` and `keep-theme.test.ts` parse source and CSS as *text* rather
  than executing it, because `vitest.config.ts` runs with `css: false` and cannot see
  styling at all. They are the only automated guard the token layer has (§B4).
- Remaining work is **Phase 2 (React component tests, #691)**, thunk/action coverage
  (**#690**), and raising the global floor. The toolchain questions this report opened are
  all settled.

---

## 0. Current status — suite is GREEN

`npm run test` on `new_code` @ `fcab645`:

```
 Test Files  70 passed (70)
      Tests  747 passed (747)
   Duration  9.91s
```

Exit code **0**. No threshold breach, no suite fails to load.

### 0.1 What changed since `e17010c`

80 commits. Twelve new test files, three deleted, +1,896/−398 lines under `test/`:

| PR | What landed | Effect on this report |
|---|---|---|
| #689 | `test/test-utils/renderWithProviders.tsx`; the duplicated `createMockStore()` removed | closes **C5** |
| #686 | Coverage ratchet raised to match measured coverage — `keep-elements` 70 → **80** | first ratchet *raise* in the program (§B3) |
| #687 | `tsconfig` split so `npm run build` stops type-checking `test/` | closes **C8** |
| #688 | SonarQube Cloud wired into `pr_check.yml` + `sonar.yml` | closes **C9** — `vitest-sonar-reporter` finally has a consumer |
| #693/#729 | Monaco behind a dynamic `import()` | closes **C3**; entry chunk 6.32 MB → **2.11 MB** |
| #678 | Duplicate `queryCommandSupported` polyfill deleted | closes **C13** |
| #692/#738 | `teardownTimeout` capped so coverage stops adding ~9 s per run | partially addresses **C10** (§0.4) |
| #704/#723 | `keep-tree` replaces MUI X tree view | `keep-tree.test.ts`, 152 lines |
| #703/#739 | `keep-input-date` replaces `@mui/x-date-pickers` | `keep-input-date.test.ts` |
| #742/#744 | WA validity styling keyed on `:state(user-invalid)` | `validity-states.test.ts`, 179 lines |
| #743/#745/#748 | LoginPage drops MUI; login grid fixed | `LoginPage.layout.test.tsx` (9) + `LoginPage.validity.test.tsx` (6), 304 lines — takes the React-component suites from 4 files to **6** (§B2) |
| #707 | `wa-page` shell | `app-shell.test.ts` (142) + `shell-dead-code.test.ts` (104) |
| #708 | Token layer | `keep-theme.test.ts` (94) + `theme-selectors.test.ts` (99) |
| #701 | Four `keep-button*` collapsed into one | **−3 test files**, `keep-button.test.ts` absorbed the cases |
| #696 | Helpers moved to `src/utils/field-types.ts` | `field-types.test.ts` (70) |

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
missing test rather than excluding the file. The directory now sits at **84.5 %**, and
#686 raised its gate from 70 to **80** so the headroom cannot silently be spent.

### 0.4 The "Vite server won't exit" tail — halved, not fixed

C10 recorded a ~10 s tail on every run. #692/#738 capped `teardownTimeout`, which removed
roughly 9 s from the *coverage* path. The message itself still prints —

```
Tests closed successfully but something prevents Vite server from exiting
```

— so the underlying open handle is still there; what changed is that it no longer costs
the full timeout. The issue stays open as **#692**. Practical impact today is a message,
not a delay: the run above completed in 9.91 s wall-clock.

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

## Current state snapshot (verified 2026-07-28)

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
| Test helpers | none | **`test/test-utils/lit.ts`**, **`monaco.ts`**, **`renderWithProviders.tsx`** (#689) | §A10 |
| Sonar | `jest-sonar-reporter` | **`vitest-sonar-reporter` 3.0** → `coverage/sonar-report.xml` (CI only), **now consumed by a real scanner** (§C9) | `vitest.config.ts`, `sonar-project.properties` |
| Coverage | Istanbul via `--coverage` | **`@vitest/coverage-v8`** → `text`, `lcov`, `html`, `json-summary` | `vitest.config.ts` |
| Thresholds | none | **global floor + 4 per-directory gates**, all passing | `vitest.config.ts` |
| Test files / tests | 4 / 34 | **70 / 747** | `npm test` |
| Global line coverage | ~0 % | **34.72 %** | `coverage/coverage-summary.json` |
| CI | `build` + `test` | **`lint` → `build` → `test` → `publish coverage summary` → `Sonar scan`** on Node 24 | `.github/workflows/pr_check.yml` |

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

`npm run test` at `fcab645`, all 70 files running:

```
Statements   : 34.94 % ( 1705/4879 )
Branches     : 32.46 % (  763/2350 )
Functions    : 30.96 % (  379/1224 )
Lines        : 34.72 % ( 1626/4682 )
```

| Area | Lines | Status |
|---|---|---|
| `src/utils/**` | **99.3 %** (144/145) | ✅ Phase 1 complete — plus `field-types` (#696) |
| `src/store/**/reducer.ts` | **100 %** (319/319) | ✅ Phase 1 complete — 17 reducers, table-driven, gate 95 % |
| `src/services/**` | **96.8 %** (120/124) | ✅ all six services tested (#669, #670); gate 90 % added since |
| `src/components/keep-elements/**` | **84.5 %** (523/619) | ✅ gate raised 70 → **80** (#686) |
| `src/store/account` | **76.8 %** (96/125) | ✅ was 38.7 % — the thunk suite grew from 8 tests to a full failure-path sweep |
| `src/components/forms` | 60.4 % (168/278) | `EditView` + `compare-form-names` |
| `src/components/dialogs` | 30.0 % (12/40) | `UnsavedChangesDialog` |
| `src/store/databases` | 22.0 % (240/1091) | 🟡 largest single gap — 2,885-line `action.ts` at **5.8 %** |
| `src/components/**` (other React views) | 0.8 – 21 % | 🟡 **Phase 2 — the remaining gap (#691)** |

Per-directory line coverage, largest directories first:

| Directory | Lines % | Lines |
|---|---|---|
| `src/store/databases` | 22.0 | 1091 |
| `src/components/keep-elements` | **84.5** | 619 |
| `src/components/access` | 4.5 | 466 |
| `src/components/database` | 5.9 | 304 |
| `src/components/forms` | 60.4 | 278 |
| `src/components/commons` | 10.0 | 170 |
| `src/utils` | **99.3** | 145 |
| `src/components/login` | 14.0 | 136 |
| `src/store/account` | **76.8** | 125 |
| `src/components/people` | 0.8 | 124 |
| `src/services` | **96.8** | 124 |
| `src/store/applications` | 24.6 | 118 |
| `src/components/groups` | 0.9 | 116 |
| `src/store/people` | 20.7 | 92 |
| `src/store/peopleSelector` | 15.6 | 90 |
| `src/store/groups` | 17.9 | 84 |
| `src/components/schemas` | 1.3 | 79 |
| `src/components/navigation` | 4.3 | 69 |
| `src/components/applications` | 20.9 | 67 |
| `src/components/scopes` | 1.8 | 57 |

⚠️ **Read the +2.3 points carefully.** Executable lines fell 4,709 → **4,682** while
covered lines rose 1,528 → **1,626**. So the gain is genuine — 98 newly covered lines —
but part of the *percentage* comes from the denominator shrinking, as #681 deleted an
unreachable screen, #701 collapsed four components into one, and #703/#704 replaced MUI
subsystems with smaller elements that were tested on arrival. Note also that ~1,900 lines
of new test code bought those 98 lines: much of this round's testing went into
*source-scanning* suites (§B4) that assert on structure rather than executing it, and
into deepening `store/account` from 38.7 % to 76.8 %. That is the expected shape when the
work is a migration rather than a coverage push — but it means the ratchet, not the
headline, is the number to watch.

Ranked by payoff ÷ effort, what remains:

| Rank | Module(s) | Why | Test type | Effort |
|---|---|---|---|---|
| 1 | `src/store/databases/action.ts` (2,885, **5.8 %**) | by far the largest untested file in the tree; `store/databases` is 23 % of all executable lines. Note **#711** proposes splitting it — doing that first makes the tests smaller and better-targeted | unit w/ `fetch` mocks | **M–L** |
| 2 | Remaining `src/store/*/action.ts` thunks (`people`, `peopleSelector`, `groups`, `applications`) | same shape as the `account/action.ts` suite, which is now the proven pattern — copy it. Tracked as **#690** | unit w/ mocks | M |
| 3 | Presentational React components (`components/people`, `groups`, `schemas`, `scopes`, `navigation` — all <5 %) | RTL smoke renders; cheap per file, and `renderWithProviders()` now exists. Tracked as **#691** | component | M |
| 4 | `src/components/access` (466 lines, 4.5 %) | `TabsAccess.tsx` alone is 1,007 lines and has one suite | component | M–L |
| 5 | `keep-monaco-editor.ts` residual | diff-mode paths and the prettier round-trip | extend existing suites | S |

## B2. Phased plan — status

**Phase 1 — Pure logic.** ✅ **DONE.** `src/utils/*` + all 17 `src/store/*/reducer.ts`,
plus `store/databases/scripts.ts`. Table-driven per reducer (unknown action → same state;
each `case` → expected transition), exactly as sketched.

**Phase 1b — Services.** ✅ **DONE** (#669, #670). Six suites, 74 tests, `src/services`
at 96.8 % lines. These were rows 1, 2 and 4 of the previous refresh's payoff table and
they landed as predicted — all pure or jsdom-friendly, all **S**.

**Phase 1c — Thunks/actions.** 🟡 **STARTED — still one file, but a deep one.**
`test/store/account/action.test.ts` grew this round (+209 lines) and took `store/account`
from 38.7 % to **76.8 %**. It remains the only *action* suite in the tree, and the
template for the 16 others: it enumerates every failure path of `renewToken` (4xx, 5xx,
an HTML error page, a dropped connection, malformed JSON) rather than asserting one happy
path, stubs only the parts of `Response` that `checkForResponse` touches, and silences the
deliberate logging via `Logger.setLevel(Level.OFF)` so the suite output stays clean.
Tracked as **#690**.

**Phase 2 — React component tests.** 🟡 **STARTED.** Two developments since the last
refresh. First, the blocker is gone: **`test/test-utils/renderWithProviders.tsx` now
exists** (#689) and `createMockStore()` is no longer re-declared per suite — that was the
"natural first move" the previous refresh identified, and it landed. Second, #745/#748 added
`LoginPage.layout.test.tsx` (9 tests) and `LoginPage.validity.test.tsx` (6), taking the
React-view suites from 4 files to **6**. Coverage of `components/login` is still only
14 %, so this is a beachhead rather than a phase in progress. Tracked as **#691**.

**Phase 3 — Web-component (Lit/WebAwesome) tests.** ✅ **DONE, and it went further than
planned.** 29 suites in `test/components/keep-elements/` cover all 26 element modules
(25 `@customElement` registrations plus the `keep-element` base), with `keep-monaco-editor`
carrying two (§A10) and **two new cross-cutting suites** — `theme-selectors.test.ts` (#708)
and `validity-states.test.ts` (#744) — asserting invariants across the whole directory
rather than per element. Backed by `test/test-utils/lit.ts`:

```ts
// mountLit: create by tag, assign reactive props, append, await updateComplete
const el = await mountLit<KeepButton>('keep-button', { variant: 'brand' });
// cleanupLit(): document.body.innerHTML = '' in afterEach
```

The original guidance to *"assert on the light-DOM tag, not shadow content"* turned out to
be **too conservative**: with the `attachInternals` stub installed unconditionally (A3),
shadow-DOM assertions work fine in jsdom, and the element suites assert on shadow content
directly. That is how the directory reached 84.5 % lines.

## B3. The ratchet — as configured

```ts
thresholds: {
  lines: 30, statements: 30, functions: 27, branches: 28,   // global floor
  'src/store/**/reducer.ts':         { lines: 95, statements: 95, functions: 90, branches: 88 },
  'src/utils/**':                    { lines: 85, statements: 85, functions: 55, branches: 60 },
  'src/components/keep-elements/**': { lines: 80, statements: 80, functions: 72, branches: 62 },
  'src/services/**':                 { lines: 90, statements: 90, functions: 90, branches: 88 },
}
```

✅ **#686 adopted the previous refresh's "next PR" row in full** — the global floor went
20 → **30**, `keep-elements` 70 → **80**, and the missing `src/services` gate was added at
**90**. That is the first time this report's recommendation was applied as written, and it
is why the gap between configured and measured is now 2–5 points instead of 12–14.

| Milestone | Global lines | `utils/**` | `store/**/reducer` | `keep-elements/**` | `services/**` |
|---|---|---|---|---|---|
| Configured at `e17010c` | 20 % | 85 % | 95 % | 70 % | — missing |
| **Configured today** (#686) | **30 %** | 85 % | 95 % | **80 %** | **90 %** |
| **Measured today** | **34.7 %** | **99.3 %** | **100 %** | **84.5 %** | **96.8 %** |
| After thunk coverage (**#690**) | 40 % | 90 % | 95 % | 85 % | 90 % |
| After Phase 2 (**#691**) | 50 % | 90 % | 95 % | 85 % | 90 % |
| Steady state | +2 %/PR toward ~65 % | 90 % | 95 % | 90 % | 90 % |

Remaining slack is small but real: `utils/**` is gated at 85 against a measured 99.3, and
`store/**/reducer.ts` at 95 against a measured 100. Both could be tightened for free.
The global floor at 30 vs 34.7 is the right kind of margin — close enough to catch a
regression, loose enough that deleting a well-tested file does not fail CI.

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
| **react-router 7** | ✅ handled | `<MemoryRouter initialEntries={[…]}>` as before. |
| **MUI 9 / Linaria** | ✅ handled | `matchMedia` stub in setup; `css: false` means no computed styles — assert on roles/text/`data-testid`. `wyw` stays in the plugin list so `styled` components remain real components. |
| **`css: false` makes styling invisible** | 🟡 **structural, mitigated by a new test genre — and it has already cost us a bug** | This is why #708's tokenization has *no* runtime test: `getComputedStyle()` returns nothing useful and jsdom has no canvas backend to resolve `color-mix()`. The workaround that emerged is **source-scanning suites** — `keep-theme.test.ts` parses `keep-theme.css` as text and pins each token to `getTheme()`; `theme-selectors.test.ts` greps the element sources for `light-dark(` outside the editor-palette carve-out; `shell-dead-code.test.ts` asserts deleted shell code stays deleted. **They pin structure, not appearance.** 🐛 Worked example, found in this refresh: `validity-states.test.ts` (#744) asserts that the invalid-state rules use `:state(user-invalid)` and that the state flips correctly — and passes — while the colour those rules apply, `var(--wa-color-danger-600)`, names a token WA 3.10 does not define, with no fallback, so the border never paints. A structural test caught the dead selector and could not catch the dead value. See report 03 finding 11b. |
| **WebAwesome / Lit custom elements** | ✅ handled, with a twist | jsdom's own `attachInternals` is *incompatible* with WA form-associated elements, so the stub is installed **unconditionally** rather than conditionally. Registration still happens automatically on import. Shadow-DOM assertions are fine. |
| **Popover / top layer** | ✅ handled | polyfilled in setup for `keep-alert`. |
| **`beforeunload` / native events** | ✅ handled | `EditView.test.tsx` pattern ported unchanged. |
| **jsdom `localStorage` timing** | ✅ handled | stubbed in setup because `store/styles/reducer.ts` reads it at import time. |
| **Vite server won't exit** | 🟡 cosmetic, **cost removed** (#738) | The message still prints — `something prevents Vite server from exiting` — so the open handle is still there, but capping `teardownTimeout` took ~9 s off the coverage path. A full run is now 9.91 s wall-clock. Chase the handle with the `hanging-process` reporter when convenient; tracked as **#692**. |
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
| C2 | Test `keep-monaco-editor.ts` — restores the `keep-elements` gate | ✅ **DONE** (PR #668; directory now 84.5 %) | — |
| C4 | Test `src/services/**` | ✅ **DONE** (PRs #669, #670; 6 suites, 96.8 %) | — |
| C11 | Publish the coverage summary to the CI job summary | ✅ **DONE** (PR #671) | — |
| C3 | Make the Monaco import dynamic so the React bridge stays cheap | ✅ **DONE** (#693/#729) — entry chunk 6,322.51 kB → **2,111.11 kB** | — |
| C7 | Raise the ratchet to the §B3 "next PR" row | ✅ **DONE** (#686) — global 20→30, `keep-elements` 70→80, `services` gate added at 90 | — |
| C5 | Extract `test/test-utils/renderWithProviders.tsx`; stop re-declaring `createMockStore()` | ✅ **DONE** (#689) | — |
| C8 | Split `tsconfig` so `npm run build` stops type-checking `test/` | ✅ **DONE** (#687) — solution-style root referencing `tsconfig.app.json` (build) and `tsconfig.test.json` (typecheck) | — |
| C9 | Resolve the dead Sonar reporting (§A4–A9) — wired a scanner into CI: `sonar-project.properties` + PR analysis in `pr_check.yml` + branch analysis in `sonar.yml`, skipping when `SONAR_TOKEN` is absent, gate report-only | ✅ **DONE** (#688) | — |
| C13 | Delete the duplicated `queryCommandSupported` block in `test/setupTests.ts` | ✅ **DONE** (#678) | — |
| **C12** | **Phase 1c — thunk tests for the remaining `store/*/action.ts`**, following `store/account/action.test.ts`. Consider doing **#711** (split `databases/action.ts`) first so the tests target modules rather than a 2,885-line file | 🟡 TODO (**#690**) | M–L |
| **C6** | **Phase 2 — React component smoke tests**, starting with the presentational leaves (`people`, `groups`, `schemas`, `scopes`, `navigation`, all <5 %). `renderWithProviders()` removes the setup cost | 🟡 TODO (**#691**) | M |
| C14 | Define the Sonar **Quality Gate on New Code** in SonarQube Cloud and drop `continue-on-error`, so the gate blocks rather than reports | 🟡 TODO | S |
| C10 | Find the handle that keeps the Vite server alive (`hanging-process` reporter); the ~9 s cost is gone but the message remains | 🟢 nice-to-have (**#692**) | S |
| C15 | Tighten the two gates with free headroom: `utils/**` 85 → 95, `store/**/reducer.ts` 95 → 100 | 🟢 nice-to-have | **XS** |

_For unrelated code-quality findings, see `reports/00-code-quality.md`._
