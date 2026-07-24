# 01 — Jest → Vitest Migration & Test-Coverage Strategy

> Companion to `reports/00-code-quality.md` — general code-quality issues are catalogued there and are **not** repeated here. This report is scoped to the test toolchain and coverage.

## TL;DR

- The build already runs on **Vite 8** (`vite.config.mts`) with `@wyw-in-js/vite` (Linaria) + `@vitejs/plugin-react-swc`. Vitest reuses that exact pipeline, so the migration is low-risk and removes a redundant `ts-jest` + `@swc/jest` double-transform.
- Only **4 test files** exist for **210 source files** → effectively **~0 % coverage**. The migration is the moment to also stand up a coverage baseline and a ratchet.
- Migration is mechanical but has **three sharp edges**: (1) default-export component mocks must return `{ default: … }`, (2) `jest.Mock` type casts break, (3) `jest.requireMock` has no direct twin. All three appear in the current tests.
- Highest-value new tests: **pure Redux reducers** (`src/store/*/reducer.ts`) and **`src/utils/*`** — no DOM, no mocks, fast, high line-count payoff.

---

## Current state snapshot (verified)

| Area | Today | Source of truth |
|---|---|---|
| Runner | Jest 30 | `package.json` `test` script, `jest.config.ts` |
| Transform | `preset: 'ts-jest'` **and** `@swc/jest` (redundant double-config) | `jest.config.ts` L3–17 |
| Environment | `jest-environment-jsdom`, `url: http://localhost/admin/ui` | `jest.config.ts` L18–21 |
| ESM allow-list | `transformIgnorePatterns` for `@shoelace-style\|@awesome.me\|uuid\|@lit\|lit\|lit-html\|lit-element\|nanoid` | `jest.config.ts` L22–24 |
| Asset/style mocks | `__mocks__/fileMock.js` (`'test-file-stub'`), `__mocks__/styleMock.js` (`{}`) | `jest.config.ts` L25–28 |
| Globals | `TextEncoder` / `TextDecoder` | `jest.config.ts` L29 |
| Setup file | `src/setupTests.ts` exists **but is NOT wired in** (no `setupFilesAfterEnv`). Each test imports `@testing-library/jest-dom` by hand. | `jest.config.ts` (absent), `src/*.test.tsx` L1 |
| Sonar | `jest-sonar-reporter` via `--testResultsProcessor` → `coverage/sonar-report.xml` (a **test-execution** report, not coverage) | `package.json` L72, `jestSonar` block L103–107 |
| Coverage | `jest --coverage` (Istanbul → `coverage/lcov.info`) | `package.json` L72 |
| Test files | `src/App.test.tsx`, `src/components/forms/EditView.test.tsx`, `src/components/access/TabsAccess.test.tsx`, `src/components/dialogs/UnsavedChangesDialog.test.tsx` | — |
| Stack | React 19, Redux (plain reducers) + RTK store, react-router 7, MUI 9, Linaria, Monaco, Lit/WebAwesome custom elements | — |

**Gap worth fixing during migration:** `src/setupTests.ts` is dead config today — nothing loads it. Wiring it as Vitest `setupFiles` centralises the `@testing-library/jest-dom` import, the `attachInternals` polyfill, and the `HTMLDialogElement` stubs that are currently copy-pasted into individual test files.

---

# Part A — Jest → Vitest migration plan

## A1. Why Vitest is the right fit

Vitest consumes `vite.config.mts`'s plugin graph directly. That means Linaria `styled` components and SWC/React transforms behave **identically** to `npm run build`/`dev`, eliminating the class of "passes in Jest, breaks in prod" bugs. It also lets us delete the `ts-jest` **and** `@swc/jest` transforms (the current config configures both — redundant) plus `babel.config.js`.

## A2. `vitest.config.ts` (new file — copy-paste ready)

A **standalone** `vitest.config.ts` is preferred over merging a `test` block into `vite.config.mts`, because the build config carries a dev-server `Content-Security-Policy` header and an `/api` proxy that are irrelevant (and slightly confusing) in a test context. Reuse the plugins, drop the server bits.

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

