# Code Quality & Cross-Cutting Risk Report

**Project:** `@hcl-software/domino-rest-adminclient` (HCL Domino REST API Admin UI)
**Stack:** React 19 SPA · React-Redux + classic thunks · react-router v7 · MUI 9 + Lab beta · Linaria · WebAwesome 3.6 + ~27 hand-written Lit components · Vite 8 · Jest 30
**Scope:** Cross-cutting quality, security, type-safety, and maintainability. Does **not** cover the deep-dives owned by the sibling reports — Vitest/coverage (report 01), React→Lit/WA component migration, wa-page/design-tokens, and remove-react — which are referenced where relevant.

---

## Executive Summary

- **The lint pipeline is dead.** The `lint` script invokes `eslint` with the CRA presets `react-app` / `react-app/jest`, but **ESLint is not installed** (absent from `package.json`, no binary in `node_modules`) and there is **no flat config**. CI never runs lint anyway. Static analysis is effectively off.
- **Top security exposure is the token-storage + CSP combination.** JWT access tokens and refresh tokens are persisted as plaintext in `localStorage` (40 references) and the dev CSP is wide open (`default-src … *`, `connect-src 'self' data: *`, `script-src 'unsafe-inline'`). Any injected script can exfiltrate a live session.
- **`strict: true` is quietly undermined.** 151 `as any` casts, **97** of them the pattern `dispatch(someThunk() as any)` — a systemic hole caused by the store's dispatch type not knowing about thunks.
- **Redux is high-boilerplate legacy style.** `@reduxjs/toolkit` is installed but only `configureStore` is used; state lives in **17 hand-written `switch`-on-`action.type` reducers** with string-constant action types (62 in the databases slice alone), and **zero memoized selectors** (`createSelector` used 0 times across 224 `useSelector` call sites).
- **A 2,953-line God action file** (`src/store/databases/action.ts`) dominates the store; several 700–1,000-line components follow.
- **Silent failures exist in the auth path.** `renewToken` parses a fetch response with no `.ok`/try-catch check; there are `catch {}` blocks in the account/profile flow; 80 `console.*` statements (56 `console.log`) ship to production, including login success/failure logging.
- **CRA/Webpack dead weight remains** after the Vite migration: `config/webpack.config.js` (29 KB), `webpackDevServer.config.js`, `config/paths.js`, `config/env.js`, `src/react-app-env.d.ts`, and package `proxy`/`homepage`/`react-app` fields — none referenced by the Vite build.
- **No i18n and no code-splitting.** All UI strings are hardcoded English; there are zero `React.lazy`/`Suspense` routes, so Monaco, MUI, MUI X, and WebAwesome all load eagerly.

**Overall remediation effort: ~M–L.** The P0 security/lint items are individually S–M and high-value; the Redux modernization and God-file breakup are the L-sized long tail.

---

## Prioritized Checklist

### P0 — Correctness & Security

