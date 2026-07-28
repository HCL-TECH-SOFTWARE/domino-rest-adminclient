# Code Quality & Cross-Cutting Risk Report

**Project:** `@hcl-software/domino-rest-adminclient` (HCL Domino REST API Admin UI)
**Stack:** React 19.2 SPA on a `<wa-page>` shell · React-Redux + classic thunks · react-router v7 · MUI 9 · Linaria · WebAwesome 3.10 + 25 TypeScript Lit elements · Monaco 0.55 (lazy) · Vite 8 · **Vitest 4** · TypeScript 7 · oxlint · SonarQube Cloud · Node ≥ 24
**Scope:** Cross-cutting quality, security, type-safety, and maintainability. Does **not** cover the deep-dives owned by the sibling reports — Vitest/coverage (report 01), React→Lit/WA component migration (02), wa-page/design-tokens (03), remove-react (04), Dependabot triage (05) — which are referenced where relevant.

> **Refreshed 2026-07-28** against branch `new_code` @ `fcab645`. Previous refreshes:
> `e17010c` and `7594672` (both 2026-07-27); originally written 2026-07-24. Every number
> below was re-measured on this commit; every P-item carries a verified status.

---

## What changed since `e17010c`

80 commits, 34 merged PRs (#723–#767). **The P0 queue is now genuinely empty** — the last
open item, P0-1 token storage, was decided and closed rather than deferred. Two of the
program's three foundation epics (#705/#706 brand tokens, #708 tokenization) landed in
full, and the bundle finally moved by a factor rather than a percentage.

| Item | Then (`e17010c`) | Now (`fcab645`) | Where |
|---|---|---|---|
| **P0-1 token storage** | 🟡 the one open P0, deferred on an API decision | ✅ **DECIDED & CLOSED** — *"status quo + compensating controls (CSP tightening)"* | #684 |
| **P2-3 code splitting** | 🟡 6,322.51 kB / 1,703.85 kB gzip | ✅ **2,111.11 kB / 594.20 kB gzip** — **−66.6 %**; Monaco split to a lazy 3.6 MB chunk | #693, #729 |
| **P1-6 `@ts-ignore`** | 🟡 1 occurrence masking a type gap | ✅ **DONE** — 0 `@ts-ignore`, 0 `@ts-expect-error`, 0 `@ts-nocheck` | #695 |
| **P2-1 CRA leftovers** | 🟡 `src/react-app-env.d.ts` still present | ✅ **DONE** — deleted; the asset shims live in `vite-env.d.ts` | #677 |
| **P2-6 layering leak** | 🟡 `store/` imported upward from `components/` | ✅ **DONE** — helpers moved to `src/utils/field-types.ts`; **0** upward imports | #696 |
| **P2-7 stale TODOs** | 🟡 5, incl. two disabled routes | ✅ **DONE** — **2** left, both deliberate and annotated | #698, #681 |
| **P2-9 dead dependencies** | 🔴 `@monaco-editor/{react,loader}` + `disabledpostinstall` | ✅ **DONE** — all three deleted | #675 |
| **Sonar** | 🟡 `coverage/sonar-report.xml` emitted for **no consumer** | ✅ **WIRED** — `sonar-project.properties` + a scan and quality-gate step in `pr_check.yml`, plus branch analysis in `sonar.yml` | #688 |
| **P1-4 God files** | 🟡 `CommonStyles.tsx` 936 lines, 2nd largest | ✅ **partly** — split into 6 feature files + a 20-line barrel; off the list | #708 |
| **Silent `catch`** | 🟡 1 undocumented | ✅ **0** — every remaining empty catch carries a reason | #683 |
| **`npm test`** | ✅ 63 files / 636 tests, 32.44 % | ✅ **70 files / 747 tests, 34.72 %** | #689, #690, #737 |
| **MUI X surface** | 3 packages (data-grid, date-pickers, tree-view) | 🟡 **1** — `@mui/x-data-grid` only, 5 files | #703/#739, #704/#723 |
| **Icons** | 🟡 38 `IMG_DIR` refs outstanding | ✅ **1** (a doc comment) — every icon resolves through `library="fa"` | #700, #725, #730 |
| **App shell** | `HomeElement` flex/`calc()` scaffolding | ✅ **`<wa-page>`** — `AppShell.tsx`; the duplicated mobile sidebar deleted | #707 |

### The last security P0 is closed by decision, not by code

P0-1 (plaintext access **and** refresh JWTs in `localStorage`) was the one item this report
has carried open since 2026-07-24, deferred because it needed an API-contract decision
rather than a code sweep. That decision was made on #684: **status quo, with CSP tightening
as the compensating control.**

That is a legitimate resolution — the threat model is "any XSS on the origin steals the
session", and a policy that forbids inline script is a direct mitigation of the delivery
mechanism. But it makes **#685 load-bearing rather than housekeeping**: the compensating
control only compensates if the shipped policy is actually tight, and today it is not.

In `jar/config/config.json`, the two routes that serve the SPA document — `/admin/ui` and
`/admin/ui/*` — are exactly the two that carry **`script-src 'unsafe-inline'`**. The asset
routes (`/admin/*`, `/monaco-editor-core/*`) are already `script-src 'self'`. So the
directive is relaxed precisely where the XSS sink is.

**And it no longer needs to be.** The built `dist/index.html` on this commit contains **no
inline `<script>` body at all** — one `<script type="module" crossorigin src=…>` and one
stylesheet link — because #707 PR 1/3 moved the appearance boot code into `src/index.ts` as
a real module. Dropping `'unsafe-inline'` from those two profiles is now a config edit with
a verifiable precondition, not a refactor. That single change is what converts the #684
decision from a promise into a control. See P0-2.

### One new defect found while re-measuring: the invalid-input styling never paints

`@awesome.me/webawesome@3.10.0` defines colour steps **`05…95` only** — verified against the
installed package. Yet **14 fallback-less reads of three-digit Shoelace-era steps** remain,
and they are concentrated in the rules that colour form validation:

```css
wa-input:state(user-invalid)::part(base) {
  border-color: var(--wa-color-danger-600);                     /* undefined */
  box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-300);
}
```

`keep-input-text.ts:31-32`, `keep-input-password.ts:20-21`, `keep-overrides.css:26-27`, and
six danger/success rules in `keep-source.ts:279-304`. A `var()` on an undefined custom
property **with no fallback** is invalid at computed-value time, so the whole declaration is
dropped — **the red error border does not render.**

This is the second half of the bug #744 fixed. That PR corrected the *selector*
(`:state(user-invalid)` rather than the `data-user-invalid` attribute WA 3.10 never sets)
and added `validity-states.test.ts`, which asserts the selector and the state transitions.
With `css: false` the suite cannot assert a painted colour, so the dead *value* survived the
fix to the dead *selector*. Report 03 finding 11b; fold the fix into #765.

### The bundle claim from the last refresh was too pessimistic

The previous revision reported the entry chunk at 6,322.51 kB and called the remaining
eager weight "Monaco, MUI, MUI X and WebAwesome", listing Monaco lazy-loading as future
work. #693/#729 did it: `keep-monaco-editor.ts` now reaches the editor through a dynamic
`import()`, and Monaco leaves the entry chunk entirely — `editor.api2` is a **3,626.93 kB**
chunk fetched only when a Source tab opens. The entry chunk is **2,111.11 kB / 594.20 kB
gzip**, a **66.6 %** reduction, across 103 output chunks.

The honest caveat: total shipped bytes barely moved. This is deferral, not deletion, and
the app still has **0** `React.lazy`/`Suspense` — the split came from module-level dynamic
imports inside two Lit elements, not from route splitting. What changed is that a user who
never opens a schema no longer pays for Monaco.

Everything else below (`as any` sprawl, legacy Redux, the 2,885-line God action file, no
i18n) is **unchanged and still open**.

---

## Executive Summary

- ✅ **The P0 queue is empty, and this time without an asterisk.** P0-4, 5, 6, 7, 8, 9, 10
  are done; P0-2 was withdrawn as a mis-diagnosis; and **P0-1 was decided and closed**
  (#684) rather than carried. `npm run lint`, `npm run build` and `npm run test` all exit 0
  on `fcab645`. The one thing that decision now depends on is the #685 CSP edit — see
  above.
- ✅ **The bundle moved by a factor.** The entry chunk is **2,111.11 kB (594.20 kB gzip)**,
  down from 6,322.51 kB / 1,703.85 kB — a **66.6 %** cut, because Monaco now loads through
  a dynamic `import()` (#693, #729) and leaves in its own 3.6 MB chunk. 103 output chunks.
  Caveat: this is deferral, not deletion, and there are still **0** `React.lazy`/`Suspense`
  sites — MUI, MUI X DataGrid and WebAwesome remain eager.
- ✅ **Static analysis is now three-layered.** `oxlint` (clean, `correctness: error`,
  `no-console: error`) gates `pr_check` before build and test; `tsc -b` with
  `noUnusedLocals`/`noUnusedParameters`; and **SonarQube Cloud** analysis with a quality
  gate (#688) — which finally gives `coverage/sonar-report.xml` a consumer after it was
  emitted into the void for months.
- ✅ **The type escape hatches are closed except one.** **0** `@ts-ignore`,
  `@ts-expect-error` and `@ts-nocheck` (#695); **0** undocumented silent `catch` (#683);
  **0** `console.*` outside `log-service.ts`; **0** upward `store → components` imports
  (#696).
- ✅ **The Lit layer is typed and now load-bearing.** 25 custom elements in TypeScript on a
  shared `KeepElement` base with a typed `emit()`, wrapped by 25 `@lit/react` adapters, at
  **84.5 %** line coverage. Three MUI subsystems have been replaced outright by elements
  from this layer: the Monaco editor, the tree view (#704) and the date picker (#703).
- ✅ **The styling layer has a single source of truth.** #705/#706 collapsed four brand
  purples into one WA brand scale, and #708 pinned the semantic surface/text tokens and
  pointed both the `keep-*` elements and the Linaria layer at them. `getTheme()` is down
  from **22 readers to 4**, and the per-instance `theme` prop plumbing is gone. See
  report 03.
- **`strict: true` is still quietly undermined.** **153** `as any` casts, **94** of them
  `dispatch(someThunk() as any)` — essentially unchanged, and now the largest single
  tech-debt item in the report.
- **Redux is still high-boilerplate legacy style.** `@reduxjs/toolkit` is installed but
  only `configureStore` is used; 17 hand-written `switch`-on-`action.type` reducers;
  **zero** memoized selectors across 178 `useSelector` sites.
- **A 2,885-line God action file** (`src/store/databases/action.ts`) still dominates the
  store; 600–1,000-line God components follow. `CommonStyles.tsx` has left this list.
- **`npm audit` reports 10 high, 0 critical** — 8 in the build-time
  `brace-expansion → minimatch → @wyw-in-js/* → @linaria/react` chain, plus
  `react-router`/`-dom` for an RSC-mode CSRF bypass this app cannot reach. ⚠️ **The GitHub
  security tab disagrees**, because Dependabot scans the default branch `main`, which is
  now **160 commits behind** `new_code`. Its 2 criticals are `happy-dom` — `new_code`
  resolves `20.11.1`, which `npm audit` does not flag. See report 05.

**Overall remediation effort: ~M–L.** With P0 clear, the top of the queue is the #685 CSP
edit (now S-sized and unblocked, and the thing P0-1's closure rests on), then P1-1 (typed
dispatch — mechanical, and it makes report 04's migration easier). The Redux modernization
and God-file breakup remain the L-sized long tail.

---

## Prioritized Checklist

Status legend: 🔴 open & urgent · 🟡 open, partially addressed · ✅ done · ➖ superseded

### P0 — Correctness & Security

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P0-1 | ✅ **DECIDED** (#684) | ~~**Session tokens in `localStorage`**~~ (plaintext access + refresh JWT) | `src/components/login/LoginPage.tsx`; `src/components/login/CallbackPage.tsx:35-36`; `src/store/account/action.ts`; `src/App.tsx`; **40** `localStorage`/`sessionStorage` refs (was 42) | `localStorage` is readable by any JS on the origin; a single XSS = full session + refresh-token theft. The constraint that shaped the decision: `refresh_token` cannot be dropped unilaterally — `CallbackPage.tsx:36` writes it and `pkce.js:131` reads it for silent refresh. | **Resolved as "status quo + compensating controls (CSP tightening)".** Storage is unchanged by design; the mitigation is the delivery path, not the sink. ⚠️ **This makes P0-2 the control, not a tidy-up** — and the shipped policy still allows `script-src 'unsafe-inline'` on exactly the two routes that serve the SPA document. Until #685 lands, the compensating control is nominal. | — |
| P0-4 | ✅ **DONE** | ~~Unchecked fetch → silent auth failure~~ | `src/store/account/action.ts` (`renewToken`) | Four failure modes all ended badly: 4xx/5xx and 200-without-`bearer` dispatched `RENEW_TOKEN` with `undefined` (leaving the store *authenticated with no usable credential* — surfacing as odd downstream 401s rather than a login problem); non-JSON bodies and dropped connections threw out of the thunk unhandled. | Now routed through `checkForResponse`, with an explicit `!response.ok`/`!bearer` check; every failure dispatches `removeAuth()`, matching what `App.tsx`'s bootstrap already does for an expired token. Covered by `test/store/account/action.test.ts` — the first *action* test in the tree — whose five failure-path cases were verified to fail against the old implementation. | — |
| P0-5 | ✅ **DONE** | ~~Silent `catch {}`~~ | `src/components/forms/FormsContainer.tsx` | The bare catch wrapped the form-name sort. One design element with no `@name` made `undefined.toLowerCase()` throw out of the comparator, `Array#sort` propagated it, and the swallowed error left the **entire** form list in API order. | Replaced by an exported total comparator (`compareFormNames`) that cannot throw — removing the failure rather than logging it. Also fixes the old comparator never returning 0 for equal names. | — |
| P0-6 | ✅ **DONE** | ~~`console.*` shipped to prod~~ | was 89 statements across 18 files | Noise and auth-flow information leakage. | **0** remain outside `log-service.ts`; oxlint `no-console: "error"` with `overrides` disabling it only for the facade and `test/**`. Auth-flow tracing was mapped to `debug`, not `info`, so it stays out of a production console by default. Two calls the previous count missed: `pkce.js` is a `.js` file that `--include=*.ts*` greps skipped, and `api-retry.ts` logged the same string twice either side of a `notify()`. | — |
| <a id="p0-7"></a>P0-7 | ✅ **DONE** | ~~Test suite fails to load~~ | `test/setupTests.ts` | `KeepElements.tsx` imports the Monaco element, dragging the `monaco-editor` ESM bundle into jsdom at import time; it probes `document.queryCommandSupported`, which jsdom lacks. | Polyfilled in `test/setupTests.ts`. Suite loads; `npm run test` exits 0. | — |
| <a id="p0-8"></a>P0-8 | ✅ **DONE** | ~~Coverage ratchet breached~~ | `vitest.config.ts` thresholds | `keep-monaco-editor.ts` joined `keep-elements/` untested, dragging the directory to 60.3 % against its 70 % gate. | `keep-monaco-editor.test.ts` added (#668). Directory is now **84.5 %** lines, and #686 raised the gate 70 → **80** so the headroom cannot be silently spent. See report 01 for the two-suite strategy that emerged here. | — |
| <a id="p0-9"></a>P0-9 | ✅ **DONE** | ~~WebAwesome base path pinned to an uninstalled version~~ | was `src/index.tsx:19` and `keep-source.ts:341` | Both calls were **inert**: in WA 3.x `getBasePath()` feeds only the autoloader, and this app imports each of the 18 components it uses explicitly. Being inert is how the skew survived a major upgrade. Worse than reported — `index.tsx` passed a *file* where a directory belongs, and `keep-source.ts` mutated the global from a **component constructor**. | Both deleted; nothing left to point at. Guarded by two source scans in `icon-library.test.ts` (no `webawesome@x.y.z` literal, no `setBasePath(` call), verified against a deliberate reintroduction. | — |
| <a id="p0-10"></a>P0-10 | ✅ **DONE** | ~~Runtime code imports a devDependency~~ | `keep-monaco-editor.ts` | `prettier/standalone` + 2 plugins imported at module scope while `prettier` sat in `devDependencies` — any `npm ci --omit=dev` breaks the build. | Moved to `dependencies` **and** switched to a memoised dynamic `import()`, since it is only reached when `language === 'javascript'`. Entry chunk −614.87 kB (−8.9 %); prettier splits into `babel` 316.53 / `estree` 210.43 / `standalone` 81.05 kB, on demand. | — |
| P0-2 | 🔴 **now the top P0** (#685) | **The production CSP is looser than the P0-1 decision assumes** | `jar/config/config.json`; `vite.config.mts:57` (dev, report-only) | Originally filed as "no CSP is sent" — that wording was wrong (one *is* sent, from this repo) and stays withdrawn. What is left is real and has been **promoted**, because #684 closed P0-1 on the strength of "CSP tightening" as the compensating control. Two concrete gaps: **(a)** `/admin/ui` and `/admin/ui/*` — the only two routes that serve the SPA document — carry `script-src 'unsafe-inline'`, while the asset routes are already `'self'`; **(b)** every profile sets `style-src-attr 'none'` while **20** inline `style="…"` attributes ship, now all inside `keep-*` shadow roots (10 files). | **(a) is a config edit with a verified precondition:** the built `dist/index.html` has *no* inline `<script>` body on this commit, so `'unsafe-inline'` can be dropped from both profiles without a code change. **(b)** needs the 20 attributes converted to static classes or `styleMap` first, then the directive verified rather than assumed. Also worth testing the dev report-only header actually fires. | S–M |

### P1 — Maintainability

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P1-1 | 🔴 **now the top P1** | **Untyped thunk dispatch → 94 `dispatch(… as any)`** (of 153 total `as any`) | store slices consumed everywhere; heaviest in `src/components/forms` and `access` | Each cast erases type-checking of action payloads at the call site; `strict` gives false confidence. With `@ts-ignore` now at zero (P1-6), this is the **only** remaining systematic type escape hatch in the tree. | Export typed `AppDispatch`/`useAppDispatch` from the store (RTK `ThunkDispatch`); replace the casts. Doing this **before** report 04's `StoreController` migration makes that swap mechanical. Tracked as **#694**. | M |
| P1-2 | 🟡 unchanged | **RTK installed, classic Redux used** — 17 `switch(action.type)` reducers + string action-type constants | `src/store/*/reducer.ts`, `src/store/*/types.ts`; `src/store/index.ts`, `src/index.tsx` | High boilerplate, manual `immer produce`, easy to drift; the toolkit that eliminates it is already a dependency. **Mitigating factor: the reducers are now at 100 % line coverage**, so a `createSlice` migration is far safer than it was. | Migrate slices to `createSlice`/`createAsyncThunk` incrementally, smallest first, leaning on the reducer tests as the parity net. Coordinate with report 04. Tracked as **#710**. | L |
| P1-3 | 🟡 unchanged | **God action file — 2,885 lines** | `src/store/databases/action.ts` | Single-file bottleneck for merges, review, comprehension; mixes schemas, scopes, forms, views, agents, formula results. Its own line coverage is **5.8 %**, against 100 % for the reducer beside it. | Split by concern into a `databases/` sub-folder of thunks. Tracked as **#711**. | L |
| P1-4 | 🟡 **improved** | **Oversized components** | `access/TabsAccess.tsx` (1,007), `forms/FormsContainer.tsx` (807), `store/databases/types.ts` (764), `access/ModeCompare.tsx` (759), `keep-elements/keep-source.ts` (751), `login/LoginPage.tsx` (736), `forms/DetailsSection.tsx` (692), `keep-elements/keep-monaco-editor.ts` (672), `forms/EditView.tsx` (623) | Hard to test/reason about; concentrates state + view + side effects. | ✅ **`styles/CommonStyles.tsx` is off this list** — #708 split its 936 lines into six per-feature modules (`layout`, `search`, `cards`, `dialog`, `sidenav`, `forms`) behind a 20-line re-export barrel, so the 46 importing modules needed no edit. The rest is unchanged; tracked as **#712**. | L |
| P1-5 | 🟡 unchanged | **No memoized selectors** — `createSelector` used 0×, 178 inline `useSelector` sites (was 207) | across components | Inline object/array selectors return new references each render → avoidable re-renders. The count fell with the dead-screen deletions, not with any change in approach. | Introduce RTK `createSelector` for derived/object-returning selectors. Tracked as **#697**. | M |
| P1-6 | ✅ **DONE** (#695) | ~~**`@ts-ignore` masking a real type gap**~~ | was `src/store/databases/action.ts` | The single suppression is gone, and nothing replaced it: **0** `@ts-ignore`, **0** `@ts-expect-error`, **0** `@ts-nocheck` across `src`. | — | — |
| P1-7 | ✅ **DONE** | ~~27 Lit components authored in plain JS~~ | now `src/components/keep-elements/*.ts` | **25** elements (26 `.ts` files — the extra is the `KeepElement` base) are TypeScript with `@customElement`/`@property`/`@state`/`@query` and a typed `emit()` helper; `KeepElements.tsx` exports 25 matching `@lit/react` wrappers. The count fell from 26 because #701 collapsed four `keep-button*` variants into one, while #703 and #704 added `keep-input-date` and `keep-tree`. SWC is configured with `tsDecorators` + `useDefineForClassFields:false` in **both** `vite.config.mts` and `vitest.config.ts` — a required pairing (decorated class fields would otherwise shadow Lit's reactive accessors); moving to standard decorators + `accessor` is tracked as **#747**. | — | — |
| P1-8 | ✅ **DONE** | ~~ESLint rules actively weakened~~ | `.oxlintrc.json`, `tsconfig.json` | `correctness: error`, `no-unused-vars: error` with the `^_` ignore convention; `noUnusedLocals` and `noUnusedParameters` are `true`. Lint is clean and gates CI. | — | — |
| <a id="p1-9"></a>P1-9 | ✅ **DONE** (#687) | ~~**`tsconfig.json` includes `test/` but the build config does not distinguish it**~~ | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json` | `npm run build` is now `tsc -b tsconfig.app.json && vite build` and sees `src` only; a type error in `test/**` no longer fails a production build. `npm run typecheck` (`tsc -b`) still covers both. | Root `tsconfig.json` is solution-style (`files: []` + references) so editors keep full IntelliSense on `test/**`. A `references`-based split was not possible: `noEmit: true` on the app project makes TS reject it with `TS6310`. | S |

### P2 — Nice-to-have

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P2-1 | ✅ **DONE** (#677) | ~~**Dead CRA leftovers**~~ | removed: `config/**` (6 files), `babel.config.js`, `jest.config.ts`, `__mocks__/**`, `public/index.html`, `Jenkinsfile`, `package.json` `proxy`/`homepage`/`eslintConfig`/`jestSonar`, and finally `src/react-app-env.d.ts` | The last file declared CRA `process.env` types plus asset-module shims. It is gone and `tsc -b` stays green; `src/vite-env.d.ts` carries the Vite equivalents. Three `.d.ts` files remain in `src`, all current (`vite-env`, `vitest`, `styles`). | — | — |
| P2-2 | 🟡 unchanged | **No i18n** — all strings hardcoded English | throughout components | Blocks localization. | If localization is a goal, introduce a library; otherwise document as intentional. | L (if pursued) |
| P2-3 | 🟡 **much improved** | **No *route* splitting** — still 0 `React.lazy`/`Suspense` | `src/App.tsx`, `src/Views.tsx` | Entry chunk is **2,111.11 kB (594.20 kB gzip)**, down from 6,322.51 kB / 1,703.85 kB — **−66.6 %** across 103 chunks. #693/#729 moved Monaco behind a dynamic `import()` in `keep-monaco-editor.ts`, so `editor.api2` (3,626.93 kB) and ~90 language chunks now load only when a Source tab opens; Prettier's three chunks (#673) work the same way. Remaining eager weight: MUI, MUI X DataGrid, WebAwesome, and the 216 KB base64 `app-icons.ts` registry. | The two cheap wins are done. What is left is genuinely route-level: `React.lazy` on the DataGrid-heavy screens, and a decision on `app-icons.ts` (**#731**). Overlaps report 04's bundle work. | M |
| P2-4 | 🟡 unchanged | **A11y gaps** | across `.tsx` | Screen-reader/keyboard gaps. | Add `alt` text; oxlint has no `jsx-a11y` equivalent today — consider `eslint-plugin-jsx-a11y` as a second, non-gating pass, or defer until the WA migration (WA components ship their own a11y). | M |
| P2-5 | ✅ **DONE** | ~~Duplicate Jest config~~ | — | Jest is gone; one `vitest.config.ts` is the single source of truth. See report 01. | — | — |
| P2-6 | ✅ **DONE** (#696) | ~~**Store→component import (layering leak)**~~ | was `src/store/databases/action.ts:74` → `components/access/functions` | `convert2FieldType` and `convertDesignType2Format` now live in `src/utils/field-types.ts`. **0** imports from `src/store/**` into `src/components/**` remain. | — | — |
| P2-7 | ✅ **DONE** (#698, #681) | ~~**Stale `TODO`s** (5) incl. disabled features~~ | now 2, both deliberate | The unreachable `/settings/account` route and its screen were deleted (#681); the Mail/Dashboard comment was rewritten to state the LABS-1214 dependency explicitly rather than pose as a TODO. The two remaining markers are `src/index.ts` ("simplify after wa transition to wa-dark") and an annotated non-TODO in `sidenav/Routes.ts`. The secret-overwrite warning became its own issue, **#740**. | — | — |
| P2-8 | 🟡 improved | **Mixed / redundant dependencies** | `package.json` (**26** deps, **17** devDeps; was 32/17) | Removed since the last refresh: `@monaco-editor/{react,loader}`, `@mui/x-date-pickers`, `@mui/x-tree-view`, both `@fontsource-variable` fonts. `@emotion/react` + `@emotion/styled` retained (MUI peer; **0** direct imports, verified). ⚠️ **Two new dead-weight candidates:** `dayjs` is now referenced only inside a *comment* in `keep-input-date.ts` — #703 replaced the picker that needed it; and `events` exists solely to polyfill Node's `EventEmitter` for `src/utils/token-emitter.ts`, which could use `EventTarget` instead. Worth watching: `typescript@7.0.2`, `immer@11.1.15`, `monaco-editor@0.55.1` as a direct dependency. | Verify and drop `dayjs`; consider `EventTarget` for `token-emitter` and drop `events`. Keep `@emotion` only as the MUI peer; converge styling on Linaria + WA tokens (report 03). | S |
| <a id="p2-9"></a>P2-9 | ✅ **DONE** (#675) | ~~**Two dead dependencies + an obsolete script**~~ | was `@monaco-editor/loader`, `@monaco-editor/react`, and the `disabledpostinstall` script | All three deleted. `monaco-editor@0.55.1` remains as a direct dependency and is the only Monaco package left; the sole textual match for `@monaco-editor` in `src` is an explanatory comment in `keep-monaco-editor.ts`. | — | — |
| <a id="p2-10"></a>P2-10 | 🟡 unchanged in count, better in substance | **10 high-severity `npm audit` findings** (0 critical) | 8 in `@linaria/react` → `@wyw-in-js/*` → `minimatch` → `brace-expansion` (build-time DoS); 2 in `react-router`/`react-router-dom` | The build-time chain is not browser-reachable. The `react-router` picture *improved* even though the number did not: `react-router@7.18.1` is now installed, which clears the **unauthenticated route-matching DoS** (`< 7.18.0`) and the **open-redirect** (`< 7.18.0`) advisories that would have applied to this app. What still shows is the RSC-mode CSRF bypass — RSC is not used here. ⚠️ **Do not compare this to the GitHub security tab** — Dependabot scans `main`, now **160 commits behind**, and reports 2 `happy-dom` criticals that `new_code` resolved at `20.11.1`. | Bump `@wyw-in-js/vite` when a patched `minimatch` lands. Tracked as **#699**; see report 05. | S–M |
| <a id="p2-11"></a>P2-11 | ✅ **DONE** (#676) | ~~**`npm run build` mutates a tracked source file**~~ | `vite.config.mts` (`stampBuildVersion()`); `updateBuildVersion.js` deleted | The JSDOM round-trip that reformatted `index.html` on every build is gone. A `transformIndexHtml` plugin injects the `admin-ui-daily-build-version` meta tag into the *output* instead, in dev and build alike, from the same `REACT_APP_ADMIN_UI_BUILD_VERSION`-or-timestamp source as before. `index.html` is byte-identical after a build (verified by hash) and has been restored to readable formatting. | Neither option originally listed was quite right: writing to `dist/` cannot work, because Vite regenerates `dist/index.html` from the source entry. | S |

---

## Metrics

Measured on `new_code` @ `fcab645` with `grep -r` over `src/` (occurrence counts unless
stated). Earlier columns are previous revisions of this report, for trend only — grep
methods were not identical across revisions, so treat small deltas as noise.

| Metric | 2026-07-24 | `7594672` | `e17010c` | **`fcab645`** |
|--------|---|---|---|---|
| Source files | 135 `.tsx`, 75 `.ts`, ~27 plain-JS Lit | 130 `.tsx`, 103 `.ts` | 130 `.tsx`, 105 `.ts` | **125 `.tsx`, 107 `.ts`, 3 `.d.ts`, 1 `.js`** |
| Total source LOC (ts/tsx/js) | ~38,700 | ~38,100 | ~38,368 | **~37,435** |
| Test files / tests | 4 / 34 | 53 / 509 | 63 / 636 | **70 / 747** (report 01) |
| Line coverage | ~0 % | ~26.8 % | 32.44 % | **34.72 %** |
| `as any` casts | 151 (97 dispatch) | 154 (95) | 154 (95) | **153** (94 dispatch) |
| `@ts-ignore` | 1 | 1 | 1 | **0** ✅ (`@ts-expect-error`/`@ts-nocheck`: 0) |
| `console.*` outside the facade | 80 | 76 | 0 | **0** ✅ |
| Undocumented silent `catch` | 3 | 1 | 1 | **0** ✅ — the four empty catches left all carry a stated reason |
| `localStorage`/`sessionStorage` refs | 40 | 50 | 42 | **40** |
| `dangerouslySetInnerHTML` | 0 | 0 | 0 | **0** (good) |
| Hardcoded secrets | none | none | none | **none** — API URLs relative/proxied (`src/config.dev.ts`) |
| `TODO/FIXME/HACK/XXX` | 5 | 5 | 5 | **2** (both deliberate) |
| `createSelector` | 0 (of 224 `useSelector`) | 0 (of 207) | 0 (of 207) | **0** (of **178**) |
| `React.lazy`/`Suspense` | 0 | 0 | 0 | **0** |
| Lint / static analysis | none | oxlint 1.75, gates `pr_check` | + `no-console: error` | **oxlint 1.75 + SonarQube Cloud scan & quality gate** ✅ |
| Production entry chunk | not measured | 6.94 MB / 1.88 MB gzip | 6,322.51 kB / 1,703.85 kB | **2,111.11 kB / 594.20 kB gzip** ✅ |
| Entry CSS | not measured | not measured | not measured | **198 kB** (`index-*.css`) |
| `npm audit` | 9 (report 05) | 10 high | 10 high, 0 critical | **10 high, 0 critical** |
| `IMG_DIR` icon refs | not measured | not measured | 38 (+8 `<wa-icon src=…>`) | **1** ✅ (a doc comment in `icon-library.ts`) — report 02 |
| MUI import sites | not measured | not measured | 82 files (175 / 99 / 5) | **75 files** (149 `@mui/material`, 87 icons, 5 X-DataGrid) |
| `light-dark()` literals outside `keep-*` | not measured | not measured | not measured | **229** (56 in 21 `.tsx`/`.ts`, 109 in `dark-mode.css`, 64 in `styles.css`) — report 03 |

**Largest files (LOC):** `store/databases/action.ts` 2,885 · `components/access/TabsAccess.tsx` 1,007 · `components/forms/FormsContainer.tsx` 807 · `store/databases/types.ts` 764 · `components/access/ModeCompare.tsx` 759 · `components/keep-elements/keep-source.ts` 751 · `components/login/LoginPage.tsx` 736 · `components/forms/DetailsSection.tsx` 692 · `components/keep-elements/keep-monaco-editor.ts` 672 · `store/databases/reducer.ts` 625 · `components/forms/EditView.tsx` 623.

`styles/CommonStyles.tsx` left this list entirely: 936 → **20** lines (#708).

---

## Positives (worth preserving)

- **Quality gating is now three independent layers.** `oxlint` clean over `src` + `test`
  with `correctness: error`; `tsc -b` with `noUnusedLocals`/`noUnusedParameters`; and a
  SonarQube Cloud scan plus quality gate. `pr_check` runs `lint → build → test → sonar` on
  Node 24, and the Sonar steps skip cleanly on fork PRs where no token exists.
- **A real regression net exists.** 747 tests, **100 %** line coverage on every store
  reducer, 99.3 % on `src/utils`, 96.8 % on `src/services`, 84.5 % on `keep-elements/**`,
  and per-directory coverage gates in `vitest.config.ts` that fail CI on regression — the
  gates caught P0-8 exactly as designed, and CI publishes a coverage summary to the Actions
  job summary (#671).
- **The `Logger` facade is enforced.** `src/services/log-service.ts` is the only place in
  `src` that may call `console.*`, and oxlint holds that line. A documented convention
  that the toolchain enforces is worth more than a stricter one that it does not.
- `strict: true`, `isolatedModules`, `noFallthroughCasesInSwitch`,
  `forceConsistentCasingInFileNames` all on — a solid TS baseline that the `as any`
  sprawl (P1-1) undercuts rather than a weak config. With `@ts-ignore` at zero, P1-1 is
  now the *only* thing undercutting it.
- **The Lit layer is a genuine asset**: 25 typed elements, one shared base class, one
  `@lit/react` adapter file, and a documented event contract — and it has now retired three
  MUI subsystems outright (Monaco wrapper, tree view, date picker). Report 04's "delete the
  bridge" step gets easier every time an element lands.
- **The styling layer has one source of truth.** `src/styles/keep-theme.css` defines the
  brand ramp and the semantic surface/text tokens for both modes; the `keep-*` elements and
  the Linaria layer both read `var(--wa-*)` rather than carrying their own hexes. See
  report 03.
- No `dangerouslySetInnerHTML`; no hardcoded secrets; API base URLs relative and proxied.
- Dependency-risk mitigation in place via `overrides` and Dependabot (report 05).
- Store cleanly sliced by domain (17 well-separated feature folders) even though the
  reducer *style* is legacy — and now fully covered by tests.

---

## Cross-references (not duplicated here)

- **Report 01** — Vitest/coverage: the migration is complete and the suite is green at
  70 files / 747 tests. Also documents the two-suite Monaco strategy (fake for behaviour,
  real for library invariants) that came out of closing P0-8, and the Sonar reporter that
  now has a consumer.
- **Report 02** — the `keep-*` element inventory (P1-7, done) and the remaining
  MUI→WebAwesome component migration. The icon work is finished; MUI X DataGrid (5 files,
  **#702**) is the one blocking component decision left.
- **Report 03** — now largely delivered: #705/#706 (brand tokens), #708 (semantic tokens,
  the `keep-*` elements, the Linaria layer, radius/typography, the `CommonStyles.tsx`
  split) and #707 (the `wa-page` shell). What remains is the `light-dark()` residue in
  `dark-mode.css`/`styles.css`, the layout utilities (**#765**), and this report's P0-2.
- **Report 04** — Redux modernization (P1-2), the bundle work (P2-3, which delivered), and
  the MUI theme layer that `AppShell.tsx` still mounts (**#709**).
- **Report 05** — Dependabot triage, and the `main`-vs-`new_code` branch skew — now **160
  commits** — that makes the GitHub security tab overstate what is actually shipping.