export default defineConfig({
  plugins: [
    // Keep wyw so Linaria `styled` components resolve to real components.
    // (Do NOT drop it — @linaria/react's `styled` needs this transform.)
    wyw({ include: ['**/*.{ts,tsx}'] }),
    react(),
  ],
  test: {
    globals: true,                       // replaces @types/jest globals; gives describe/it/expect/vi
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/admin/ui' },   // == jest testEnvironmentOptions.url
    },
    setupFiles: ['./src/setupTests.ts'],
    css: false,                          // don't process/apply CSS → replaces __mocks__/styleMock.js
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,                    // auto clears mock history each test (replaces jest.clearAllMocks)
    reporters: process.env.CI
      ? ['default', ['vitest-sonar-reporter', { outputFile: 'coverage/sonar-report.xml' }]]
      : ['default'],
    coverage: {
      provider: 'v8',                    // @vitest/coverage-v8
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/index.tsx',
        'src/**/types.ts',               // pure type/const modules
        'src/**/*.js',                   // hand-authored lit elements (optional)
      ],
      thresholds: { lines: 5, functions: 5, branches: 5, statements: 5 },  // see B4 for ratchet
    },
  },
});
```

**Notes**
- `css: false` is the direct replacement for `styleMock.js` — CSS/`.less`/Linaria virtual modules are ignored, not applied.
- **`transformIgnorePatterns` is not needed.** Vite transforms ESM in `node_modules` natively, so `@awesome.me/webawesome`, `lit*`, `uuid`, `nanoid` "just work". *Fallback if you hit a CJS/ESM interop error from Lit/WebAwesome:* add `test.server.deps.inline: [/@awesome\.me/, /^lit/, /lit-html/, /lit-element/]`.
- **The asset `fileMock` can be dropped.** Vite resolves `import x from './logo.png'` to a URL string by default — equivalent behaviour to the stub. Keep an alias only if a test asserts on the exact string `'test-file-stub'` (none do today).

## A3. `src/setupTests.ts` (extend the existing dead file & wire it in)

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'node:util';

// Was jest.config globals — needed by uuid/nanoid/react-router in some jsdom builds
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as any;
  globalThis.TextDecoder = TextDecoder as any;
}

// Custom-element form internals (WebAwesome / Lit) — jsdom lacks attachInternals
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function () {
    return {
      setValidity: () => {}, checkValidity: () => true, reportValidity: () => true,
      states: { add: () => {}, delete: () => {}, has: () => false },
      shadowRoot: null,
    } as any;
  };
}

// jsdom does not implement <dialog> modal methods (currently stubbed per-file in tests)
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
}

// MUI reads matchMedia on mount
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
```

## A4. Feature-by-feature mapping

| Jest feature | Where (today) | Vitest equivalent |
|---|---|---|
| `preset: 'ts-jest'` + `@swc/jest` transform | `jest.config.ts` L3–17 | **Deleted.** Vite + `@vitejs/plugin-react-swc` handle TS/JSX. |
| `testEnvironment: jsdom` | L18 | `test.environment: 'jsdom'` (needs `jsdom` dep — already present) |
| `testEnvironmentOptions.url` | L19–21 | `test.environmentOptions.jsdom.url: 'http://localhost/admin/ui'` |
| `transformIgnorePatterns` (WA/Lit/uuid/nanoid) | L22–24 | **Not needed** (Vite transforms node_modules). Fallback: `test.server.deps.inline`. |
| `moduleNameMapper` css/less → `styleMock` | L27 | `test.css: false` |
| `moduleNameMapper` assets → `fileMock` | L26 | **Not needed** (Vite returns asset URL strings). Optional `test.alias` if you need a fixed stub. |
| `globals: { TextEncoder, TextDecoder }` | L29 | Set in `setupFiles` (see A3) |
| `setupFilesAfterEnv` | *absent* | `test.setupFiles: ['./src/setupTests.ts']` (finally wires the existing file) |
| `--coverage` (Istanbul, lcov) | `package.json` L72 | `@vitest/coverage-v8`, `coverage.reporter: ['lcov', …]` |
| `jest-sonar-reporter` (test-execution xml) | L72, `jestSonar` block | `vitest-sonar-reporter` → `coverage/sonar-report.xml` |
| `jest.fn/mock/spyOn/useFakeTimers/clearAllMocks` | in tests | `vi.fn/mock/spyOn/useFakeTimers/clearAllMocks` (see A6) |

## A5. Exact `package.json` changes