| # | What | Where | Why it matters | Fix | Effort |
|---|------|-------|----------------|-----|--------|
| P0-1 | **Session tokens in `localStorage`** (plaintext access + refresh JWT) | `src/components/login/LoginPage.tsx:259,315`; `src/components/login/CallbackPage.tsx:36-37`; `src/store/account/action.ts:124,147,309`; `src/App.tsx:40` | `localStorage` is readable by any JS on the origin; a single XSS = full session + refresh-token theft. Refresh token being stored is especially damaging. | Move to httpOnly cookies if the API allows; otherwise at minimum keep tokens in memory + short-lived, drop the refresh token from `localStorage`, and tighten CSP (P0-2). | M |
| P0-2 | **Permissive CSP** — `default-src 'self' data: gap: 'unsafe-inline' *`, `connect-src 'self' data: *`, `script-src 'unsafe-inline'` | `vite.config.mts:16-26` | Wildcard `default-src`/`connect-src *` plus `'unsafe-inline'` scripts defeats the purpose of CSP and amplifies P0-1 (exfil to any host). `data:` in `connect-src`/`default-src` is unusual. Note this is the **dev-server** header; confirm the production server sets an equally strict-or-stricter policy. | Remove wildcards; enumerate the WebAwesome CDN + API origins explicitly; drop `'unsafe-inline'` for `script-src` (use nonces/hashes); restrict `connect-src` to the API host. | M |
| P0-3 | **ESLint absent but referenced** — no linter installed, CRA presets missing, no flat config | `package.json` `lint` script + `eslintConfig`; CI `.github/workflows/pr_check.yml`, `push-snapshot.yml` (run `build`+`test`, never `lint`) | `npm run lint` fails immediately; there is *no* enforced static analysis catching the `any`/unused/hook issues below. | Add ESLint 9 flat config with `typescript-eslint` + `eslint-plugin-react-hooks` + `jsx-a11y`; install deps; add a `lint` CI step. | M |
| P0-4 | **Unchecked fetch → silent auth failure** — `await response.json()` with no `.ok`/try-catch | `src/store/account/action.ts:105-125` (`renewToken`) | On a 4xx/5xx or non-JSON body, `renewToken` throws inside a thunk with no catch, or dispatches a garbage token; token-refresh failures surface as broken app state rather than a clean re-login. | Route through the existing `checkForResponse` helper (`src/utils/common.ts:85`) and handle `!ok` by dispatching `removeAuth()`. | S |
| P0-5 | **Silent `catch {}` blocks** in auth/profile paths | `src/store/account/action.ts:86,100`; `src/components/sidenav/ProfileMenu.tsx:143` | Swallowed errors hide real failures (corrupt token, network) and complicate debugging. | Log/surface via the existing notify mechanism, or narrow the catch to the expected case with a comment. | S |
| P0-6 | **`console.*` shipped to prod** — 80 statements (56 `console.log`), incl. login logging | e.g. `src/store/account/action.ts:145,155`; broad across `src/store/**` and components | Noise, minor info leakage (auth flow state), and no structured logging. | Remove or gate behind a debug flag; the added ESLint config can enforce `no-console`. | S |

### P1 — Maintainability

| # | What | Where | Why it matters | Fix | Effort |
|---|------|-------|----------------|-----|--------|
| P1-1 | **Untyped thunk dispatch → 97 `dispatch(… as any)`** (of 151 total `as any`) | store slices consumed everywhere; e.g. `src/App.tsx:62`; heaviest in `src/components/forms` (31), `access` (22) | Each cast erases type-checking of action payloads at the call site; `strict` gives false confidence. | Export typed `AppDispatch`/`useAppDispatch` hooks from the store (RTK `ThunkDispatch`); replace the casts. | M |
| P1-2 | **RTK installed, classic Redux used** — 17 `switch(action.type)` reducers + string action-type constants (62 in databases `types.ts`) | `src/store/*/reducer.ts`, `src/store/*/types.ts`; wiring `src/store/index.ts:26` (`combineReducers`) + `src/index.tsx:21` (`configureStore`) | High boilerplate, manual `immer produce`, easy to drift; the toolkit that eliminates all of it is already a dependency. | Migrate slices to `createSlice`/`createAsyncThunk` incrementally (start with the smallest slices). Coordinate with the **remove-react** report. | L |
| P1-3 | **God action file — 2,953 lines** | `src/store/databases/action.ts` (60 exported actions/thunks) | Single-file bottleneck for merges, review, and comprehension; mixes schemas, scopes, forms, views, agents, formula results. | Split by concern (schemas / scopes / forms / views / agents) into a `databases/` sub-folder of thunks. | L |
| P1-4 | **Oversized components** (God components) | `src/components/access/TabsAccess.tsx` (1,022), `src/styles/CommonStyles.tsx` (936), `src/components/forms/FormsContainer.tsx` (855), `src/components/access/ModeCompare.tsx` (759), `src/components/forms/DetailsSection.tsx` (738), `src/components/login/LoginPage.tsx` (657) | Hard to test/reason about; concentrates state + view + side effects. | Extract sub-components and hooks; `CommonStyles.tsx` is a 936-line style grab-bag that should be split per feature (see design-tokens report). | L |
| P1-5 | **No memoized selectors** — `createSelector` used 0×, 224 inline `useSelector` selectors | across components | Inline object/array selectors return new references each render → avoidable re-renders as the store grows. | Introduce `reselect`/RTK `createSelector` for derived/object-returning selectors. | M |
| P1-6 | **`@ts-ignore` masking a real type gap** | `src/store/databases/action.ts:2854` | Hides a type error rather than fixing it; the one such suppression in the codebase. | Replace with `@ts-expect-error` + reason, or fix the underlying type. | S |
| P1-7 | **~27 Lit components authored in plain JS (no types)** | `src/components/lit-elements/*.js` (25 files, e.g. `lit-source.js` 752 lines), wrapped in `LitElements.tsx` | These sit outside TypeScript checking entirely; props crossing the React↔Lit boundary are unverified. Also import dev config (`config.dev`) into shipped components. | Convert to `.ts` with `@customElement`/typed properties. Owned in detail by the **React→Lit/WA** report — flagged here as a cross-cutting type-safety gap. | L |
| P1-8 | **ESLint rules actively weakened even if it ran** — `no-unused-vars` and `@typescript-eslint/no-unused-vars` set to `"off"`, while `lint` uses `--max-warnings 0`; `tsconfig` has `noUnusedLocals/Parameters: false` (with a `// TODO: set true` note) | `package.json` `eslintConfig`; `tsconfig.json` | Dead code and unused imports accumulate with nothing to catch them. | Turn unused-vars back on (warn), then flip the tsconfig flags once clean. | S |

