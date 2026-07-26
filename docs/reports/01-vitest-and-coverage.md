# 01 — Vitest Migration & Test-Coverage Strategy

> Companion to `reports/00-code-quality.md` — general code-quality issues are catalogued
> there and are **not** repeated here. This report is scoped to the test toolchain and
> coverage.

> **Refreshed 2026-07-27** against branch `new_code` @ `7594672`. Originally written
> 2026-07-24 as a Jest→Vitest migration plan.
>
> **Part A (the migration) is COMPLETE** — landed in `f7907a3` / PR #649, with the test
> tree relocated in `4d7ab3b` / PR #663. **Part B Phase 1 (pure logic) is COMPLETE**;
> Phase 3 (Lit elements) landed alongside the TypeScript conversion in PRs #652–#659.
>
> ⚠️ **The suite is currently RED on this branch** — not because of the migration, but
> because the last commit added an untested, jsdom-hostile component. See
> [§0 Current status](#0-current-status-suite-is-red).

## TL;DR

- **Jest is gone.** Vitest 4.1 runs on the same Vite plugin graph as the build
  (`@wyw-in-js` + `@vitejs/plugin-react-swc`), so Linaria `styled` components and the Lit
  decorators transform identically to `npm run build`.
- **4 tests → 509 tests across 53 files.** Global line coverage went from ~0 % to
  **26.5 %**, with `src/utils` at **99 %** and every `src/store/**/reducer.ts` above the
  **95 %** gate.
- **The coverage ratchet is real and enforced.** `vitest.config.ts` sets a global floor
  *plus* three per-directory gates; CI fails when they slip. They are slipping right now.
- **Two regressions, both from `7594672`, both S-sized:** a missing jsdom polyfill blocks
  4 suites from loading, and a 538-line untested element breaches the `keep-elements`
  gate.
- Remaining work is **Phase 2 (React component tests)** and raising the ratchet — the
  toolchain questions this report opened are all settled.

---

## 0. Current status — suite is RED

`npm run test` on `new_code` @ `7594672`:

```
 Test Files  4 failed | 49 passed (53)
      Tests  475 passed (475)
```

### 0.1 Root cause — jsdom lacks `document.queryCommandSupported`

```
TypeError: document.queryCommandSupported is not a function
 ❯ node_modules/monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js:29
 ❯ node_modules/monaco-editor/esm/vs/language/css/monaco.contribution.js:8
 ❯ node_modules/monaco-editor/esm/vs/editor/editor.main.js:1
```

`src/components/keep-elements/keep-monaco-editor.ts` does a **top-level**
`import * as monaco from 'monaco-editor'`, and `KeepElements.tsx` imports that module to
export the `KeepMonacoEditor` wrapper. Every test that touches *any* component using the
React bridge therefore evaluates the whole Monaco ESM bundle inside jsdom, which executes
`document.queryCommandSupported` at module scope.

Affected suites (all fail at import, 0 tests run):
`test/App.test.tsx` · `test/components/access/TabsAccess.test.tsx` ·
`test/components/forms/EditView.test.tsx` ·
`test/components/dialogs/UnsavedChangesDialog.test.tsx`.

**Fix (verified):** add to `test/setupTests.ts`, next to the existing Popover and
`<dialog>` stubs —

```ts
// jsdom implements neither queryCommandSupported nor execCommand; monaco-editor
// calls the former at module scope when its clipboard contribution registers.
if (!(document as any).queryCommandSupported) {
  (document as any).queryCommandSupported = () => false;
  (document as any).execCommand = () => false;
}
```

With that one hunk applied, the run is **53 files / 509 tests, all passing**.

**Better long-term fix:** move the Monaco import inside `firstUpdated()` (dynamic
`import('monaco-editor')`), so the React bridge stays cheap and the editor is code-split
out of the 6.94 MB entry chunk as well (report 00 P2-3/P0-10).

### 0.2 Second failure — the `keep-elements` coverage gate

Even with the polyfill, `npm test` still exits non-zero:

```
ERROR: Coverage for lines (60.27%) does not meet "src/components/keep-elements/**" threshold (70%)
ERROR: Coverage for statements (60.91%) does not meet "src/components/keep-elements/**" threshold (70%)
ERROR: Coverage for branches (46.89%) does not meet "src/components/keep-elements/**" threshold (50%)
```

`keep-monaco-editor.ts` is 538 lines with **no test file** — the only element in the
directory without one. It drags the directory average below the gate the other 25
elements earned.

**Options, best first:**
1. **Write `test/components/keep-elements/keep-monaco-editor.test.ts`.** Mount with
   `mountLit`, assert the `value`/`language`/`theme` reactive properties, the emitted
   `change` event, and editor disposal on `disconnectedCallback`. Mock `monaco-editor`
   with `vi.mock` so no real editor is constructed (this also sidesteps §0.1 for that
   file).
2. **Exclude it from coverage**, the way `keep-source.ts` already is — but only with a
   comment justifying why, and paired with a tracked follow-up. Excluding an untested
   538-line component silently is how ratchets rot.

---

## Current state snapshot (verified 2026-07-27)

| Area | 2026-07-24 | **Today** | Source of truth |
|---|---|---|---|
| Runner | Jest 30 | **Vitest 4.1.10** | `package.json` `test`, `vitest.config.ts` |
| Transform | `ts-jest` **and** `@swc/jest` (redundant) | **Vite plugin graph** — `@wyw-in-js/vite` + `@vitejs/plugin-react-swc` | `vitest.config.ts` |
| Decorators | n/a | `tsDecorators: true` + `useDefineForClassFields: false` (mirrors `vite.config.mts`) | `vitest.config.ts` |
| Environment | `jest-environment-jsdom` | **`jsdom` 29.1.1**, `url: http://localhost/admin/ui` | `vitest.config.ts` |
| ESM allow-list | `transformIgnorePatterns` | **not needed** — Vite transforms `node_modules` natively | — |
| Asset/style mocks | `__mocks__/fileMock.js`, `styleMock.js` | **deleted** — `css: false` + Vite asset URLs | `vitest.config.ts` |
| Setup file | `src/setupTests.ts` existed but was **never loaded** | **`test/setupTests.ts`, wired via `setupFiles`** | `vitest.config.ts` |
| Test location | 4 files scattered under `src/` | **top-level `test/` tree** mirroring `src/` | `4d7ab3b` |
| Sonar | `jest-sonar-reporter` | **`vitest-sonar-reporter` 3.0** → `coverage/sonar-report.xml` (CI only) | `vitest.config.ts` |
| Coverage | Istanbul via `--coverage` | **`@vitest/coverage-v8`** → `text`, `lcov`, `html`, `json-summary` | `vitest.config.ts` |
| Thresholds | none | **global floor + 3 per-directory gates** | `vitest.config.ts` |
| Test files / tests | 4 / 34 | **53 / 509** | `npm test` |
| CI | `build` + `test` | **`lint` → `build` → `test`** on Node 24 | `.github/workflows/pr_check.yml` |

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

## A2. `vitest.config.ts` — as shipped

Standalone rather than a `test` block inside `vite.config.mts`, so the dev-server CSP
header and `/api` proxy stay out of the test context. Key deviations from the original
plan:

| Planned | Shipped | Why |
|---|---|---|
| `setupFiles: ['./src/setupTests.ts']` | `['./test/setupTests.ts']` | whole test tree moved out of `src/` (`4d7ab3b`) |
| `include: ['src/**/*.{test,spec}.{ts,tsx}']` | `['test/**/*.{test,spec}.{ts,tsx}']` | ditto |
| `reporter: ['text','lcov','html']` | `+ 'json-summary'` | machine-readable badge/ratchet input |
| `exclude: [... 'src/**/*.js']` | `+ 'src/components/keep-elements/keep-source.ts'` | 764-line interactive tree/source editor; covered at API level by `keep-source.test.ts`, exhaustive jsdom coverage impractical. **Documented in-config.** |
| `thresholds: { lines: 5, … }` | global **20/20/17/16** + 3 per-directory gates | ratcheted up as phases landed (§B3) |
| — | `react({ tsDecorators, useAtYourOwnRisk_mutateSwcOptions })` | required by the Lit conversion (see A1) |

## A3. `test/setupTests.ts` — what it actually polyfills

Wiring the previously-dead setup file was the highest-leverage part of the migration.
It now centralises:

| Stub | Why it is needed | Note |
|---|---|---|
| `@testing-library/jest-dom/vitest` | matchers registered against Vitest's `expect` | replaces per-file imports |
| `TextEncoder` / `TextDecoder` | uuid/nanoid/react-router in some jsdom builds | was `jest.config` `globals` |
| `HTMLElement.prototype.attachInternals` | **installed unconditionally** — jsdom 29 ships its own `ElementInternals` that lacks `setValidity`, which WebAwesome's form-associated elements call during Lit's update cycle | a discovery from the migration; the original plan's `if (!…)` guard would have been wrong |
| `HTMLDialogElement.showModal` / `.close` | jsdom has no `<dialog>` modal methods | was copy-pasted per test file |
| Popover API (`showPopover`/`hidePopover`/`togglePopover`) | used by `keep-alert` | added during the overlay batch |
| `localStorage` stub | `store/styles/reducer.ts` reads it at import time | jsdom does not always expose it before module evaluation |
| `window.matchMedia` | MUI reads it on mount | as planned |
| ❌ `document.queryCommandSupported` | **missing** — see §0.1 | the one gap |

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

> ⚠️ **But nothing consumes either file.** Verified 2026-07-27: no `sonar-project.properties`
> exists, none of the three GitHub Actions workflows (`pr_check`, `publish`,
> `push-snapshot`) invokes a scanner, and `pom.xml` has no Sonar configuration. Every CI
> run therefore writes a `coverage/sonar-report.xml` that is read by no one. Either wire
> up an analysis step (see §B3) or drop `vitest-sonar-reporter` and the reporter branch in
> `vitest.config.ts` — carrying dead reporting config invites the assumption that quality
> gates are being enforced somewhere when they are not. The **enforcement that actually
> exists today is the `vitest.config.ts` threshold block**, and it is doing real work
> (§0.2).

---

# Part B — Coverage

## B1. Where coverage actually stands

Measured with the §0.1 polyfill applied, so all 53 files run:

```
Statements   : 26.89 % ( 1306/4856 )
Branches     : 23.08 % (  536/2322 )
Functions    : 24.41 % (  302/1237 )
Lines        : 26.52 % ( 1236/4660 )
```

| Area | Lines | Status |
|---|---|---|
| `src/utils/**` | **99.1 %** (branches 90.6 %) | ✅ Phase 1 complete — `common`, `form`, `mapper`, `token-emitter`, `api-retry` |
| `src/store/**/reducer.ts` | **≥95 %** (gate passes) | ✅ Phase 1 complete — 17 reducers, table-driven |
| `src/components/keep-elements/**` | **60.3 %** | 🔴 gate is 70 % — breached by `keep-monaco-editor.ts` (§0.2) |
| `src/styles` | 83.3 % | incidental |
| `src` (top level) | 61.5 % | `App.test.tsx` |
| `src/services` | 10.6 % | new layer (`log-service`, `editor-theme`, `wa-color`, `wa-typography`) — largely untested |
| `src/components/**` (React views) | ~0 % | 🟡 **Phase 2 — the remaining gap** |

Ranked by payoff ÷ effort, the original B1 table is now fully consumed except its last
row. The next-highest-value untested modules are:

| Rank | Module(s) | Why | Test type | Effort |
|---|---|---|---|---|
| 1 | `src/services/log-service.ts` (142) | pure, no DOM: level filtering, `getLogger` namespacing, `setLogTarget` validation | unit | **S** |
| 2 | `src/services/wa-color.ts` (105) + `wa-typography.ts` (67) | pure token resolution from computed styles; jsdom-friendly with a stubbed `getComputedStyle` | unit | **S** |
| 3 | `src/components/keep-elements/keep-monaco-editor.ts` (538) | unblocks the ratchet (§0.2) | unit w/ `vi.mock('monaco-editor')` | **S–M** |
| 4 | `src/services/editor-theme.ts` (175) | `buildEditorTheme` is a pure mapping | unit | S |
| 5 | `src/store/*/action.ts` thunks | highest LOC left; needs `fetch` mocking | unit w/ mocks | M |
| 6 | Presentational React components | RTL smoke renders | component | M |

## B2. Phased plan — status

**Phase 1 — Pure logic.** ✅ **DONE.** `src/utils/*` + all 17 `src/store/*/reducer.ts`,
plus `store/databases/scripts.ts`. Table-driven per reducer (unknown action → same state;
each `case` → expected transition), exactly as sketched.

**Phase 2 — React component tests.** 🟡 **NOT STARTED.** The 4 pre-existing suites
(`App`, `TabsAccess`, `EditView`, `UnsavedChangesDialog`) were ported and still carry the
whole React-view coverage story. The shared `renderWithProviders()` helper proposed in the
original B2 was **not** extracted — `createMockStore()` is still re-declared per file.
That extraction is the natural first move when Phase 2 starts, and it becomes cheap once
`test/test-utils/` exists (it does — see Phase 3).

**Phase 3 — Web-component (Lit/WebAwesome) tests.** ✅ **DONE, and it went further than
planned.** 26 element suites live in `test/components/keep-elements/`, backed by
`test/test-utils/lit.ts`:

```ts
// mountLit: create by tag, assign reactive props, append, await updateComplete
const el = await mountLit<KeepButton>('keep-button', { variant: 'brand' });
// cleanupLit(): document.body.innerHTML = '' in afterEach
```

The original guidance to *"assert on the light-DOM tag, not shadow content"* turned out to
be **too conservative**: with the `attachInternals` stub installed unconditionally (A3),
shadow-DOM assertions work fine in jsdom, and the element suites assert on shadow content
directly. That is why `keep-elements` reached ~92 % lines on the early batches.

## B3. The ratchet — as configured

```ts
thresholds: {
  lines: 20, statements: 20, functions: 17, branches: 16,   // global floor
  'src/store/**/reducer.ts': { lines: 95, statements: 95, functions: 90, branches: 88 },
  'src/utils/**':            { lines: 85, statements: 85, functions: 55, branches: 60 },
  'src/components/keep-elements/**': { lines: 70, statements: 70, functions: 60, branches: 50 },
}
```

Global floors sit just below the measured baseline so CI fails on regression rather than
demanding new work. Per-directory gates hold the already-covered pure code to a high bar.

**Suggested next steps for the ratchet:**

| Milestone | Global lines | `utils/**` | `store/**/reducer` | `keep-elements/**` | `services/**` |
|---|---|---|---|---|---|
| Today (baseline) | 20 % | 85 % | 95 % | 70 % 🔴 | — |
| After §0.2 is fixed | 25 % | 85 % | 95 % | **75 %** | — |
| After services tests (B1 #1–#4) | 30 % | 90 % | 95 % | 80 % | **80 %** |
| After Phase 2 | 40 % | 90 % | 95 % | 85 % | 85 % |
| Steady state | +2 %/PR toward ~55 % | 90 % | 95 % | 90 % | 85 % |

A Sonar **Quality Gate on New Code** (e.g. "coverage on new code ≥ 80 %") would be the
ideal enforcement for incoming work — it holds every PR to a high bar while the legacy
baseline catches up, reading `coverage/lcov.info`. **This does not exist today** (§A8):
no scanner runs in CI. Until one does, the per-directory thresholds above are the only
enforcement, so keep ratcheting them — and prefer *adding* a directory gate when a new
area gets covered over nudging the global floor, since a directory gate is what catches a
single untested file (which is precisely how §0.2 was caught).

> **Ratchet hygiene:** `7594672` is the cautionary tale. A 538-line component landed with
> no test and the gate caught it — but only *after* merge, because the same commit also
> broke suite loading, which masks threshold output behind a hard failure. Fix red suites
> before trusting a green threshold report.

## B4. Pitfalls specific to this stack — updated

| Pitfall | Status | Mitigation |
|---|---|---|
| **Monaco editor** | 🔴 **live** — now bites at *import* time, not render time (§0.1) | Polyfill `queryCommandSupported`; `vi.mock('monaco-editor')` in the element's own test; ideally make the import dynamic. The old `@monaco-editor/react` advice (`vi.mock('@monaco-editor/react')`) still applies to `FormsContainer.tsx`, which has not yet been swapped. |
| **Redux store helper** | 🟡 open | `createMockStore()` is still re-declared in each React suite. Extract `test/test-utils/renderWithProviders.tsx` alongside the existing `lit.ts`. |
| **react-router 7** | ✅ handled | `<MemoryRouter initialEntries={[…]}>` as before. |
| **MUI 9 / Linaria** | ✅ handled | `matchMedia` stub in setup; `css: false` means no computed styles — assert on roles/text/`data-testid`. `wyw` stays in the plugin list so `styled` components remain real components. |
| **WebAwesome / Lit custom elements** | ✅ handled, with a twist | jsdom 29's own `attachInternals` is *incompatible* with WA form-associated elements, so the stub is installed **unconditionally** rather than conditionally. Registration still happens automatically on import. Shadow-DOM assertions are fine. |
| **Popover / top layer** | ✅ handled | polyfilled in setup for `keep-alert`. |
| **`beforeunload` / native events** | ✅ handled | `EditView.test.tsx` pattern ported unchanged. |
| **jsdom `localStorage` timing** | ✅ handled | stubbed in setup because `store/styles/reducer.ts` reads it at import time. |
| **Vite server won't exit** | 🟡 cosmetic | Every run ends with `close timed out after 10000ms / something prevents Vite server from exiting`. Harmless today (exit code is still correct) but it adds ~10 s per CI run. Chase with the `hanging-process` reporter when convenient. |

---

## Master checklist

| # | Task | Status | Effort |
|---|---|---|---|
| A1–A11 | Jest → Vitest migration (deps, config, setup, port 4 tests, flip script, purge Jest) | ✅ **DONE** (`f7907a3`, PR #649) | — |
| A12 | Move tests to a top-level `test/` tree | ✅ **DONE** (`4d7ab3b`, PR #663) | — |
| B1 | Phase 1 — `utils/*` + all 17 `store/*/reducer.ts` | ✅ **DONE** | — |
| B2 | Phase 3 — 26 Lit element suites + `test/test-utils/lit.ts` | ✅ **DONE** (PRs #652–#659) | — |
| B3 | Coverage thresholds + per-directory gates | ✅ **DONE** | — |
| **C1** | **Polyfill `document.queryCommandSupported` in `test/setupTests.ts`** — unblocks 4 suites | 🔴 **TODO** | **S** |
| **C2** | **Test `keep-monaco-editor.ts`** (or justify an exclusion) — restores the `keep-elements` gate | 🔴 **TODO** | **S–M** |
| C3 | Make the Monaco import dynamic so the React bridge stays cheap (also helps bundle size) | 🟡 TODO | S–M |
| C4 | Test `src/services/**` (`log-service`, `wa-color`, `wa-typography`, `editor-theme`) | 🟡 TODO | S |
| C5 | Extract `test/test-utils/renderWithProviders.tsx`; stop re-declaring `createMockStore()` | 🟡 TODO | S |
| C6 | Phase 2 — React component smoke tests, starting with the presentational leaves | 🟡 TODO | M |
| C7 | Raise the ratchet per the §B3 schedule as each of the above lands | 🟡 TODO | S |
| C8 | Split `tsconfig` so `npm run build` stops type-checking `test/` (report 00 P1-9) | 🟡 TODO | S |
| C9 | Resolve the dead Sonar reporting (§A8): wire a scanner into CI, or drop `vitest-sonar-reporter` | 🟡 TODO | S |
| C10 | Investigate the 10 s "Vite server won't exit" tail on every run | 🟢 nice-to-have | S |

_For unrelated code-quality findings, see `reports/00-code-quality.md`._