**Scripts** (replace the single `test`):
```jsonc
"scripts": {
  "test": "cross-env CI=true vitest run --coverage",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "coverage": "vitest run --coverage"
}
```
> `CI=true` still works to force non-watch/non-TTY; `vitest run` is already single-shot, so `CI` is belt-and-braces (and drives the Sonar reporter branch in the config).

**Add (devDependencies):**
| Package | Why |
|---|---|
| `vitest` | runner (match the major that supports Vite 8 — currently the v4 line) |
| `@vitest/coverage-v8` | coverage provider (must match `vitest` version) |
| `@vitest/ui` | `test:ui` dashboard |
| `vitest-sonar-reporter` | emits `sonar-report.xml` (SonarQube test-execution report) |

`@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` **stay**.

**Remove (devDependencies + files):**
| Remove | Reason |
|---|---|
| `jest`, `@types/jest` | runner + types gone |
| `jest-environment-jsdom` | replaced by `test.environment` + `jsdom` |
| `@swc/jest`, `ts-jest` | redundant transforms; Vite handles it |
| `jest-sonar-reporter` | replaced by `vitest-sonar-reporter` |
| `jest.config.ts` (file) | replaced by `vitest.config.ts` |
| `babel.config.js` (file) | only fed jest's ts-jest/babel path — **verify** nothing else imports it before deleting |
| `jestSonar` block in `package.json` | reporter now configured in `vitest.config.ts` |
| `__mocks__/styleMock.js`, `__mocks__/fileMock.js` | replaced by `css:false` / Vite asset handling |
| `eslintConfig.extends: "react-app/jest"` | jest-specific lint preset; swap for `eslint-plugin-vitest` or drop |

> `@swc/core` may still be needed by `@vitejs/plugin-react-swc` transitively — leave it unless `npm ls @swc/core` shows it orphaned.
> Note: the `overrides` pin `"jsdom": "^29.0.1"` is unusual (jsdom has no v29 line); confirm it resolves during install — Vitest's jsdom environment needs a real jsdom present.

## A6. API differences that will bite (these appear in the current 4 tests)

| Jest | Vitest | Notes |
|---|---|---|
| `jest.fn()` | `vi.fn()` | global with `globals:true` |
| `jest.mock(p, factory)` | `vi.mock(p, factory)` | both hoisted; factory referencing outer vars must use `vi.hoisted(() => …)` |
| `jest.spyOn` | `vi.spyOn` | — |
| `jest.useFakeTimers()` / `advanceTimersByTime` | `vi.useFakeTimers()` / `vi.advanceTimersByTime` | `TabsAccess.test.tsx` uses these |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` (or `clearMocks:true` config) | — |
| `jest.requireMock(p)` | **no direct twin** → `vi.mocked(await import(p))` or just import at top (the top-level import already receives the mock) | `TabsAccess.test.tsx` L565, `EditView.test.tsx` L356 |
| `as jest.Mock` type cast | `as unknown as import('vitest').Mock` / `vi.mocked(x)` | `EditView.test.tsx` L183 `(console.error as jest.Mock)` will not compile |
| `@testing-library/jest-dom` import | same package/import — matchers auto-extend `expect` via setup | keep |

### ⚠️ The one that breaks silently — default-export component mocks
Jest's `jest.mock('./X', () => Fn)` (factory **returns the function directly**) relies on CJS interop mapping `module.exports` → `default`. **All four test files use this pattern** (e.g. `EditView.test.tsx` mocks `./ColumnDetails`, `TabsAccess.test.tsx` mocks `./FieldDndContainer`, `./AddModeDialog`, etc.). Under Vitest/ESM you **must** wrap in `{ default: … }`:

```ts
// Jest (today)
jest.mock('./ColumnDetails', () => {
  return function MockColumnDetails(props: any) { /* … */ };
});

// Vitest (required)
vi.mock('./ColumnDetails', () => ({
  default: function MockColumnDetails(props: any) { /* … */ },
}));
```
Named-export factories (`() => ({ fetchViews: vi.fn(), … })`) migrate unchanged apart from `jest.fn`→`vi.fn`.

## A7. TypeScript / globals

Add a small tsconfig for tests (or extend the existing `tsconfig.json`) so `vi`, `describe`, `expect` and the jest-dom matchers type-check:

```jsonc
// tsconfig.json → compilerOptions
"types": ["vitest/globals", "@testing-library/jest-dom"]
```
Alternatively add `/// <reference types="vitest/globals" />` at the top of a `src/vitest.d.ts`. Either way, remove reliance on `@types/jest`. Replace any `jest.Mock`/`jest.SpyInstance` type references with `import type { Mock } from 'vitest'`.