### P2 — Nice-to-have

| # | What | Where | Why it matters | Fix | Effort |
|---|------|-------|----------------|-----|--------|
| P2-1 | **Dead CRA/Webpack config** after Vite migration (nothing references it) | `config/webpack.config.js` (29 KB), `config/webpackDevServer.config.js`, `config/paths.js`, `config/env.js`, `config/modules.js`, `config/getHttpsConfig.js`; `src/react-app-env.d.ts`; `package.json` `proxy`, `homepage`, `eslintConfig.extends: react-app` | Confuses contributors, implies a build system that no longer exists. | Delete the CRA/webpack config and the CRA-only `package.json` fields. | S |
| P2-2 | **No i18n** — all strings hardcoded English (no i18n lib present) | throughout components | Blocks localization; string changes require code edits. | If localization is a goal, introduce `react-i18next`; otherwise document as intentional. | L (if pursued) |
| P2-3 | **No route/code splitting** — 0 `React.lazy`/`Suspense` | `src/App.tsx`, `src/Views.tsx` | Monaco + MUI + MUI X + WebAwesome all load eagerly → large initial bundle. | Lazy-load Monaco-heavy and rarely-used routes. Overlaps the **remove-react**/bundle work. | M |
| P2-4 | **A11y gaps** — 61 `aria-*` across 135 `.tsx`; only 6 of 23 `<img>` have `alt` | e.g. missing `alt` on images across components | Screen-reader/keyboard accessibility gaps. | Add `alt` text; adopt `eslint-plugin-jsx-a11y` (comes with P0-3). | M |
| P2-5 | **Duplicate Jest config** — root `jest.config.ts` + leftover `config/jest/*` transformers | `jest.config.ts`, `config/jest/cssTransform.js`, `config/jest/fileTransform.js` | Two sources of truth for test transforms; the root config uses `__mocks__/*` mappers instead. | Consolidate; see **report 01** (Vitest/coverage) which owns the test tooling migration. | S |
| P2-6 | **Store→component import (layering leak)** | 1 occurrence of a `src/store/**` file importing from `components/` | Inverts the intended dependency direction; risks a cycle. | Move the shared symbol into `utils`/`store`. | S |
| P2-7 | **Stale `TODO`s** (5) incl. disabled features | `src/components/sidenav/Routes.ts:31` & `SideNav.tsx:377` (Mail/Dashboard disabled, LABS-1214); `src/components/database/QuickConfigView.tsx:40`; `src/components/forms/FormsContainer.tsx:502`; `src/store/applications/action.ts:401` (warn on secret overwrite) | Disabled routes and an un-implemented secret-overwrite confirmation. | Track in the issue tracker and remove the commented-out code. | S |
| P2-8 | **Mixed / redundant dependencies** — `@emotion/react` + `@emotion/styled` retained though emotion-styled usage is 0 (MUI peer dep only); `@mui/lab` on a `9.0.0-beta` beta; React 19 + `immer` 11 (very new) | `package.json` | Emotion + Linaria + MUI styling systems coexist; beta/bleeding-edge deps raise upgrade risk. | Keep `@emotion` only as the MUI peer; converge styling on Linaria (design-tokens report); pin/track the beta. | M |

