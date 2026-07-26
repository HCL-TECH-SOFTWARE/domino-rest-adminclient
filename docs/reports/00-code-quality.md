# Code Quality & Cross-Cutting Risk Report

**Project:** `@hcl-software/domino-rest-adminclient` (HCL Domino REST API Admin UI)
**Stack:** React 19.2 SPA · React-Redux + classic thunks · react-router v7 · MUI 9 · Linaria · WebAwesome 3.10 + 26 TypeScript Lit elements · Monaco 0.55 · Vite 8 · **Vitest 4** · TypeScript 7 · oxlint · Node ≥ 24
**Scope:** Cross-cutting quality, security, type-safety, and maintainability. Does **not** cover the deep-dives owned by the sibling reports — Vitest/coverage (report 01), React→Lit/WA component migration (02), wa-page/design-tokens (03), remove-react (04), Dependabot triage (05) — which are referenced where relevant.

> **Refreshed 2026-07-27** against branch `new_code` @ `e17010c`. Previously refreshed
> the same day against `7594672`; originally written 2026-07-24. Every number below was
> re-measured on this commit; every P-item carries a verified status.

---

## What changed since `7594672`

22 commits. PRs #668–#673 landed, and **every P0 item that was actionable in this repo
is now closed.**

| Item | Then (`7594672`) | Now (`e17010c`) | Where |
|---|---|---|---|
| **`npm test`** | 🔴 RED — 4 suites failed to load; coverage ratchet breached | ✅ **GREEN** — exit 0, **63 files / 636 tests** | #668, #669, #673 |
| **P0-7 suite load failure** | 🔴 `document.queryCommandSupported is not a function` | ✅ **DONE** — polyfilled in `test/setupTests.ts` | #668, #669 |
| **P0-8 coverage ratchet** | 🔴 `keep-elements/**` 60.3 % vs the 70 % gate | ✅ **DONE** — directory now **84.2 %** lines | #668 |
| **P0-4 unchecked fetch** | 🟡 `/auth/extend` parsed blind | ✅ **DONE** — via `checkForResponse`, every failure path → `removeAuth()`; first *action* test in the tree | #673 |
| **P0-5 silent `catch {}`** | 🟡 1 remaining in `FormsContainer.tsx` | ✅ **DONE** — replaced by a total comparator that cannot throw | #673 |
| **P0-6 `console.*`** | 🟡 89 statements, facade unused | ✅ **DONE** — **0** outside `log-service.ts`; oxlint `no-console: error` enforces it | #673 |
| **P0-9 WA base path** | 🟡 pinned to an uninstalled `3.6.0` | ✅ **DONE** — both calls **deleted**; they were inert (see below) | #673 |
| **P0-10 runtime devDependency** | 🟡 `prettier` imported from `devDependencies` | ✅ **DONE** — moved to `dependencies` **and** lazily `import()`ed | #673 |
| **P2-3 code splitting** | 🔴 6.94 MB / 1.88 MB gzip entry chunk | 🟡 **Improved** — **6.32 MB / 1.70 MB gzip** (−8.9 %); first real split landed | #673 |
| **P0-2 CSP** | 🔴 "REGRESSED — no CSP is sent" | ➖ **WITHDRAWN** — the finding was wrong. See below. | — |
| **CI** | lint → build → test | ✅ same, plus a **published coverage summary** in the Actions job summary | #671 |
| **Test coverage** | 509 tests / 53 files, ~27 % lines | ✅ **636 tests / 63 files, 32.4 % lines** | #670, #673 |

### Two corrections to the previous revision

**P0-2 was not a regression, and there is nothing to fix in this repo.** The previous
revision called the `'disabledContent-Security-Policy'` key in `vite.config.mts` a
security regression. That header configures the **Vite dev server only**. The
**production CSP is served from `config.json`**, outside this repository. Renaming the
key would change nothing in production and would only re-impose a wide-open policy on
localhost. The item is withdrawn rather than deferred; report 03's CSP prerequisites are
re-framed accordingly.