## A8. SonarQube expectation changes

Two distinct Sonar inputs — keep them separate:

| Sonar property | Fed by | File |
|---|---|---|
| `sonar.testExecutionReportPaths` | `vitest-sonar-reporter` (was `jest-sonar-reporter`) | `coverage/sonar-report.xml` |
| `sonar.javascript.lcov.reportPaths` | `@vitest/coverage-v8` `lcov` reporter (was Istanbul) | `coverage/lcov.info` |

The `jest-sonar-reporter` produced the **test-execution** report (via `--testResultsProcessor`); coverage was a *separate* Istanbul lcov artifact. Vitest keeps this split. No Sonar server change is required **if** the CI Sonar config already points at `coverage/sonar-report.xml` and `coverage/lcov.info` (no `sonar-project.properties` was found in-repo, so the mapping lives in CI — confirm those two paths there). The `jestSonar` block in `package.json` becomes dead config and should be removed.

## A9. Migration sequence (with rollback safety)

| # | Step | Effort |
|---|---|---|
| 1 | Add `vitest` deps **alongside** Jest; add `vitest.config.ts` + extend `src/setupTests.ts`; add `test:watch`/`test:ui` scripts but leave `test` on Jest. | S |
| 2 | Port the 4 tests: `jest.*`→`vi.*`, wrap default-export mocks in `{ default: … }`, fix the `as jest.Mock` cast, replace `jest.requireMock`. Run `vitest run` until green **while `npm test` still runs Jest** (both green = behaviour-parity proof). | M |
| 3 | Flip `test` script to Vitest; verify `coverage/lcov.info` + `coverage/sonar-report.xml` are produced in CI. | S |
| 4 | Remove Jest deps, `jest.config.ts`, `babel.config.js`, `__mocks__/*`, `jestSonar` block, `react-app/jest` lint. | S |
| **Rollback** | Until step 4, `git checkout package.json jest.config.ts` restores Jest instantly; the two runners coexist because they read different config files and the same `.test.tsx` files (mocks that still use `jest.*` simply won't run under Vitest and vice-versa — port one file at a time). | — |

---

# Part B — Coverage improvement strategy

## B1. Highest-value untested modules (prioritised)

Ranked by *payoff ÷ effort*: pure logic first (no DOM, no mocks, deterministic).

| Rank | Module(s) | ~LOC | Why high value | Test type | Effort |
|---|---|---|---|---|---|
| 1 | `src/utils/common.ts` | 112 | 8 pure fns: `fullEncode`, `insertCharacter`, `capitalizeFirst`, `stringExpiration`, `deepEqual`, `areArraysEqual`, `checkForResponse`, `AlertManager` | unit | S |
| 2 | `src/store/databases/scripts.ts` + `src/utils/mapper.ts` | 51 + 26 | pure index/finder + schema-grouping logic; `findScopeBySchema` already relied on by `TabsAccess.test` | unit | S |
| 3 | `src/store/*/reducer.ts` (16 plain reducers) | ~30–120 each | pure `(state, action) → state`; deterministic; ~1.1k LOC total excl. databases | unit | S–M |
| 4 | `src/utils/form.ts` | 12 | `isEmptyOrSpaces`, `verifyModeName` (regex edge cases) | unit | S |
| 5 | `src/store/databases/reducer.ts` | 627 | largest single reducer; high branch count | unit (table-driven) | M |
| 6 | `src/utils/token-emitter.ts` | 16 | `emitTokenEvent`/`waitForToken` promise resolution | unit (async) | S |
| 7 | `src/utils/api-retry.ts` | 171 | `apiRequestWithRetry`: 401→refresh→retry, error/`notify` paths | unit w/ mocks (`refreshToken`, `notify`, custom element) | M |
| 8 | Small presentational components (e.g. `Footer.tsx`, dialogs) | — | RTL smoke render | component | M |

Reducers and `utils/common.ts` alone are ~1.7k lines of pure code — testing them moves the global coverage number substantially for very little effort.

## B2. Phased plan

**Phase 1 — Pure logic (fastest ROI).** `src/utils/*` + all `src/store/*/reducer.ts`. No jsdom features needed beyond the runner. Table-driven tests per reducer (unknown action → same state; each `case` → expected transition).

**Phase 2 — Component tests (`@testing-library/react`).** Follow the *existing* pattern already proven in the repo: a local `createMockStore()` + `<Provider>` + `<MemoryRouter>` wrapper (see `TabsAccess.test.tsx` L142, `EditView.test.tsx` L95). Extract that wrapper into a shared `src/test-utils/renderWithProviders.tsx` to stop re-declaring it. Mock heavy children (Monaco, drag-and-drop, dialogs) as the current tests do.

**Phase 3 — Web-component (Lit/WebAwesome) tests.** The `lit-*` elements self-register via `customElements.define` in their `.js` modules (e.g. `src/components/lit-elements/lit-button-yes.js` L46), and are re-exported through `@lit/react`'s `createComponent` in `LitElements.tsx`. **Importing the component under test transitively registers the elements** — no manual registry setup needed (jsdom supports `customElements`). Assert on the light-DOM tags (`document.querySelector('lit-button-yes')`) exactly as `UnsavedChangesDialog.test.tsx` L30–32 does. Shadow-DOM internals have only partial jsdom support — assert on the wrapper/props, not shadow content.

### Example 1 — pure reducer (Phase 1)
```ts
// src/store/dialog/reducer.test.ts
import { describe, it, expect } from 'vitest';
import dialogReducer from './reducer';
import { TOGGLE_DELETE_DIALOG, TOGGLE_ERROR_DIALOG, INIT_STATE } from './types';

const initial = {
  deleteDialog: false, errorDialogOpen: false,
  errorDialogMessage: '', loading: false, resetViewDialog: false,
};

describe('dialogReducer', () => {
  it('returns initial state for an unknown action', () => {
    expect(dialogReducer(undefined, { type: '@@INIT' } as any)).toEqual(initial);
  });

  it('toggles the delete dialog', () => {
    const next = dialogReducer(initial, { type: TOGGLE_DELETE_DIALOG } as any);
    expect(next.deleteDialog).toBe(true);
  });

  it('sets error dialog message on TOGGLE_ERROR_DIALOG', () => {
    const next = dialogReducer(initial, { type: TOGGLE_ERROR_DIALOG, payload: 'boom' } as any);
    expect(next).toMatchObject({ errorDialogOpen: true, errorDialogMessage: 'boom' });
  });

  it('resets to initial on INIT_STATE', () => {
    const dirty = { ...initial, deleteDialog: true, loading: true };
    expect(dialogReducer(dirty, { type: INIT_STATE } as any)).toEqual(initial);
  });
});
```

### Example 2 — pure util (Phase 1)
```ts
// src/utils/common.test.ts
import { describe, it, expect } from 'vitest';
import { fullEncode, capitalizeFirst, deepEqual, stringExpiration } from './common';

describe('common utils', () => {
  it('fullEncode percent-encodes reserved chars', () => {
    expect(fullEncode('a/b&c')).toBe('a%2fb%26c');
    expect(fullEncode('plain')).toBe('plain');
  });

  it('capitalizeFirst upper-cases only the first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
  });

  it('deepEqual compares nested structures', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('stringExpiration formats ms as dd:hh:mm', () => {
    expect(stringExpiration(90 * 60 * 1000)).toBe('0:01:30');
  });
});
```

## B3. Realistic coverage thresholds (start low, ratchet)

Set a **global floor** that CI can never drop below, plus **higher per-directory gates** for the cheap-to-cover pure code. Bump the numbers as phases land — the point is a monotonic ratchet, not a big-bang target.

```ts
// vitest.config.ts → test.coverage.thresholds
thresholds: {
  // Global floor — start here on day one (near-zero today)
  lines: 5, functions: 5, branches: 5, statements: 5,
  autoUpdate: false,               // set true once to snapshot current %, then commit & set false

  // Per-directory gates ratcheted up as Phase 1 lands
  'src/utils/**':          { lines: 80, functions: 80, branches: 70, statements: 80 },
  'src/store/**/reducer.ts': { lines: 70, functions: 70, branches: 60, statements: 70 },
},
```

Suggested ratchet schedule:

| Milestone | Global lines | `utils/**` | `store/**/reducer` |
|---|---|---|---|
| Day 1 (config lands) | 5 % | — | — |
| After Phase 1 | 20 % | 80 % | 70 % |
| After Phase 2 | 35 % | 80 % | 70 % |
| Steady state | ratchet +5 %/PR to ~50 % | 85 % | 80 % |

Wire the same into SonarQube via a **Quality Gate on New Code** (e.g. "coverage on new code ≥ 80 %") so every PR is held to a high bar even while the legacy baseline is low. Sonar reads coverage from `coverage/lcov.info` (A8).

## B4. Pitfalls specific to this stack

| Pitfall | Symptom | Mitigation |
|---|---|---|
| **Monaco editor** (`@monaco-editor/react` in `FormsContainer.tsx`; loader copies to `public/monaco-editor-core`) | Hangs / "Cannot read AMD loader" in jsdom | `vi.mock('@monaco-editor/react', () => ({ default: () => <div data-testid="monaco" /> }))` and mock `@monaco-editor/loader`. Never render real Monaco in unit tests. |
| **Redux store helper** | Each test re-declares `createMockStore()` (`TabsAccess`/`EditView`) → drift | Extract `renderWithProviders()` into `src/test-utils/`; seed only the slices under test. |
| **react-router 7** | `useNavigate`/`useParams` throw without a router | Wrap in `<MemoryRouter initialEntries={[…]}>` (already the pattern in `TabsAccess.test.tsx` L227). |
| **MUI 9 / Linaria** | `matchMedia is not a function`; missing styles | `matchMedia` stub in `setupTests.ts` (A3); `css:false` means styles are absent — assert on roles/text/`data-testid`, never on computed CSS. Keep `wyw` in the Vitest plugin list so `styled` components stay real components. |
| **WebAwesome / Lit custom elements** | `attachInternals` undefined; `showModal` not a function; elements not upgraded | `setupTests.ts` polyfills `attachInternals` + `HTMLDialogElement` (A3). Registration happens automatically on import — assert on the light-DOM tag (`querySelector('lit-…')`), don't reach into shadow DOM. |
| **`beforeunload` / native events** | dirty-guard tests | Existing `EditView.test.tsx` pattern (dispatch a `cancelable` Event, spy `preventDefault`) ports to Vitest unchanged apart from `jest.fn`→`vi.fn`. |

---

## Master checklist

| # | Task | Effort |
|---|---|---|
| A1 | Add `vitest` + `@vitest/coverage-v8` + `@vitest/ui` + `vitest-sonar-reporter` (versions matched to Vite 8) | S |
| A2 | Create `vitest.config.ts` (§A2) | S |
| A3 | Extend & wire `src/setupTests.ts` as `setupFiles` (§A3) | S |
| A4 | Add `test:watch` / `test:ui` / `coverage` scripts; keep `test` on Jest for now | S |
| A5 | Port `App.test.tsx` — `jest.fn`→`vi.fn`, mock-fetch tweaks | S |
| A6 | Port `UnsavedChangesDialog.test.tsx` — `jest.fn`→`vi.fn`, move `showModal` stub to setup | S |
| A7 | Port `EditView.test.tsx` — wrap default-export mocks in `{ default: … }`, fix `as jest.Mock`, `jest.requireMock`→top-import/`vi.mocked` | M |
| A8 | Port `TabsAccess.test.tsx` — same, plus `vi.useFakeTimers` | M |
| A9 | Verify Vitest green **while Jest still green** (parity proof) | S |
| A10 | Flip `test` script to `vitest run --coverage`; confirm `coverage/lcov.info` + `coverage/sonar-report.xml` in CI | S |
| A11 | Remove Jest deps/files (§A5); update `tsconfig` types (§A7); confirm Sonar CI paths (§A8) | S |
| B1 | Add `src/test-utils/renderWithProviders.tsx` | S |
| B2 | Phase 1 tests: `utils/*` + all `store/*/reducer.ts` | M |
| B3 | Set global threshold floor + per-dir gates; run once with `autoUpdate` to snapshot baseline | S |
| B4 | Phase 2 component smoke tests (shared render helper, Monaco mocked) | M |
| B5 | Phase 3 Lit/WA custom-element tests | M |
| B6 | Add Sonar "coverage on new code ≥ 80 %" quality gate; ratchet global % per PR | S |

_For unrelated code-quality findings (dead code, the commented-out `notify` block in `api-retry.ts`, the unused `jsdom@^29` override, etc.), see `reports/00-code-quality.md`._
