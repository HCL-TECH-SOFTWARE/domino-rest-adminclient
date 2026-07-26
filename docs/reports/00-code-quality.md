# Code Quality & Cross-Cutting Risk Report

**Project:** `@hcl-software/domino-rest-adminclient` (HCL Domino REST API Admin UI)
**Stack:** React 19 SPA · React-Redux + classic thunks · react-router v7 · MUI 9 · Linaria · WebAwesome 3.10 + 26 TypeScript Lit elements · Vite 8 · **Vitest 4** · TypeScript 7 · oxlint · Node ≥ 24
**Scope:** Cross-cutting quality, security, type-safety, and maintainability. Does **not** cover the deep-dives owned by the sibling reports — Vitest/coverage (report 01), React→Lit/WA component migration (02), wa-page/design-tokens (03), remove-react (04), Dependabot triage (05) — which are referenced where relevant.

> **Refreshed 2026-07-27** against branch `new_code` @ `7594672`. Originally written
> 2026-07-24. Every number below was re-measured on this branch; every P-item carries
> a verified status.

---

## What changed since 2026-07-24

| Item | Then | Now | Where |
|---|---|---|---|
| **P0-3 lint pipeline** | ESLint referenced but not installed; CI never linted | ✅ **DONE** — `oxlint` 1.75 + `.oxlintrc.json`, `npm run lint` clean, `pr_check` runs lint **before** build/test | `0349a71`, `0f904af` |
| **P1-8 weakened rules** | `no-unused-vars: off`; `noUnusedLocals/Parameters: false` | ✅ **DONE** — oxlint `correctness: error` + `no-unused-vars: error` (`^_` convention); tsconfig flags flipped to `true` | `5822ca7`, `bc2c262` |
| **P2-1 dead CRA/Webpack config** | 6 `config/*.js`, `babel.config.js`, `jest.config.ts`, `__mocks__/`, `public/index.html`, `proxy`/`homepage`/`eslintConfig` fields | ✅ **Mostly done** — all removed, plus `Jenkinsfile`. ⚠️ `src/react-app-env.d.ts` **still present** and unreferenced | `2d35bff`, `4d7ab3b`, `0349a71` |
| **P2-5 duplicate Jest config** | `jest.config.ts` + `config/jest/*` | ✅ **DONE** — Jest gone entirely (report 01) | `f7907a3`, `4d7ab3b` |
| **P1-7 untyped Lit components** | ~27 plain-JS Lit elements outside TS | ✅ **DONE** — 26 elements are TypeScript with `lit` decorators, on a shared `KeepElement` base, renamed `lit-*` → `keep-*` | PRs #652–#659, `8ea711b` |
| **P0-5 silent `catch {}`** | 3 | 🟡 **Improved** — 1 remaining (`FormsContainer.tsx:778`); `renewToken`'s `JSON.parse` now has a real catch → `removeAuth()` | — |
| **P2-8 mixed deps** | `@mui/lab` beta present | 🟡 **Improved** — `@mui/lab` removed; `@emotion/*` retained as MUI peer only | `0349a71` |
| **Test coverage** | 4 tests, ~0 % | ✅ **509 tests / 53 files**, ~27 % lines — see report 01 | `f7907a3` + PRs #652–#659 |
| **P0-2 CSP** | Wide-open but **active** | 🔴 **REGRESSED** — the dev-server CSP header key was renamed to `disabledContent-Security-Policy`, so **no CSP is sent at all** | `9ff04b1` |
| **`npm test`** | Green (4 suites / 34 tests) | 🔴 **RED** — 4 suites fail to load; coverage ratchet breached. See [P0-7](#p0-7) / [P0-8](#p0-8) | `7594672` |

Everything else below (token storage, `as any` sprawl, legacy Redux, God files,
`console.*`, no i18n, no code-splitting) is **unchanged and still open**.

---

## Executive Summary

- 🔴 **`npm run test` currently fails on `new_code`, and `pr_check` runs it.** The last
  commit added `keep-monaco-editor.ts`, whose top-level `import * as monaco from
  'monaco-editor'` executes `document.queryCommandSupported` — absent in jsdom. Four
  React component suites cannot even load. **One line in `test/setupTests.ts` fixes it**
  (verified: with the polyfill, 53/53 files and 509/509 tests pass).
- 🔴 **CSP is now switched off, not merely permissive.** `vite.config.mts` still contains
  the whole policy, but under the key `'disabledContent-Security-Policy'`, which is not a
  header browsers act on. The dev server sends no CSP. This is *worse* than the wide-open
  policy the previous revision of this report criticised, and it interacts with the
  unchanged P0-1 token storage.
- ✅ **Static analysis is alive.** `oxlint` runs clean over `src` and `test`, gates
  `pr_check` before build and test, and `noUnusedLocals`/`noUnusedParameters` are on.
  This closes the single largest process gap in the original report.
- ✅ **The Lit layer is typed.** All 26 custom elements are TypeScript with decorators on
  a shared `KeepElement` base that standardises the outbound `CustomEvent` contract. The
  React↔Lit boundary is no longer an `any` hole.
- **`strict: true` is still quietly undermined.** 154 `as any` casts, **95** of them
  `dispatch(someThunk() as any)` — unchanged in shape and slightly up in count.
- **Redux is still high-boilerplate legacy style.** `@reduxjs/toolkit` is installed but
  only `configureStore` is used; 17 hand-written `switch`-on-`action.type` reducers;
  **zero** memoized selectors across 207 `useSelector` sites.
- **A 2,882-line God action file** (`src/store/databases/action.ts`) still dominates the
  store; 600–1,000-line God components follow.
- **A `Logger` facade now exists** (`src/services/log-service.ts`) — but 76 direct
  `console.*` calls remain outside it, so the facade is currently aspiration, not policy.
- **Still no i18n and no code-splitting.** Quantified this round: the production build
  emits a **6.94 MB (1.88 MB gzip) single entry chunk**.
- **`npm audit` reports 10 high-severity findings** — all build/test-time except the
  `react-router` cluster. Distinct from the 9 triaged in report 05, which are fixed.

**Overall remediation effort: ~M–L.** The two red items (P0-7, P0-8) are S and should be
fixed before anything else. The Redux modernization and God-file breakup remain the
L-sized long tail.

---

## Prioritized Checklist

Status legend: 🔴 open & urgent · 🟡 open, partially addressed · ✅ done · ➖ superseded

### P0 — Correctness & Security

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| <a id="p0-7"></a>P0-7 | 🔴 **NEW** | **Test suite fails to load** — `document.queryCommandSupported is not a function` | `src/components/keep-elements/keep-monaco-editor.ts:11` → `KeepElements.tsx:26`; breaks `test/App.test.tsx`, `test/components/access/TabsAccess.test.tsx`, `.../forms/EditView.test.tsx`, `.../dialogs/UnsavedChangesDialog.test.tsx` | `KeepElements.tsx` now imports the Monaco element, so *every* consumer of the React bridge drags the full `monaco-editor` ESM bundle into jsdom at import time. `pr_check` runs `npm run test`, so all PRs fail. | Add to `test/setupTests.ts`: `if (!(document as any).queryCommandSupported) { (document as any).queryCommandSupported = () => false; (document as any).execCommand = () => false; }`. **Verified**: 53 files / 509 tests then pass. Longer term, lazy-import Monaco inside `firstUpdated()` so the bridge stays cheap. | **S** |
| <a id="p0-8"></a>P0-8 | 🔴 **NEW** | **Coverage ratchet breached** — `src/components/keep-elements/**` at 60.3 % lines vs. the 70 % gate (branches 46.9 % vs 50 %) | `vitest.config.ts` thresholds; `keep-monaco-editor.ts` (538 lines, **no test file**) | The per-directory gate that the 26 converted elements earned is now failing because one untested element joined the directory. Even with P0-7 fixed, `npm test` exits non-zero. | Add `test/components/keep-elements/keep-monaco-editor.test.ts` (mount, `value`/`language`/`theme` properties, `change` event, dispose on disconnect), **or** exclude the file from coverage the way `keep-source.ts` already is — with a comment justifying it. Prefer the test. | **S–M** |
| P0-2 | 🔴 **REGRESSED** | **CSP is not sent at all** — the header key is `disabledContent-Security-Policy` | `vite.config.mts:29` | The whole policy string is inert. Combined with the unchanged P0-1 (`localStorage` JWTs), the dev server offers zero script/connect containment. The *production* server policy is out of this repo — confirm it separately. | Restore the key to `Content-Security-Policy`, then tighten as originally specified: drop wildcard `default-src`/`connect-src *`, drop `script-src 'unsafe-inline'`, and reconcile the WebAwesome host (see P0-9). Coordinate with report 03 §5 — `wa-page` needs `style-src-attr` loosened, so land both together. | M |
| P0-1 | 🟡 unchanged | **Session tokens in `localStorage`** (plaintext access + refresh JWT) | `src/components/login/LoginPage.tsx:258,314`; `src/components/login/CallbackPage.tsx:35-36`; `src/store/account/action.ts`; `src/App.tsx:40`; 50 `localStorage`/`sessionStorage` refs | `localStorage` is readable by any JS on the origin; a single XSS = full session + refresh-token theft. Refresh-token storage is especially damaging. Amplified now that CSP is off (P0-2). | Move to httpOnly cookies if the API allows; otherwise keep tokens in memory + short-lived, drop `refresh_token` from `localStorage`, and restore CSP. | M |
| P0-4 | 🟡 partial | **Unchecked fetch → silent auth failure** — `await response.json()` with no `.ok` check | `src/store/account/action.ts` (`renewToken`) | The `JSON.parse(token)` guard was added (good), but the `/auth/extend` response is still parsed blind. A 4xx/5xx or non-JSON body dispatches a garbage token instead of a clean re-login. | Route through `checkForResponse` (`src/utils/common.ts`) and handle `!ok` by dispatching `removeAuth()`. | S |
| P0-5 | 🟡 improved | **Silent `catch {}`** | `src/components/forms/FormsContainer.tsx:778` (1 remaining, was 3) | Swallowed errors hide real failures and complicate debugging. | Log via `Logger` or narrow the catch to the expected case with a comment. | S |
| P0-6 | 🟡 partial | **`console.*` shipped to prod** — 89 statements (54 `console.log`), incl. login logging | Heaviest: `store/databases/action.ts` (17), `store/{people,groups,peopleSelector}/action.ts` (8 each), `forms/FormsContainer.tsx` (7), `login/LoginPage.tsx` (3) | Noise, minor info leakage (auth flow state). **A `Logger` facade now exists** (`src/services/log-service.ts`, with `getLogger(namespace)`) and its own docstring says *"Production code must not call `console.*` directly"* — but only `keep-monaco-editor.ts` uses it. | Migrate the 76 direct calls to `Logger`/`getLogger`, then enable oxlint's `no-console` so the rule is enforced rather than documented. | S–M |
| <a id="p0-9"></a>P0-9 | 🟡 **NEW** | **WebAwesome base path pinned to a version that is no longer installed** | `src/index.tsx:18` sets `setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/…')`; `package.json` has `@awesome.me/webawesome@^3.10.0` (3.10.0 installed) | Runtime icon/asset loading resolves against a **3.6.0** CDN tree while the bundled components are 3.10.0. Silent skew today; a removed 3.6.0 path is a hard failure. | Derive the base path from the installed version, or self-host the WA assets (also the cleanest CSP answer — see report 03 §5). | S |
| <a id="p0-10"></a>P0-10 | 🟡 **NEW** | **Runtime code imports a devDependency** — `prettier` | `src/components/keep-elements/keep-monaco-editor.ts:16-18` imports `prettier/standalone` + 2 plugins; `prettier` is in **devDependencies** | Works today only because CI installs devDeps. Any `npm ci --omit=dev` (or a consumer building from the published package) breaks the build. Prettier's standalone bundle is also large — it lands in the 6.94 MB entry chunk. | Move `prettier` to `dependencies` **or** drop the in-editor formatting; if kept, `import()` it lazily so it is code-split out of the entry chunk. | S |

### P1 — Maintainability

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P1-1 | 🟡 unchanged | **Untyped thunk dispatch → 95 `dispatch(… as any)`** (of 154 total `as any`) | store slices consumed everywhere; heaviest in `src/components/forms` and `access` | Each cast erases type-checking of action payloads at the call site; `strict` gives false confidence. | Export typed `AppDispatch`/`useAppDispatch` from the store (RTK `ThunkDispatch`); replace the casts. Doing this **before** report 04's `StoreController` migration makes that swap mechanical. | M |
| P1-2 | 🟡 unchanged | **RTK installed, classic Redux used** — 17 `switch(action.type)` reducers + string action-type constants | `src/store/*/reducer.ts`, `src/store/*/types.ts`; `src/store/index.ts`, `src/index.tsx` | High boilerplate, manual `immer produce`, easy to drift; the toolkit that eliminates it is already a dependency. **Mitigating factor: the reducers now have ≥95 % test coverage**, so a `createSlice` migration is far safer than it was. | Migrate slices to `createSlice`/`createAsyncThunk` incrementally, smallest first, leaning on the reducer tests as the parity net. Coordinate with report 04. | L |
| P1-3 | 🟡 unchanged | **God action file — 2,882 lines** | `src/store/databases/action.ts` | Single-file bottleneck for merges, review, comprehension; mixes schemas, scopes, forms, views, agents, formula results. | Split by concern into a `databases/` sub-folder of thunks. | L |
| P1-4 | 🟡 unchanged | **Oversized components** | `access/TabsAccess.tsx` (1,007), `styles/CommonStyles.tsx` (936), `forms/FormsContainer.tsx` (830), `access/ModeCompare.tsx` (760), `forms/DetailsSection.tsx` (690), `login/LoginPage.tsx` (657), `forms/EditView.tsx` (618) | Hard to test/reason about; concentrates state + view + side effects. | Extract sub-components and hooks; `CommonStyles.tsx` should be split per feature (report 03). | L |
| P1-5 | 🟡 unchanged | **No memoized selectors** — `createSelector` used 0×, 207 inline `useSelector` sites | across components | Inline object/array selectors return new references each render → avoidable re-renders. | Introduce RTK `createSelector` for derived/object-returning selectors. | M |
| P1-6 | 🟡 unchanged | **`@ts-ignore` masking a real type gap** | `src/store/databases/action.ts` (1 occurrence; `@ts-expect-error`/`@ts-nocheck`: 0) | Hides a type error rather than fixing it. | Replace with `@ts-expect-error` + reason, or fix the underlying type. | S |
| P1-7 | ✅ **DONE** | ~~27 Lit components authored in plain JS~~ | now `src/components/keep-elements/*.ts` | All 26 elements are TypeScript with `@customElement`/`@property`/`@state`/`@query`, extending a shared `KeepElement` base with a typed `emit()` helper. SWC is configured with `tsDecorators` + `useDefineForClassFields:false` in **both** `vite.config.mts` and `vitest.config.ts` — a required pairing (decorated class fields would otherwise shadow Lit's reactive accessors). | — | — |
| P1-8 | ✅ **DONE** | ~~ESLint rules actively weakened~~ | `.oxlintrc.json`, `tsconfig.json` | `correctness: error`, `no-unused-vars: error` with the `^_` ignore convention; `noUnusedLocals` and `noUnusedParameters` are `true`. Lint is clean and gates CI. | — | — |
| <a id="p1-9"></a>P1-9 | 🟡 **NEW** | **`tsconfig.json` includes `test/` but the build config does not distinguish it** | `tsconfig.json` `include: ["src","test","vite.config.mts","package.json"]`, `rootDir: "."` | `npm run build` (`tsc -b && vite build`) type-checks test files as part of the production build, coupling build success to test-only types. Works today; surprises later. | Split into `tsconfig.json` (src) + `tsconfig.test.json` referencing it, or add a project reference. | S |

### P2 — Nice-to-have

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P2-1 | 🟡 nearly done | **Dead CRA leftovers** | ✅ removed: `config/**` (6 files), `babel.config.js`, `jest.config.ts`, `__mocks__/**`, `public/index.html`, `Jenkinsfile`, `package.json` `proxy`/`homepage`/`eslintConfig`/`jestSonar`. ⚠️ **still present:** `src/react-app-env.d.ts` | The remaining file declares CRA `process.env` types plus asset-module shims; `src/vite-env.d.ts` now provides the Vite equivalents. Nothing references it. | Delete `src/react-app-env.d.ts` and verify `tsc -b` stays green (the `*.svg`/`*.png` shims may need to move to `vite-env.d.ts`). | S |
| P2-2 | 🟡 unchanged | **No i18n** — all strings hardcoded English | throughout components | Blocks localization. | If localization is a goal, introduce a library; otherwise document as intentional. | L (if pursued) |
| P2-3 | 🔴 worse | **No route/code splitting** — 0 `React.lazy`/`Suspense` | `src/App.tsx`, `src/Views.tsx` | **Now quantified:** `npm run build` emits `dist/admin/assets/index-*.js` at **6.94 MB (1.88 MB gzip)** in one chunk, plus ~60 Monaco language chunks. Monaco, Prettier, MUI, MUI X and WebAwesome all load eagerly on first paint. | Lazy-load the Monaco-heavy and rarely-used routes; `import()` Prettier (P0-10). Overlaps report 04's bundle work. | M |
| P2-4 | 🟡 unchanged | **A11y gaps** | across `.tsx` | Screen-reader/keyboard gaps. | Add `alt` text; oxlint has no `jsx-a11y` equivalent today — consider `eslint-plugin-jsx-a11y` as a second, non-gating pass, or defer until the WA migration (WA components ship their own a11y). | M |
| P2-5 | ✅ **DONE** | ~~Duplicate Jest config~~ | — | Jest is gone; one `vitest.config.ts` is the single source of truth. See report 01. | — | — |
| P2-6 | 🟡 unchanged | **Store→component import (layering leak)** | `src/store/databases/action.ts:74` imports `convert2FieldType`, `convertDesignType2Format` from `components/access/functions` | Inverts the intended dependency direction; risks a cycle. | Move those two helpers into `src/utils`. | S |
| P2-7 | 🟡 unchanged | **Stale `TODO`s** (5) incl. disabled features | `sidenav/Routes.ts` & `SideNav.tsx` (Mail/Dashboard disabled, LABS-1214); `database/QuickConfigView.tsx`; `forms/FormsContainer.tsx`; `store/applications/action.ts` (warn on secret overwrite); plus a new one in `index.html` ("simplify after wa transition to wa-dark") | Disabled routes and an un-implemented secret-overwrite confirmation. | Track in the issue tracker; remove commented-out code. | S |
| P2-8 | 🟡 improved | **Mixed / redundant dependencies** | `package.json` | `@mui/lab` **removed** ✅. `@emotion/react` + `@emotion/styled` retained (MUI peer; 0 direct imports). New arrivals worth watching: `typescript@7.0.2`, `immer@11.1.15`, `monaco-editor` promoted to a direct dependency, `@fortawesome/fontawesome-free@7.3.1` + two `@fontsource-variable` fonts, `prettier` used at runtime (P0-10). | Keep `@emotion` only as the MUI peer; converge styling on Linaria + WA tokens (report 03). | M |
| <a id="p2-9"></a>P2-9 | 🟡 **NEW** | **`postinstall` disabled while Monaco delivery changed** | `package.json` script renamed `postinstall` → `disabledpostinstall` (`7594672`) | The old step copied `monaco-editor/min/vs` into `public/monaco-editor-core` for the AMD loader. The new `keep-monaco-editor` bundles Monaco as ESM instead, so the copy is genuinely obsolete — **but `FormsContainer.tsx` still uses `@monaco-editor/react` + `@monaco-editor/loader`**, which is the consumer that needed it. Verify the running editor still resolves its assets. | Either finish the swap (report 02 §5.3 / report 04 §5) and delete the dead script + `@monaco-editor/*` deps, or restore the copy step until the swap lands. | S |
| <a id="p2-10"></a>P2-10 | 🟡 **NEW** | **10 high-severity `npm audit` findings** | `@wyw-in-js/*` → `minimatch` → `brace-expansion` (build-time DoS); `react-router` ≥7.12.0 (RSC-mode CSRF bypass) | Build-time chain is not browser-reachable; the `react-router` advisory is runtime but this app does not use RSC mode. Distinct from the 9 alerts triaged and fixed in report 05. | Bump `@wyw-in-js/vite` when a patched `minimatch` lands; track the `react-router` advisory — report 04 removes `react-router-dom` entirely, so a bump may be throwaway. See report 05. | S–M |

---

## Metrics

Measured on `new_code` @ `7594672` with `grep -r` over `src/` (occurrence counts unless
stated). The "2026-07-24" column is the previous revision of this report, for trend only —
grep methods were not identical, so treat small deltas as noise.

| Metric | 2026-07-24 | **Today** |
|--------|---|---|
| Source files | 135 `.tsx`, 75 `.ts`, ~27 plain-JS Lit | **130 `.tsx`, 103 `.ts`, 3 `.d.ts`, 1 `.js`** |
| Total source LOC (ts/tsx/js) | ~38,700 | **~38,100** |
| Test files / tests | **4** / 34 | **53** / **509** (see report 01) |
| `as any` casts | 151 (97 `dispatch(thunk() as any)`) | **154** (95 dispatch) |
| `@ts-ignore` | 1 | **1** (`@ts-expect-error`/`@ts-nocheck`: 0) |
| `console.*` statements | 80 (56 `console.log`) | **89** (54 `console.log`) — 13 of them *inside* `log-service.ts` |
| Empty / silent `catch {}` | 3 | **1** |
| `localStorage`/`sessionStorage` refs | 40 | **50** |
| `dangerouslySetInnerHTML` | 0 | **0** (good) |
| Hardcoded secrets | none | **none** — API URLs relative/proxied (`src/config.dev.ts`) |
| `TODO/FIXME/HACK/XXX` | 5 | **5** |
| `createSelector` | 0 (of 224 `useSelector`) | **0** (of **207** `useSelector`, 116 `useDispatch`) |
| `React.lazy`/`Suspense` | 0 | **0** |
| Lint | not installed, not in CI | **oxlint 1.75, clean, gates `pr_check`** ✅ |
| Production entry chunk | not measured | **6.94 MB / 1.88 MB gzip** |
| `npm audit` | 9 (report 05, now fixed) | **10 high** (new cluster, P2-10) |

**Largest files (LOC):** `store/databases/action.ts` 2,882 · `components/access/TabsAccess.tsx` 1,007 · `styles/CommonStyles.tsx` 936 · `components/forms/FormsContainer.tsx` 830 · `store/databases/types.ts` 764 · `components/keep-elements/keep-source.ts` 764 · `components/access/ModeCompare.tsx` 760 · `components/forms/DetailsSection.tsx` 690 · `components/login/LoginPage.tsx` 657 · `store/databases/reducer.ts` 625 · `components/forms/EditView.tsx` 618 · `components/keep-elements/keep-monaco-editor.ts` 538.

---

## Positives (worth preserving)

- **Lint and type strictness are now enforced, not aspirational.** `oxlint` clean over
  `src` + `test`, `correctness: error`, `noUnusedLocals`/`noUnusedParameters` on, and
  `pr_check` runs `lint → build → test` on Node 24.
- **A real regression net exists.** 509 tests, ≥95 % coverage on every store reducer,
  ~99 % on `src/utils`, and per-directory coverage gates in `vitest.config.ts` that fail
  CI on regression — the gates are doing their job right now (P0-8).
- `strict: true`, `isolatedModules`, `noFallthroughCasesInSwitch`,
  `forceConsistentCasingInFileNames` all on — a solid TS baseline that the `as any`
  sprawl (P1-1) undercuts rather than a weak config.
- **The Lit layer is a genuine asset**: 26 typed elements, one shared base class, one
  `@lit/react` adapter file, and a documented event contract. Report 04's "delete the
  bridge" step gets easier every time an element lands.
- No `dangerouslySetInnerHTML`; no hardcoded secrets; API base URLs relative and proxied.
- Dependency-risk mitigation in place via `overrides` and Dependabot (report 05).
- Store cleanly sliced by domain (17 well-separated feature folders) even though the
  reducer *style* is legacy — and now well covered by tests.

---

## Cross-references (not duplicated here)

- **Report 01** — Vitest/coverage: the migration is complete; the coverage ratchet, the
  P0-7 load failure, and the P0-8 gate breach are detailed there.
- **Report 02** — the `keep-*` element inventory (P1-7, now done) and the remaining
  MUI→WebAwesome component migration.
- **Report 03** — `CommonStyles.tsx` breakup (P1-4), styling-system convergence (P2-8),
  the icon system, and the CSP work that must land with P0-2.
- **Report 04** — Redux modernization (P1-2), bundle/code-splitting (P2-3), and the
  Monaco swap that resolves P2-9.
- **Report 05** — Dependabot triage; P2-10's new cluster is tracked there.
