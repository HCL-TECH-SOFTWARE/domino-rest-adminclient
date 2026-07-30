# Code Quality & Cross-Cutting Risk Report

**Project:** `@hcl-software/domino-rest-adminclient` (HCL Domino REST API Admin UI)
**Stack:** React 19.2 SPA on a `<wa-page>` shell · Redux Toolkit `createSlice` + typed thunks · **in-repo router** (`src/router/`, no react-router) · MUI 9 (`@mui/material` only) · Linaria · WebAwesome 3.10 + **50 TypeScript Lit elements** · Monaco 0.55 (lazy) · Vite 8 · **Vitest 4** · TypeScript 7 · oxlint · SonarQube Cloud · Node ≥ 24
**Scope:** Cross-cutting quality, security, type-safety, and maintainability. Does **not** cover the deep-dives owned by the sibling reports — Vitest/coverage (report 01), React→Lit/WA component migration (02), wa-page/design-tokens (03), remove-react (04), Dependabot triage (05) — which are referenced where relevant.

> **Refreshed 2026-07-30** against branch `new_code` @ `0d5458c`. Previous refreshes:
> `fcab645` (2026-07-28), `e17010c` and `7594672` (both 2026-07-27); originally written
> 2026-07-24. Every number below was re-measured on this commit; every P-item carries a
> verified status.

---

## ✅ Every gate is green

On `0d5458c`:

| Gate | Result |
|---|---|
| `npm run lint` | ✅ exit 0 |
| `npm run typecheck` | ✅ exit 0 |
| `npm run build` | ✅ exit 0 |
| `npm run bundle:budget` | ✅ exit 0 — 887.5 kB raw / 243.7 kB gzip against 901.2 / 245.9 |
| `npm test` | ✅ exit 0 — **133 files / 1709 tests**, 70.18 % lines |
| `npm audit` | ✅ **0 vulnerabilities** |

> **One finding retracted from a draft of this refresh.** Measured on `5f0b913` (two commits
> earlier), `lint`, `typecheck` and `build` all exited 1 on a single unused `keepBlockDiagram`
> import at `Section.tsx:15` — the first red baseline in this report's history. **`0d5458c`
> removed the import.** The finding is closed, and the P0 it was filed as has been withdrawn
> rather than carried.
>
> It is still worth the sentence it takes to record *why* it mattered: CI runs
> `lint → typecheck → build` **before** `test`, so one unused import made every other gate in
> the repo unreadable and would have given any branch cut from that commit a red CI it did not
> cause.

---

## What changed since `fcab645`