**P0-9 was worse than described, in an instructive way.** The report said the base path
was "pinned to a version that is no longer installed". Reading WebAwesome 3.10's source,
`getBasePath()` has **exactly one consumer** — the autoloader's `register()`, which
lazily `import()`s `components/<tag>/<tag>.js`. This app never autoloads; it imports all
38 of its WA components explicitly, and icons resolve through `getIconPath()`/kit code,
a separate setting. **Both calls were inert** — which is precisely how a version skew
survived a major upgrade unnoticed. Two further defects the report had not caught:
`index.tsx` passed a *file* where a directory is expected, and `keep-source.ts` mutated
that global **from a component constructor**, so mounting a source tree silently
reconfigured the whole app with a different URL than `index.tsx` had set. Deleted rather
than re-pointed; guarded by source scans in `icon-library.test.ts`.

Everything else below (token storage, `as any` sprawl, legacy Redux, God files, no i18n)
is **unchanged and still open**.

---

## Executive Summary

- ✅ **The P0 queue is empty.** Every P0 item that was actionable inside this repository
  is closed (P0-4, 5, 6, 7, 8, 9, 10 done; P0-2 withdrawn as a mis-diagnosis; P0-1
  deferred as an API-contract decision, below). `npm run lint`, `npm run build` and
  `npm run test` all exit 0 on `e17010c`.
- ✅ **Logging is now policy, not aspiration.** **Zero** `console.*` calls remain outside
  `src/services/log-service.ts`, and oxlint's `no-console` is set to `error` — scoped off
  only for the facade itself and `test/**`. The facade's own docstring is finally
  enforced by the toolchain rather than by hope.
- ✅ **Static analysis and types are enforced.** `oxlint` runs clean over `src` and
  `test`, gates `pr_check` before build and test, and `noUnusedLocals`/`noUnusedParameters`
  are on.
- ✅ **The Lit layer is typed.** All 26 custom elements are TypeScript with decorators on
  a shared `KeepElement` base that standardises the outbound `CustomEvent` contract. The
  React↔Lit boundary is no longer an `any` hole.
- 🟡 **The bundle moved for the first time.** The entry chunk is **6,322.51 kB
  (1,703.85 kB gzip)**, down from 6.94 MB / 1.88 MB — because `prettier` is now loaded
  through a memoised dynamic `import()` and splits into three on-demand chunks. Still a
  single eager entry for Monaco, MUI, MUI X and WebAwesome; still **0** `React.lazy`.
- 🟡 **Session tokens remain in `localStorage`** (P0-1) — 42 storage references, down from
  50 but unchanged in kind. This is the largest open security item and needs an API-side
  decision, not a code sweep.
- **`strict: true` is still quietly undermined.** 154 `as any` casts, **95** of them
  `dispatch(someThunk() as any)` — unchanged.
- **Redux is still high-boilerplate legacy style.** `@reduxjs/toolkit` is installed but
  only `configureStore` is used; 17 hand-written `switch`-on-`action.type` reducers;
  **zero** memoized selectors across 207 `useSelector` sites.
- **A 2,883-line God action file** (`src/store/databases/action.ts`) still dominates the
  store; 600–1,000-line God components follow.
- **`npm audit` reports 10 high, 0 critical** — the `brace-expansion` chain (build-time)
  and `react-router` (runtime, but this app does not use RSC mode). ⚠️ **The GitHub
  security tab disagrees**, because Dependabot scans the default branch `main`, which is
  **80 commits behind** `new_code`. Its 2 criticals are `happy-dom@10.8.0` — `new_code`
  already resolves `20.11.1`, which `npm audit` does not flag. See report 05.