---

## Metrics

| Metric | Value |
|--------|-------|
| Source files | 135 `.tsx`, 75 `.ts`, ~27 plain-JS Lit (25 in `lit-elements/`) |
| Total source LOC (ts/tsx/js) | ~38,700 |
| Test files | **4** (`App.test.tsx`, `TabsAccess.test.tsx`, `EditView.test.tsx`, + 1) — see report 01 |
| `as any` casts | **151** (97 are `dispatch(thunk() as any)`) |
| `@ts-ignore` | 1 (`store/databases/action.ts:2854`); `@ts-expect-error`/`@ts-nocheck`: 0 |
| Non-null `!` assertions | ~8 |
| `console.*` statements | 80 (56 `console.log`) |
| Empty / silent `catch` | 3 `catch {}` (+ swallowing catches) |
| `localStorage`/`sessionStorage` refs | 40 |
| `dangerouslySetInnerHTML` | 0 (good) |
| Hardcoded secrets | None found — API URLs are relative/proxied (`src/config.dev.ts`) |
| `TODO/FIXME/HACK/XXX` | 5 |
| Redux selectors memoized (`createSelector`) | 0 (of 224 `useSelector` sites) |
| `React.lazy`/`Suspense` | 0 |
| ESLint | not installed; no flat config; not run in CI |

**Largest files (LOC):** `store/databases/action.ts` 2953 · `components/access/TabsAccess.tsx` 1022 · `styles/CommonStyles.tsx` 936 · `components/forms/FormsContainer.tsx` 855 · `store/databases/types.ts` 774 · `components/access/ModeCompare.tsx` 759 · `components/lit-elements/lit-source.js` 752 · `components/forms/DetailsSection.tsx` 738 · `components/login/LoginPage.tsx` 657 · `store/databases/reducer.ts` 627.

---

## Positives (worth preserving)

- `strict: true`, `isolatedModules`, `noFallthroughCasesInSwitch`, and `forceConsistentCasingInFileNames` are on — a solid TS baseline that the `as any` sprawl (P1-1) undercuts rather than a weak config.
- No `dangerouslySetInnerHTML` anywhere; no hardcoded secrets; API base URLs are relative and proxied.
- Dependency-risk mitigation is already in place via `overrides` (`dompurify ^3.3.2`, `yaml ^2.6.1`, `jsdom`, `glob`) and Dependabot (`.github/dependabot.yml`).
- Store is cleanly sliced by domain (17 well-separated feature folders) even if the reducer *style* is legacy.
- `getToken` (`store/account/action.ts:77`) and `App.tsx` token parsing already guard against corrupt tokens with try-catch + `removeAuth()`.

---

## Cross-references (not duplicated here)

- **Report 01** — Vitest/coverage migration & the 4-test problem, Jest config duplication (P2-5).
- **React→Lit/WA components** — the ~27 plain-JS Lit components (P1-7) and component migration.
- **wa-page / design-tokens** — `CommonStyles.tsx` breakup (P1-4) and styling-system convergence (P2-8).
- **remove-react** — Redux modernization (P1-2), bundle/code-splitting (P2-3).