**319 commits, 99 merged PRs (#753–#922)** — by far the largest delta between refreshes.
**Four of this report's long-standing P1/P2 items closed**, three of them the ones it had
been calling its own worst tech debt for four revisions: the `as any` dispatch sprawl, the
classic-Redux reducers, and the 2,885-line God action file. The security P0's compensating
control also finally landed.

| Item | Then (`fcab645`) | Now (`0d5458c`) | Where |
|---|---|---|---|
| **P1-1 untyped dispatch** | 🔴 the top P1 — **153** `as any`, **94** of them `dispatch(… as any)` | ✅ **DONE** — **44** `as any`, **0** dispatch casts; `useAppDispatch` at 82 sites | #694 |
| **P1-2 classic Redux** | 🟡 17 hand-written `switch(action.type)` reducers | ✅ **DONE** — **0** `switch` reducers; **17** modules on `createSlice` across 10 slices | #710 |
| **P1-3 God action file** | 🟡 `store/databases/action.ts` at **2,885** lines, 5.8 % covered | ✅ **DONE** — **47** lines; split into 13 per-concern modules at **84.4 %** lines | #711, #801–#805 |
| **P0-2 CSP** | 🔴 `script-src 'unsafe-inline'` on both SPA document routes | ✅ **DONE** — both routes now `script-src 'self'` + `style-src-attr 'none'` + `report-uri` | #685 |
| **P2-3 route splitting** | 🟡 **0** `React.lazy`/`Suspense` | ✅ **DONE** — the in-repo router builds a memoised `React.lazy` per `load` route | #813, #716 |
| **P2-10 `npm audit`** | 🟡 **10 high**, 0 critical | ✅ **0 vulnerabilities** | #699 |
| **Icons** | 🟡 `@mui/icons-material` + `react-icons`, 43 files | ✅ **GONE** — 0 references in `src`, both uninstalled | #718, #913 |
| **react-router** | 2 open advisories, `react-router@7.18.1` installed | ✅ **REMOVED** — replaced by `src/router/` (2 files, **97.8 %** covered) | #716 |
| **MUI X surface** | 🟡 **1** — `@mui/x-data-grid`, 5 files | ✅ **GONE** — People/Groups screens deleted with it | #770 |
| **Dependencies** | 21 deps / 17 devDeps | ✅ **18** / 17 — and `overrides` 9 → **4** | #718, #770, #826, `e27102f` |
| **Lit layer** | 25 elements, 25 `@lit/react` wrappers, 84.5 % lines | ✅ **50** elements, **32** wrappers, **89.7 %** lines | #806 and its PRs |
| **`npm test`** | ✅ 70 files / 747 tests, 34.72 % | ✅ **133 files / 1709 tests, 70.18 %** | #801–#805, #880 |
| **Inline `style=`** | 🟡 20 attributes in `keep-*` shadow roots | ✅ **0** — the 3 textual matches left are doc comments | #765 |
| **`lint`/`typecheck`/`build`** | ✅ all exit 0 | ✅ all exit 0 | — |

### The security P0's compensating control has landed

The last refresh closed P0-1 (JWTs in `localStorage`) on the strength of "status quo +
compensating controls (CSP tightening)", and then flagged that the control did not yet
exist: `/admin/ui` and `/admin/ui/*` — the only two routes that serve the SPA document —
were the only two carrying `script-src 'unsafe-inline'`.

**Both are now `script-src 'self'`.** Verified in `jar/config/config.json`: each of the two
document profiles reads

```
default-src 'self' data:; script-src 'self'; style-src-attr 'none'; style-src-elem 'self';
font-src 'self' data:; img-src 'self' data:; worker-src 'self' blob:;
connect-src 'self' data: *; report-uri /api/csp-violation-report
```

So the #684 decision is a real control rather than a promise. Two residual notes, neither
a P0:

- **The asset route is now the loosest profile.** `/admin/*` still carries
  `style-src 'self' 'unsafe-inline'` — the legacy combined directive, not the split
  `style-src-attr`/`style-src-elem` pair the document routes use. It serves no HTML
  document, so it is not an XSS sink, but the inversion is worth knowing: the tight profile
  is the one on the SPA, and the loose one is on the assets. It used to be the reverse.
- **`connect-src` keeps its `*`.** Deliberate — the admin UI talks to whatever Domino host
  it is served from, which is not known at build time.

### The invalid-input styling defect found last refresh is fixed

The last refresh reported 14 fallback-less reads of three-digit Shoelace-era colour steps
(`--wa-color-danger-600`, `-300`) in the form-validation rules, which are undefined in WA
3.10 — a `var()` on an undefined custom property with no fallback is invalid at
computed-value time, so the whole declaration was dropped and the red error border never
painted.

**Re-measured on this commit: 0 bare `var(--wa-color-*-NNN)` reads across `src`.** The only
two textual matches of a three-digit step left are prose comments in `keep-theme.css:304`
and `dark-mode.css:15`, both of which exist precisely to record that those names were never
valid. The `:state(user-invalid)` rules in `keep-source.ts` and `keep-overrides.css` now
read defined tokens.

The caveat that made this bug possible has **not** changed: the suite runs with
`css: false`, so no test asserts a painted colour, and the fix is verified by reading the
compiled values rather than by a regression test. Report 03 finding 11b.

Everything the last refresh listed as "unchanged and still open" — `as any` sprawl, legacy
Redux, the God action file — **has closed.** What remains open is the scale items: no i18n,
the oversized components (**#712**'s technique, executed per-file inside **#806**), and the
`light-dark()` residue in the CSS (**131** literals, down from 229).

---

## Executive Summary

- ✅ **Every gate is green** — `lint`, `typecheck`, `build`, `bundle:budget`, `test` and
  `npm audit` all pass on `0d5458c`.
- ✅ **The P0 queue is genuinely empty, control and all.** P0-4 through P0-10 are done;
  **P0-1 was decided and closed** (#684); and **P0-2 — the CSP edit that decision rested
  on — has landed** (#685). Both SPA document routes now send `script-src 'self'`,
  `style-src-attr 'none'` and a `report-uri`. The compensating control is real.
- ✅ **`strict: true` is no longer undermined.** #694 typed the store's dispatch:
  `as any` fell **153 → 44**, and `dispatch(someThunk() as any)` went **94 → 0**.
  `useAppDispatch` is used at 82 sites. What is left is 44 scattered casts with no single
  systematic source — this is no longer the largest tech-debt item in the report, and for
  four revisions it was.
- ✅ **Redux is modern.** #710 finished the `createSlice` migration: **0**
  `switch(action.type)` reducers remain, and **17** modules across 10 slices are on
  `createSlice`. #711 split the God action file — `store/databases/action.ts` went
  **2,885 → 47** lines across 13 per-concern modules, and #801–#805 covered them to
  **84.4 %** lines against the 5.8 % the last refresh recorded.
- ✅ **The test suite grew past the point of being a formality.** **133 files / 1709
  tests**, **70.18 %** line coverage — up from 70 / 747 / 34.72 %. Store reducers are at
  **100 %** lines, `src/utils` 99.3 %, `src/router` 97.8 %, `src/services` 96.1 %,
  `keep-elements/**` 89.7 %.
- ✅ **Route splitting landed, so the bundle story is no longer "deferral only".** The
  in-repo router builds a memoised `React.lazy` per `load` route (#813, #716) — the
  **0** `React.lazy`/`Suspense` this report has reported since 2026-07-24 is finally
  non-zero. The eager closure is **887.5 kB raw / 243.7 kB gzip** against a 901.2 / 245.9
  budget, with Monaco (`editor.api2`, 3,626.9 kB) and the four Monaco workers fetched on
  demand across 137 JS chunks.
- ✅ **Three dependency families left the tree.** `react-router`/`-dom` (#716, replaced by
  `src/router/`), `@mui/x-data-grid` (#770, with the People/Groups screens), and both icon
  packages (#718/#913). `dependencies` is **18**, down from 21 — and from 32 two refreshes
  ago. `@mui/material` is the only MUI package left.
- ✅ **`npm audit` is clean.** **0 vulnerabilities**, down from 10 high. The
  `brace-expansion → minimatch → @wyw-in-js/*` build-time chain cleared, and the two
  `react-router` advisories became inapplicable when the package was removed. ⚠️ **The
  GitHub security tab still disagrees** — Dependabot scans `main`, now **479 commits
  behind** `new_code`. See report 05.
- ✅ **The Lit layer is the majority of the UI now, not an annex.** **50** registered custom
  elements in TypeScript on a shared `KeepElement` base with a typed `emit()`, at **89.7 %**
  line coverage. The `@lit/react` adapters are down to **32** and shrinking — they are
  deletions, not work (see the counting rule in #806).
- ✅ **Static analysis is three-layered** — `oxlint` (`correctness: error`,
  `no-console: error`), `tsc -b` with `noUnusedLocals`/`noUnusedParameters`, and SonarQube
  Cloud with a quality gate (#688). Note that layers one and two are what caught the red
  gate above; they are working exactly as intended.
- ✅ **The type and error escape hatches stay closed.** **0** `@ts-ignore` /
  `@ts-expect-error` / `@ts-nocheck`; **0** undocumented silent `catch`; **0** `console.*`
  outside `log-service.ts`; **0** upward `store → components` imports; **0** real inline
  `style=` attributes; **0** `dangerouslySetInnerHTML`.
- **Two selector items remain, one barely.** `createSelector` is at **2** uses (was 0)
  against **137** `useSelector` sites — so memoization exists but is not yet the norm. Still
  tracked as #697.
- **The oversized components are the surviving God-file problem.**
  `access/TabsAccess.tsx` (1,002), `forms/FormsContainer.tsx` (804),
  `store/databases/types.ts` (778), `keep-elements/keep-source.ts` (776),
  `login/LoginPage.tsx` (774). The store half of this item is fully resolved.
- **No i18n** — unchanged, and the largest untouched item in the report.

**Overall remediation effort: ~S–M**, down from M–L. Delete the unused import; after that
the open queue is genuinely nice-to-have. The three L-sized items this report has carried
since 2026-07-24 — typed dispatch, Redux modernization, the God action file — are all done.
What remains is #712's component breakup (executed per-file inside **#806**, not as a
sweep), #697's selectors, and the i18n decision.

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
| <a id="p0-8"></a>P0-8 | ✅ **DONE** | ~~Coverage ratchet breached~~ | `vitest.config.ts` thresholds | `keep-monaco-editor.ts` joined `keep-elements/` untested, dragging the directory to 60.3 % against its 70 % gate. | `keep-monaco-editor.test.ts` added (#668). The `keep-elements/**` glob is now **89.7 %** lines (the directory alone, 54 files, is 89.1 %), and the gate has been raised twice more since — 70 → 80 (#686) → **85** (#880) — so the headroom cannot be silently spent. See report 01 for the two-suite strategy that emerged here. | — |
| <a id="p0-9"></a>P0-9 | ✅ **DONE** | ~~WebAwesome base path pinned to an uninstalled version~~ | was `src/index.tsx:19` and `keep-source.ts:341` | Both calls were **inert**: in WA 3.x `getBasePath()` feeds only the autoloader, and this app imports each of the 18 components it uses explicitly. Being inert is how the skew survived a major upgrade. Worse than reported — `index.tsx` passed a *file* where a directory belongs, and `keep-source.ts` mutated the global from a **component constructor**. | Both deleted; nothing left to point at. Guarded by two source scans in `icon-library.test.ts` (no `webawesome@x.y.z` literal, no `setBasePath(` call), verified against a deliberate reintroduction. | — |
| <a id="p0-10"></a>P0-10 | ✅ **DONE** | ~~Runtime code imports a devDependency~~ | `keep-monaco-editor.ts` | `prettier/standalone` + 2 plugins imported at module scope while `prettier` sat in `devDependencies` — any `npm ci --omit=dev` breaks the build. | Moved to `dependencies` **and** switched to a memoised dynamic `import()`, since it is only reached when `language === 'javascript'`. Entry chunk −614.87 kB (−8.9 %); prettier splits into `babel` 316.53 / `estree` 210.43 / `standalone` 81.05 kB, on demand. | — |
| P0-2 | ✅ **DONE** (#685) | ~~**The production CSP is looser than the P0-1 decision assumes**~~ | `jar/config/config.json` | Both gaps are closed. **(a)** `/admin/ui` and `/admin/ui/*` now send `script-src 'self'` — the `'unsafe-inline'` that sat on exactly the two SPA-document routes is gone, so the #684 compensating control is real rather than nominal. Both profiles also carry `style-src-attr 'none'`, `style-src-elem 'self'` and `report-uri /api/csp-violation-report`. **(b)** the 20 inline `style="…"` attributes are gone: **0** real occurrences in `src` (the 3 textual matches left are doc comments in `keep-element.ts` explaining which Lit binding forms survive the directive). | **Two residual notes, neither a P0.** `/admin/*` — the asset route — is now the *loosest* profile at `style-src 'self' 'unsafe-inline'`, using the legacy combined directive rather than the split pair; it serves no HTML document so it is not an XSS sink, but the tight/loose relationship is the reverse of what it was. And `connect-src` keeps its `*` deliberately: the admin UI talks to whatever Domino host serves it, unknown at build time. | — |
| P0-11 | ✅ **WITHDRAWN — fixed upstream** | ~~**Three gates fail on one unused import**~~ | was `src/components/home/sections/Section.tsx:15` | `import keepBlockDiagram from './keepblockdiagram.svg'` was never read, and failed `lint`, `typecheck` **and** `build` — the last because `tsc -b tsconfig.app.json` runs before `vite build`, so no `dist` was produced at all. Introduced by `5f0b913` ("UI tweaks") and **removed by `0d5458c`** two commits later, so it was the top of this queue for exactly two commits. | — . Recorded because the *shape* recurs: CI runs `lint → typecheck → build` before `test`, so a single unused import makes every other gate unreadable and hands a red CI to any branch cut from that commit. | — |

### P1 — Maintainability

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P1-1 | ✅ **DONE** (#694) | ~~**Untyped thunk dispatch → 94 `dispatch(… as any)`**~~ | was store slices consumed everywhere | The store now exports a typed `AppDispatch` and `useAppDispatch` (RTK `ThunkDispatch`), used at **82** sites. `dispatch(… as any)` is at **0**, and total `as any` fell **153 → 44** — the remaining casts are scattered and have no single systematic source, so `strict: true` is no longer being undercut wholesale. Doing this before #806's `StoreController` migration was the right order: the swap is mechanical because the dispatch type already lines up. | — | — |
| P1-2 | ✅ **DONE** (#710) | ~~**RTK installed, classic Redux used** — 17 `switch(action.type)` reducers~~ | `src/store/*/reducer.ts` | **0** `switch(action.type)` reducers remain. **17** modules across the 10 slices are on `createSlice`, and the reducers sit at **100 %** line / 95.5 % branch coverage — the parity net the last refresh identified as the precondition is what made this safe. `immer` is now a dependency with **0** direct importers (RTK bundles it); worth dropping. | — | — |
| P1-3 | ✅ **DONE** (#711, #801–#805) | ~~**God action file — 2,885 lines**~~ | `src/store/databases/` | Split into **13** per-concern modules (`schemas`, `scopes`, `forms`, `views`, `agents`, `formulas`, `fields`, `folders`, `scripts`, `databases`, `shared`, plus `types` and `reducer`). `action.ts` is now **47** lines. The directory went from **5.8 %** line coverage to **84.4 %**, and #880 gave it a coverage floor it had never had — the largest body of store logic in the tree was ungated until then. | — | — |
| P1-4 | 🟡 **the surviving God-file problem** | **Oversized components** | `access/TabsAccess.tsx` (1,002), `forms/FormsContainer.tsx` (804), `store/databases/types.ts` (778), `keep-elements/keep-source.ts` (776), `login/LoginPage.tsx` (774), `forms/DetailsSection.tsx` (725), `keep-elements/keep-monaco-editor.ts` (677), `keep-elements/keep-quick-config-form.ts` (658), `access/ModeCompare.tsx` (651), `store/databases/forms.ts` (623), `forms/EditView.tsx` (623) | Hard to test/reason about; concentrates state + view + side effects. | The **store** half of this item is resolved (P1-3). What is left is components. `styles/CommonStyles.tsx` (936 → 20, #708) and `store/databases/action.ts` (2,885 → 47, #711) have both left the list. ⚠️ **Two entries are now Lit elements, not React** — `keep-source.ts` and `keep-quick-config-form.ts` — so this is not purely a migration artefact; converting a file does not by itself make it small. Tracked as **#712**, executed **per-file inside #806** rather than as a sweep. | L |
| P1-5 | 🟡 **barely moved** | **Almost no memoized selectors** — `createSelector` used **2×**, **137** inline `useSelector` sites (was 0 of 178) | across components | Inline object/array selectors return new references each render → avoidable re-renders. Memoization now exists but is not the norm. The site count fell with #806's conversions, not with a change in approach — and it will keep falling for that reason, so do not read it as progress on *this* item. | Introduce RTK `createSelector` for derived/object-returning selectors. Overlaps #806: a file converting to `StoreController` is the natural moment. Tracked as **#697**. | M |
| P1-6 | ✅ **DONE** (#695) | ~~**`@ts-ignore` masking a real type gap**~~ | was `src/store/databases/action.ts` | The single suppression is gone, and nothing replaced it: **0** `@ts-ignore`, **0** `@ts-expect-error`, **0** `@ts-nocheck` across `src`. | — | — |
| P1-7 | ✅ **DONE** | ~~27 Lit components authored in plain JS~~ | now `src/components/keep-elements/*.ts` | **50** registered elements (54 `.ts` files in the directory) are TypeScript with `@customElement`/`@property`/`@state`/`@query` and a typed `emit()` helper — up from 25, because #806's per-file pass has been converting React leaves into elements all refresh. The `@lit/react` adapters are down to **32** and live one-per-file under `keep-elements/react/` (#813 split them out of the barrel for bundle reasons); `KeepElements.tsx` is now a 59-line re-export barrel. ⚠️ **Those 32 wrappers are not remaining work** — each is one `createComponent` call that dies with its last React consumer, and `test/keep-element-wrappers.test.ts` fails if one outlives it. SWC is configured with `tsDecorators` + `useDefineForClassFields:false` in **both** `vite.config.mts` and `vitest.config.ts` — a required pairing (decorated class fields would otherwise shadow Lit's reactive accessors); moving to standard decorators + `accessor` is tracked as **#747**. | — | — |
| P1-8 | ✅ **DONE** | ~~ESLint rules actively weakened~~ | `.oxlintrc.json`, `tsconfig.json` | `correctness: error`, `no-unused-vars: error` with the `^_` ignore convention; `noUnusedLocals` and `noUnusedParameters` are `true`. Lint is clean and gates CI. | — | — |
| <a id="p1-9"></a>P1-9 | ✅ **DONE** (#687) | ~~**`tsconfig.json` includes `test/` but the build config does not distinguish it**~~ | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json` | `npm run build` is now `tsc -b tsconfig.app.json && vite build` and sees `src` only; a type error in `test/**` no longer fails a production build. `npm run typecheck` (`tsc -b`) still covers both. | Root `tsconfig.json` is solution-style (`files: []` + references) so editors keep full IntelliSense on `test/**`. A `references`-based split was not possible: `noEmit: true` on the app project makes TS reject it with `TS6310`. | S |

### P2 — Nice-to-have

| # | Status | What | Where | Why it matters | Fix | Effort |
|---|:---:|------|-------|----------------|-----|--------|
| P2-1 | ✅ **DONE** (#677) | ~~**Dead CRA leftovers**~~ | removed: `config/**` (6 files), `babel.config.js`, `jest.config.ts`, `__mocks__/**`, `public/index.html`, `Jenkinsfile`, `package.json` `proxy`/`homepage`/`eslintConfig`/`jestSonar`, and finally `src/react-app-env.d.ts` | The last file declared CRA `process.env` types plus asset-module shims. It is gone and `tsc -b` stays green; `src/vite-env.d.ts` carries the Vite equivalents. Three `.d.ts` files remain in `src`, all current (`vite-env`, `vitest`, `styles`). | — | — |
| P2-2 | 🟡 unchanged | **No i18n** — all strings hardcoded English | throughout components | Blocks localization. | If localization is a goal, introduce a library; otherwise document as intentional. | L (if pursued) |
| P2-3 | ✅ **DONE** (#813, #716) | ~~**No *route* splitting** — 0 `React.lazy`/`Suspense`~~ | `src/router/react.tsx`, `src/Views.tsx` | Route splitting landed. `RouterOutlet` builds one `React.lazy` per `load` route and **memoises them on the route table's identity** — the table has to stay memoised or `lazy()` returns a fresh component every render and remounts the screen. `guard` is checked before the lazy element renders, and creating a `lazy()` does not call `load`, so a guarded route does not fetch its chunk. `Views.tsx` additionally mounts `KeepQuickConfigDrawer` lazily **on first open rather than while open**, because `wa-drawer`'s close is animated and unmounting on the flag clearing would skip both the animation and the out-of-drawer error alert. | ⚠️ **Measure the eager closure, not the entry-chunk line.** The entry chunk is 323.5 kB, but shared chunks stay eager: the real figure is **887.5 kB raw / 243.7 kB gzip** from `dist/.vite/manifest.json`, against a 901.2 / 245.9 budget — **13.7 kB raw / 2.2 kB gzip** of room. `npm run bundle:budget` is the gate. ⚠️ **raw headroom was widened 2 % → 3 % for the duration of #806** (a tight raw budget fails on migration churn, not on regressions); gzip stays at 2 % — **put raw back to 0.02 when #806 closes**. Monaco (`editor.api2`, 3,626.9 kB) plus four workers and Prettier's three chunks load on demand, across 137 JS chunks. Remaining eager weight is MUI and WebAwesome; `app-icons.ts` is **#731**. | — |
| P2-4 | 🟡 unchanged | **A11y gaps** | across `.tsx` | Screen-reader/keyboard gaps. | Add `alt` text; oxlint has no `jsx-a11y` equivalent today — consider `eslint-plugin-jsx-a11y` as a second, non-gating pass, or defer until the WA migration (WA components ship their own a11y). | M |
| P2-5 | ✅ **DONE** | ~~Duplicate Jest config~~ | — | Jest is gone; one `vitest.config.ts` is the single source of truth. See report 01. | — | — |
| P2-6 | ✅ **DONE** (#696) | ~~**Store→component import (layering leak)**~~ | was `src/store/databases/action.ts:74` → `components/access/functions` | `convert2FieldType` and `convertDesignType2Format` now live in `src/utils/field-types.ts`. **0** imports from `src/store/**` into `src/components/**` remain. | — | — |
| P2-7 | ✅ **DONE** (#698, #681) | ~~**Stale `TODO`s** (5) incl. disabled features~~ | now 2, both deliberate | The unreachable `/settings/account` route and its screen were deleted (#681); the Mail/Dashboard comment was rewritten to state the LABS-1214 dependency explicitly rather than pose as a TODO. The two remaining markers are `src/index.ts` ("simplify after wa transition to wa-dark") and an annotated non-TODO in `sidenav/Routes.ts`. The secret-overwrite warning became its own issue, **#740**. | — | — |
| P2-8 | 🟡 improved again | **Mixed / redundant dependencies** | `package.json` (**18** deps, **17** devDeps; was 21/17, and 32/17 two refreshes ago) | Removed since the last refresh: `react-router` + `react-router-dom` (#716 — replaced by the 2-file in-repo router at **97.8 %** coverage), `@mui/x-data-grid` (#770, deleted with the People/Groups screens), `@mui/icons-material` + `react-icons` (#718/#913). `@emotion/react` + `@emotion/styled` retained as the MUI peer — **0** direct imports, verified. ✅ **`immer` was dropped in `e27102f`**, exactly as the previous revision of this row recommended — **0** direct importers in `src`, and #710's `createSlice` migration means RTK's bundled copy serves. ⚠️ **`redux@5.0.1` is still declared and is in the same position**: 0 direct importers, superseded by `@reduxjs/toolkit`. Same one-line PR. `overrides` also went 9 → **4** in the same commit, deleting the four dead entries report 05 had flagged for three refreshes. `@mui/material@9.2.0` is the only MUI package left, in **43** files (**#709**). Worth watching: `typescript@7.0.2`, `monaco-editor@0.55.1` as a direct dependency. | Drop `redux` (`immer` is done); keep `@emotion` only as the MUI peer, and it leaves with MUI (#709). | S |
| <a id="p2-9"></a>P2-9 | ✅ **DONE** (#675) | ~~**Two dead dependencies + an obsolete script**~~ | was `@monaco-editor/loader`, `@monaco-editor/react`, and the `disabledpostinstall` script | All three deleted. `monaco-editor@0.55.1` remains as a direct dependency and is the only Monaco package left; the sole textual match for `@monaco-editor` in `src` is an explanatory comment in `keep-monaco-editor.ts`. | — | — |
| <a id="p2-10"></a>P2-10 | ✅ **DONE** (#699) | ~~**10 high-severity `npm audit` findings**~~ | — | **`npm audit` reports 0 vulnerabilities on this commit.** Both halves cleared: the build-time `@linaria/react → @wyw-in-js/* → minimatch → brace-expansion` DoS chain resolved to patched versions, and the two `react-router` advisories became inapplicable when #716 **removed the package** rather than bumping it. ⚠️ **Do not compare this to the GitHub security tab** — Dependabot only ever scans the default branch `main`, now **479 commits behind** `new_code` (was 160). Its findings describe a lockfile this branch does not ship, and the gap is widening. | — | see report 05 |
| <a id="p2-11"></a>P2-11 | ✅ **DONE** (#676) | ~~**`npm run build` mutates a tracked source file**~~ | `vite.config.mts` (`stampBuildVersion()`); `updateBuildVersion.js` deleted | The JSDOM round-trip that reformatted `index.html` on every build is gone. A `transformIndexHtml` plugin injects the `admin-ui-daily-build-version` meta tag into the *output* instead, in dev and build alike, from the same `REACT_APP_ADMIN_UI_BUILD_VERSION`-or-timestamp source as before. `index.html` is byte-identical after a build (verified by hash) and has been restored to readable formatting. | Neither option originally listed was quite right: writing to `dist/` cannot work, because Vite regenerates `dist/index.html` from the source entry. | S |

---

## Metrics

Measured on `new_code` @ `0d5458c` with `grep -r` over `src/` (occurrence counts unless
stated). Earlier columns are previous revisions of this report, for trend only — grep
methods were not identical across revisions, so treat small deltas as noise.

| Metric | 2026-07-24 | `e17010c` | `fcab645` | **`0d5458c`** |
|--------|---|---|---|---|
| Source files | 135 `.tsx`, 75 `.ts`, ~27 plain-JS Lit | 130 `.tsx`, 105 `.ts` | 125 `.tsx`, 107 `.ts`, 3 `.d.ts`, 1 `.js` | **86 `.tsx`, 162 `.ts`, 3 `.d.ts`, 1 `.js`** |
| Total source LOC (ts/tsx/js) | ~38,700 | ~38,368 | ~37,435 | **37,472** |
| Test files / tests | 4 / 34 | 63 / 636 | 70 / 747 | **133 / 1709** (report 01) |
| Line coverage | ~0 % | 32.44 % | 34.72 % | **70.18 %** ✅ |
| `as any` casts | 151 (97 dispatch) | 154 (95) | 153 (94) | **44 (0 dispatch)** ✅ #694 |
| `switch(action.type)` reducers | 17 | 17 | 17 | **0** ✅ #710 (17 `createSlice` modules) |
| `@ts-ignore` | 1 | 1 | 0 | **0** ✅ (`@ts-expect-error`/`@ts-nocheck`: 0) |
| `console.*` outside the facade | 80 | 0 | 0 | **0** ✅ (2 textual matches, both comments) |
| Undocumented silent `catch` | 3 | 1 | 0 | **0** ✅ |
| `localStorage`/`sessionStorage` refs | 40 | 42 | 40 | **40** |
| `dangerouslySetInnerHTML` | 0 | 0 | 0 | **0** (good) |
| Inline `style=` attributes | not measured | not measured | 20 | **0** ✅ (3 textual matches, all doc comments) |
| Hardcoded secrets | none | none | none | **none** — API URLs relative/proxied (`src/config.dev.ts`) |
| `TODO/FIXME/HACK/XXX` | 5 | 5 | 2 | **2** (both deliberate) |
| `createSelector` | 0 (of 224 `useSelector`) | 0 (of 207) | 0 (of 178) | **2** (of **137**) |
| `React.lazy`/`Suspense` | 0 | 0 | 0 | **in use** ✅ #813 — one memoised `lazy()` per `load` route |
| Lint / static analysis | none | oxlint + `no-console: error` | oxlint 1.75 + SonarQube Cloud | **same — and currently failing**, 1 error |
| `lint` / `typecheck` / `build` | — | exit 0 | exit 0 | ✅ **exit 0** |
| Eager bundle closure | not measured | not measured | not measured | **887.5 kB raw / 243.7 kB gzip** (budget 901.2 / 245.9 — raw headroom temporarily 3 %) |
| Entry chunk (not the closure) | not measured | 6,322.51 kB | 2,111.11 kB / 594.20 kB gzip | **323.5 kB** — misleading alone, see P2-3 |
| Entry CSS | not measured | not measured | 198 kB | **144.7 kB** |
| Output chunks | not measured | not measured | 103 | **137 JS + 15 CSS** |
| `npm audit` | 9 (report 05) | 10 high | 10 high, 0 critical | **0 vulnerabilities** ✅ |
| `dependencies` / `devDependencies` | 32 / 17 | 32 / 17 | 21 / 17 | **18 / 17** |
| MUI import sites | not measured | 82 files (175 / 99 / 5) | 75 files (149 / 87 / 5) | **43 files, 84 sites** — `@mui/material` only |
| Icon-package files | not measured | 38 `IMG_DIR` refs | 1 | **0** ✅ both packages uninstalled |
| Registered `keep-*` elements | ~27 (plain JS) | 25 | 25 | **50** ✅ |
| `@lit/react` wrappers | — | 25 | 25 | **32** — deletions, not work (#806) |
| `light-dark()` literals | not measured | not measured | 229 | **131** (16 in `.ts`/`.tsx`, 84 `dark-mode.css`, 23 `styles.css`, 8 `keep-theme.css`) |

**Largest files (LOC):** `components/access/TabsAccess.tsx` 1,002 · `components/forms/FormsContainer.tsx` 804 · `store/databases/types.ts` 778 · `components/keep-elements/keep-source.ts` 776 · `components/login/LoginPage.tsx` 774 · `components/forms/DetailsSection.tsx` 725 · `components/keep-elements/keep-monaco-editor.ts` 677 · `components/keep-elements/keep-quick-config-form.ts` 658 · `components/access/ModeCompare.tsx` 651 · `store/databases/forms.ts` 623 · `components/forms/EditView.tsx` 623.

Two files left this list outright: `store/databases/action.ts` 2,885 → **47** (#711) and
`styles/CommonStyles.tsx` 936 → **20** (#708). ⚠️ **The list is no longer React-only** —
`keep-source.ts` (776) and `keep-quick-config-form.ts` (658) are Lit elements. Converting a
file does not make it small; #712's extraction technique applies to elements too.

### A note on the source-file counts

`.tsx` fell 125 → 86 while `.ts` rose 107 → 162, and total LOC is flat at ~37,400. That is
#806 working as designed: files are being converted from React to Lit, not deleted, so the
work shows up as a migration between the two columns rather than as a shrinking tree. **Do
not read flat LOC as "nothing happened."** Report 04 owns the per-tier detail, and its
counting rule matters here: 32 of the 162 `.ts` files are `@lit/react` wrappers that hold no
logic and are removed with their last consumer.

---

## Positives (worth preserving)

- **Quality gating is now three independent layers.** `oxlint` clean over `src` + `test`
  with `correctness: error`; `tsc -b` with `noUnusedLocals`/`noUnusedParameters`; and a
  SonarQube Cloud scan plus quality gate. `pr_check` runs `lint → build → test → sonar` on
  Node 24, and the Sonar steps skip cleanly on fork PRs where no token exists.
- **A real regression net exists, and it more than doubled this refresh.** **1709 tests**
  across 133 files at **70.18 %** lines — **100 %** on every store reducer, 99.3 % on
  `src/utils`, 97.8 % on `src/router`, 96.1 % on `src/services`, 89.7 % on
  `keep-elements/**`, 84.4 % on `store/databases/**`. Per-directory gates in
  `vitest.config.ts` fail CI on regression, and #880 closed the more dangerous failure
  mode: **three well-covered areas had no gate at all** (`store/databases/**`,
  `src/router/**`, `FormController`). A directory nobody lists is not a low floor, it is no
  floor — and drift reporting cannot show you a gap. CI publishes a coverage summary to the
  Actions job summary (#671).
- **The `Logger` facade is enforced.** `src/services/log-service.ts` is the only place in
  `src` that may call `console.*`, and oxlint holds that line. A documented convention
  that the toolchain enforces is worth more than a stricter one that it does not.
- `strict: true`, `isolatedModules`, `noFallthroughCasesInSwitch`,
  `forceConsistentCasingInFileNames` all on — and as of #694 the baseline is no longer
  undercut by anything systematic. `@ts-ignore` is at zero and the dispatch casts are gone;
  the 44 remaining `as any` are scattered rather than a pattern.
- **The Lit layer is a genuine asset, and now the majority of the UI**: **50** typed
  elements, one shared base class with a typed `emit()`, per-element `@lit/react` adapters,
  and a documented event contract. It has retired MUI's Monaco wrapper, tree view, date
  picker, data grid and table outright. Report 04's "delete the bridge" step gets easier
  every time an element lands — and `test/keep-element-wrappers.test.ts` now guarantees the
  bridge files cannot accumulate as orphans, which is how 16 of them had quietly done.
- **The store is exemplary rather than a liability.** 10 slices on `createSlice`, a typed
  `AppDispatch`, 13 per-concern thunk modules where a 2,885-line file used to be, 100 %
  reducer coverage, and two framework-agnostic controllers (`StoreController`,
  `FormController`) that let Lit elements read the store without React. All three of this
  report's long-standing store complaints closed in one refresh.
- **The styling layer has one source of truth.** `src/styles/keep-theme.css` defines the
  brand ramp and the semantic surface/text tokens for both modes; the `keep-*` elements and
  the Linaria layer both read `var(--wa-*)` rather than carrying their own hexes. See
  report 03.
- No `dangerouslySetInnerHTML`; no hardcoded secrets; API base URLs relative and proxied.
- Dependency-risk mitigation in place via `overrides` and Dependabot (report 05) — and
  `npm audit` is now clean on this branch.
- Store cleanly sliced by domain (10 well-separated feature folders), now on RTK
  `createSlice` and fully covered by tests.

---

## Cross-references (not duplicated here)

- **Report 01** — Vitest/coverage: the migration is complete and the suite is green at
  **133 files / 1709 tests, 70.18 %**. Also documents the two-suite Monaco strategy (fake
  for behaviour, real for library invariants) that came out of closing P0-8, the Sonar
  reporter, and the **no-gate** failure mode #880 fixed.
- **Report 02** — the `keep-*` element inventory (P1-7, done — now **50** elements) and the
  remaining MUI→WebAwesome component migration. The icon work and MUI X are both finished;
  what is left is `@mui/material` in **43** files, owned by **#709** and executed per-file
  inside **#806**.
- **Report 03** — largely delivered: #705/#706 (brand tokens), #708 (semantic tokens, the
  `keep-*` elements, the Linaria layer, radius/typography, the `CommonStyles.tsx` split) and
  #707 (the `wa-page` shell). What remains is the `light-dark()` residue — **131** literals,
  down from 229 — and the layout utilities (**#765**). This report's P0-2 has landed.
- **Report 04** — the React-removal capstone. P1-2's Redux modernization and P2-3's bundle
  work both delivered; the remaining surface is the per-file leaf pass (**#806**, 79 files)
  and the MUI theme layer `AppShell.tsx` still mounts (**#709**).
- **Report 05** — Dependabot triage. `npm audit` is at **0** on this branch, while the
  `main`-vs-`new_code` skew has grown to **479 commits**, so the GitHub security tab
  describes a lockfile that has not shipped for weeks.