**Overall remediation effort: ~M–L.** With P0 clear, the next tier is P1-1 (typed
dispatch — mechanical, and it makes report 04's migration easier) and P2-3
(code-splitting, now proven to work). The Redux modernization and God-file breakup remain
the L-sized long tail.

---

## Prioritized Checklist

Status legend: 🔴 open & urgent · 🟡 open, partially addressed · ✅ done · ➖ superseded

### P0 — Correctness & Security

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P0-1 | 🟡 **the one open P0** | **Session tokens in `localStorage`** (plaintext access + refresh JWT) | `src/components/login/LoginPage.tsx:257,313`; `src/components/login/CallbackPage.tsx:35-36`; `src/store/account/action.ts`; `src/App.tsx:40`; **42** `localStorage`/`sessionStorage` refs (was 50) | `localStorage` is readable by any JS on the origin; a single XSS = full session + refresh-token theft. | Move to httpOnly cookies if the API allows; otherwise keep tokens in memory + short-lived. ⚠️ **`refresh_token` cannot simply be dropped**: `CallbackPage.tsx:36` writes it and `pkce.js:131` reads it for silent refresh — removing it breaks refresh-across-reload. This needs an API-contract decision, which is why it is deferred rather than swept. | M |
| P0-4 | ✅ **DONE** | ~~Unchecked fetch → silent auth failure~~ | `src/store/account/action.ts` (`renewToken`) | Four failure modes all ended badly: 4xx/5xx and 200-without-`bearer` dispatched `RENEW_TOKEN` with `undefined` (leaving the store *authenticated with no usable credential* — surfacing as odd downstream 401s rather than a login problem); non-JSON bodies and dropped connections threw out of the thunk unhandled. | Now routed through `checkForResponse`, with an explicit `!response.ok`/`!bearer` check; every failure dispatches `removeAuth()`, matching what `App.tsx`'s bootstrap already does for an expired token. Covered by `test/store/account/action.test.ts` — the first *action* test in the tree — whose five failure-path cases were verified to fail against the old implementation. | — |
| P0-5 | ✅ **DONE** | ~~Silent `catch {}`~~ | `src/components/forms/FormsContainer.tsx` | The bare catch wrapped the form-name sort. One design element with no `@name` made `undefined.toLowerCase()` throw out of the comparator, `Array#sort` propagated it, and the swallowed error left the **entire** form list in API order. | Replaced by an exported total comparator (`compareFormNames`) that cannot throw — removing the failure rather than logging it. Also fixes the old comparator never returning 0 for equal names. | — |
| P0-6 | ✅ **DONE** | ~~`console.*` shipped to prod~~ | was 89 statements across 18 files | Noise and auth-flow information leakage. | **0** remain outside `log-service.ts`; oxlint `no-console: "error"` with `overrides` disabling it only for the facade and `test/**`. Auth-flow tracing was mapped to `debug`, not `info`, so it stays out of a production console by default. Two calls the previous count missed: `pkce.js` is a `.js` file that `--include=*.ts*` greps skipped, and `api-retry.ts` logged the same string twice either side of a `notify()`. | — |
| <a id="p0-7"></a>P0-7 | ✅ **DONE** | ~~Test suite fails to load~~ | `test/setupTests.ts` | `KeepElements.tsx` imports the Monaco element, dragging the `monaco-editor` ESM bundle into jsdom at import time; it probes `document.queryCommandSupported`, which jsdom lacks. | Polyfilled in `test/setupTests.ts`. Suite loads; `npm run test` exits 0. | — |
| <a id="p0-8"></a>P0-8 | ✅ **DONE** | ~~Coverage ratchet breached~~ | `vitest.config.ts` thresholds | `keep-monaco-editor.ts` joined `keep-elements/` untested, dragging the directory to 60.3 % against its 70 % gate. | `keep-monaco-editor.test.ts` added (#668). Directory is now **84.2 %** lines. Thresholds unchanged. See report 01 for the two-suite strategy that emerged here. | — |
| <a id="p0-9"></a>P0-9 | ✅ **DONE** | ~~WebAwesome base path pinned to an uninstalled version~~ | was `src/index.tsx:19` and `keep-source.ts:341` | Both calls were **inert**: in WA 3.x `getBasePath()` feeds only the autoloader, and this app imports all 38 components explicitly. Being inert is how the skew survived a major upgrade. Worse than reported — `index.tsx` passed a *file* where a directory belongs, and `keep-source.ts` mutated the global from a **component constructor**. | Both deleted; nothing left to point at. Guarded by two source scans in `icon-library.test.ts` (no `webawesome@x.y.z` literal, no `setBasePath(` call), verified against a deliberate reintroduction. | — |
| <a id="p0-10"></a>P0-10 | ✅ **DONE** | ~~Runtime code imports a devDependency~~ | `keep-monaco-editor.ts` | `prettier/standalone` + 2 plugins imported at module scope while `prettier` sat in `devDependencies` — any `npm ci --omit=dev` breaks the build. | Moved to `dependencies` **and** switched to a memoised dynamic `import()`, since it is only reached when `language === 'javascript'`. Entry chunk −614.87 kB (−8.9 %); prettier splits into `babel` 316.53 / `estree` 210.43 / `standalone` 81.05 kB, on demand. | — |
| P0-2 | ➖ **WITHDRAWN** | ~~CSP is not sent at all~~ | `vite.config.mts:29` | **The finding was wrong.** That header configures the **Vite dev server only**; the **production CSP is served from `config.json`**, outside this repository. Renaming the key would change nothing in production and would re-impose a wide-open policy on localhost. | No repo change. Any CSP tightening belongs in `config.json`; report 03 §5's `style-src-attr` requirement is a note for *that* file, not a blocker here. | — |

### P1 — Maintainability

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P1-1 | 🟡 unchanged | **Untyped thunk dispatch → 95 `dispatch(… as any)`** (of 154 total `as any`) | store slices consumed everywhere; heaviest in `src/components/forms` and `access` | Each cast erases type-checking of action payloads at the call site; `strict` gives false confidence. | Export typed `AppDispatch`/`useAppDispatch` from the store (RTK `ThunkDispatch`); replace the casts. Doing this **before** report 04's `StoreController` migration makes that swap mechanical. | M |
| P1-2 | 🟡 unchanged | **RTK installed, classic Redux used** — 17 `switch(action.type)` reducers + string action-type constants | `src/store/*/reducer.ts`, `src/store/*/types.ts`; `src/store/index.ts`, `src/index.tsx` | High boilerplate, manual `immer produce`, easy to drift; the toolkit that eliminates it is already a dependency. **Mitigating factor: the reducers now have ≥95 % test coverage**, so a `createSlice` migration is far safer than it was. | Migrate slices to `createSlice`/`createAsyncThunk` incrementally, smallest first, leaning on the reducer tests as the parity net. Coordinate with report 04. | L |
| P1-3 | 🟡 unchanged | **God action file — 2,883 lines** | `src/store/databases/action.ts` | Single-file bottleneck for merges, review, comprehension; mixes schemas, scopes, forms, views, agents, formula results. | Split by concern into a `databases/` sub-folder of thunks. | L |
| P1-4 | 🟡 unchanged | **Oversized components** | `access/TabsAccess.tsx` (1,010), `styles/CommonStyles.tsx` (936), `forms/FormsContainer.tsx` (806), `keep-elements/keep-source.ts` (760), `access/ModeCompare.tsx` (760), `forms/DetailsSection.tsx` (690), `login/LoginPage.tsx` (659), `forms/EditView.tsx` (621) | Hard to test/reason about; concentrates state + view + side effects. | Extract sub-components and hooks; `CommonStyles.tsx` should be split per feature (report 03). | L |
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
| P2-3 | 🟡 **improving** | **No route/code splitting** — still 0 `React.lazy`/`Suspense` | `src/App.tsx`, `src/Views.tsx` | Entry chunk is **6,322.51 kB (1,703.85 kB gzip)**, down from 6.94 MB / 1.88 MB. The `import()` half of P0-10 delivered the first real split — Prettier now loads on demand — which **demonstrates the technique works here**; the remaining eager weight is Monaco, MUI, MUI X and WebAwesome. | Lazy-load the Monaco-heavy and rarely-used routes, following the pattern `keep-monaco-editor.ts` now uses for Prettier. Overlaps report 04's bundle work. | M |
| P2-4 | 🟡 unchanged | **A11y gaps** | across `.tsx` | Screen-reader/keyboard gaps. | Add `alt` text; oxlint has no `jsx-a11y` equivalent today — consider `eslint-plugin-jsx-a11y` as a second, non-gating pass, or defer until the WA migration (WA components ship their own a11y). | M |
| P2-5 | ✅ **DONE** | ~~Duplicate Jest config~~ | — | Jest is gone; one `vitest.config.ts` is the single source of truth. See report 01. | — | — |
| P2-6 | 🟡 unchanged | **Store→component import (layering leak)** | `src/store/databases/action.ts:74` imports `convert2FieldType`, `convertDesignType2Format` from `components/access/functions` | Inverts the intended dependency direction; risks a cycle. | Move those two helpers into `src/utils`. | S |
| P2-7 | 🟡 unchanged | **Stale `TODO`s** (5) incl. disabled features | `sidenav/Routes.ts` & `SideNav.tsx` (Mail/Dashboard disabled, LABS-1214); `database/QuickConfigView.tsx`; `forms/FormsContainer.tsx`; `store/applications/action.ts` (warn on secret overwrite); plus a new one in `index.html` ("simplify after wa transition to wa-dark") | Disabled routes and an un-implemented secret-overwrite confirmation. | Track in the issue tracker; remove commented-out code. | S |
| P2-8 | 🟡 improved | **Mixed / redundant dependencies** | `package.json` (32 deps, 17 devDeps) | `@mui/lab` **removed** ✅. `@emotion/react` + `@emotion/styled` retained (MUI peer; **0** direct imports, verified). `prettier` is now correctly a `dependency` (P0-10). Worth watching: `typescript@7.0.2`, `immer@11.1.15`, `monaco-editor@0.55.1` as a direct dependency, `@fortawesome/fontawesome-free@7.3.1` + two `@fontsource-variable` fonts. | Keep `@emotion` only as the MUI peer; converge styling on Linaria + WA tokens (report 03). Delete the dead `@monaco-editor/*` pair (P2-9). | M |
| <a id="p2-9"></a>P2-9 | 🔴 **actionable now** | **Two dead dependencies + an obsolete script** | `package.json`: `@monaco-editor/loader` ^1.7.0, `@monaco-editor/react` ^4.8.0-rc.3, and the `disabledpostinstall` script | The previous revision said to "verify the running editor still resolves its assets" because `FormsContainer.tsx` still used `@monaco-editor/react`. **#669 completed that swap**: both packages now have **zero imports in `src`** (the only textual match is a comment inside `keep-monaco-editor.ts`), and the `postinstall` step that copied `monaco-editor/min/vs` for the AMD loader is definitively obsolete. | Delete both dependencies and the `disabledpostinstall` script. No consumer remains — this is now a clean removal rather than a judgement call. | **S** |
| <a id="p2-10"></a>P2-10 | 🟡 unchanged | **10 high-severity `npm audit` findings** (0 critical) | `@linaria/react` → `@wyw-in-js/*` → `minimatch` → `brace-expansion` (build-time DoS); `react-router` (RSC-mode CSRF bypass) | Build-time chain is not browser-reachable; the `react-router` advisory is runtime but this app does not use RSC mode. ⚠️ **Do not compare this to the GitHub security tab** — Dependabot scans `main`, which is 80 commits behind, and reports 2 criticals (`happy-dom@10.8.0`) that `new_code` has already resolved to `20.11.1`. | Bump `@wyw-in-js/vite` when a patched `minimatch` lands; track the `react-router` advisory — report 04 removes `react-router-dom` entirely, so a bump may be throwaway. See report 05. | S–M |
| <a id="p2-11"></a>P2-11 | 🟡 **NEW** | **`npm run build` mutates a tracked source file** | `updateBuildVersion.js`, run via `prebuild`; rewrites `index.html` | It does not merely stamp the timestamp — it collapses the doctype/`<html>`/`<head>` onto one line, strips the self-closing slashes from every void element, and drops the trailing newline. Every build leaves the working tree dirty, which invites an unrelated reformat into the next commit (this happened once during #673 and had to be backed out). | Write the stamped copy to `dist/` instead of rewriting the source, or restrict the script to the single `content=` attribute it actually needs to change. | S |

---

## Metrics

Measured on `new_code` @ `e17010c` with `grep -r` over `src/` (occurrence counts unless
stated). Earlier columns are previous revisions of this report, for trend only — grep
methods were not identical across revisions, so treat small deltas as noise.

| Metric | 2026-07-24 | `7594672` | **`e17010c`** |
|--------|---|---|---|
| Source files | 135 `.tsx`, 75 `.ts`, ~27 plain-JS Lit | 130 `.tsx`, 103 `.ts`, 3 `.d.ts`, 1 `.js` | **130 `.tsx`, 105 `.ts`, 3 `.d.ts`, 1 `.js`** |
| Total source LOC (ts/tsx/js) | ~38,700 | ~38,100 | **~38,368** |
| Test files / tests | 4 / 34 | 53 / 509 | **63 / 636** (see report 01) |
| Line coverage | ~0 % | ~26.8 % | **32.44 %** |
| `as any` casts | 151 (97 dispatch) | 154 (95 dispatch) | **154** (95 dispatch) |
| `@ts-ignore` | 1 | 1 | **1** (`@ts-expect-error`/`@ts-nocheck`: 0) |
| `console.*` outside the facade | 80 | 76 | **0** ✅ |
| Silent `catch` | 3 | 1 | **1** — `store/databases/action.ts:325`, body is only a commented-out log. (A second empty catch, `account/action.ts:219`, is *documented-intentional*: logout failure, state cleared in `finally`.) |
| `localStorage`/`sessionStorage` refs | 40 | 50 | **42** |
| `dangerouslySetInnerHTML` | 0 | 0 | **0** (good) |
| Hardcoded secrets | none | none | **none** — API URLs relative/proxied (`src/config.dev.ts`) |
| `TODO/FIXME/HACK/XXX` | 5 | 5 | **5** |
| `createSelector` | 0 (of 224 `useSelector`) | 0 (of 207) | **0** (of **207** `useSelector`) |
| `React.lazy`/`Suspense` | 0 | 0 | **0** |
| Lint | not installed, not in CI | oxlint 1.75, gates `pr_check` | **oxlint 1.75 + `no-console: error`** ✅ |
| Production entry chunk | not measured | 6.94 MB / 1.88 MB gzip | **6,322.51 kB / 1,703.85 kB gzip** |
| `npm audit` | 9 (report 05) | 10 high | **10 high, 0 critical** |
| `IMG_DIR` icon refs | not measured | not measured | **38** (+ 9 `<wa-icon src=…>`) — report 02 |
| MUI import sites | not measured | not measured | **82 files** (175 `@mui/material`, 99 icons, 5 X-DataGrid) |

**Largest files (LOC):** `store/databases/action.ts` 2,883 · `components/access/TabsAccess.tsx` 1,010 · `styles/CommonStyles.tsx` 936 · `components/forms/FormsContainer.tsx` 806 · `store/databases/types.ts` 764 · `components/keep-elements/keep-source.ts` 760 · `components/access/ModeCompare.tsx` 760 · `components/forms/DetailsSection.tsx` 690 · `components/login/LoginPage.tsx` 659 · `store/databases/reducer.ts` 625 · `components/forms/EditView.tsx` 621 · `components/keep-elements/keep-monaco-editor.ts` 582.

---

## Positives (worth preserving)

- **Lint and type strictness are now enforced, not aspirational.** `oxlint` clean over
  `src` + `test`, `correctness: error`, `noUnusedLocals`/`noUnusedParameters` on, and
  `pr_check` runs `lint → build → test` on Node 24.
- **A real regression net exists.** 636 tests, ≥95 % coverage on every store reducer,
  ~99 % on `src/utils`, 84.2 % on `keep-elements/**`, and per-directory coverage gates in
  `vitest.config.ts` that fail CI on regression — the gates caught P0-8 exactly as
  designed, and CI now publishes a coverage summary to the Actions job summary (#671).
- **The `Logger` facade is enforced.** `src/services/log-service.ts` is the only place in
  `src` that may call `console.*`, and oxlint holds that line. A documented convention
  that the toolchain enforces is worth more than a stricter one that it does not.
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

- **Report 01** — Vitest/coverage: the migration is complete and the suite is green. Also
  documents the two-suite Monaco strategy (fake for behaviour, real for library
  invariants) that came out of closing P0-8.
- **Report 02** — the `keep-*` element inventory (P1-7, done) and the remaining
  MUI→WebAwesome component migration, including the 38 `IMG_DIR` icon references still
  outstanding after #669 converted the source tree's.
- **Report 03** — `CommonStyles.tsx` breakup (P1-4), styling-system convergence (P2-8),
  the icon system, and the new `theme-service` / WA-token-resolution services. Its CSP
  section is re-framed: the production policy lives in `config.json`, not in this repo.
- **Report 04** — Redux modernization (P1-2), bundle/code-splitting (P2-3, now moving),
  and the completed Monaco swap that makes P2-9 a clean deletion.
- **Report 05** — Dependabot triage, and the `main`-vs-`new_code` branch skew that makes
  the GitHub security tab overstate what is actually shipping.
