# Keep Admin UI — Code Quality & Migration Reports

Six analysis reports covering the state of `@hcl-software/domino-rest-adminclient` and a
staged program to modernize it: Jest→Vitest, React→Lit/WebAwesome, a WebAwesome design-token
layout, and full React removal.

**Originally generated 2026-07-24. Refreshed 2026-07-27** against branch `new_code` @
`e17010c` (previous refresh: `7594672`) — every metric re-measured, every checklist item
re-scored, and the mapping tables re-verified against the installed
`@awesome.me/webawesome@3.10.0`.

> **Status:** these are **analysis/planning documents**. Each report opens with a "what
> changed" table and ends with a phased, effort-tagged (S/M/L) checklist.

## ✅ The branch is green, and the P0 queue is empty

The previous revision of this file opened with a red banner: the suite would not load and
the coverage gate was breached. Both are fixed. On `e17010c`:

```
npm run lint    exit 0
npm run build   exit 0    entry chunk 6,322.51 kB / 1,703.85 kB gzip
npm run test    exit 0    63 files, 636 tests
```

Every P0 that was actionable inside this repository is now closed — see
[report 00](./00-code-quality.md). Two carried caveats:

- **P0-1 (JWT access + refresh tokens in `localStorage`) is deliberately still open.** It
  needs an API-contract decision, not a code sweep. Note that `refresh_token` cannot simply
  be deleted: `CallbackPage.tsx` writes it and `pkce.js` reads it for silent refresh.
- **P0-2 (CSP) was withdrawn, not fixed.** The previous revision called the disabled
  header in `vite.config.mts` a security regression. That was wrong: it configures the
  **Vite dev server only**, and the **production CSP is served from `config.json`**,
  outside this repository. Nothing to fix here; the reports have been corrected.

## ⚠️ The GitHub security tab overstates the risk

Dependabot scans the **default branch `main`**, which is **80 commits behind** `new_code`.
It reports 2 critical alerts — both `happy-dom@10.8.0`. `new_code` already resolves
`happy-dom@20.11.1`, which `npm audit` does not flag, so **those criticals do not exist in
the code being shipped**. What `npm audit` actually reports on `new_code` is **10 high,
0 critical**: a build-time `brace-expansion` chain and one `react-router` advisory that
requires RSC mode, which this app does not use. Details in
[report 05](./05-dependabot-triage.md).

## The reports

| # | Report | Scope | Status |
|---|--------|-------|--------|
| 00 | [Code quality & issues](./00-code-quality.md) | Cross-cutting quality/risk: security (token storage), lint pipeline, `as any`, legacy Redux, God files, bundle size | ✅ **P0 queue empty** (P0-1 deferred, P0-2 withdrawn); P1/P2 open |
| 01 | [Vitest migration & coverage](./01-vitest-and-coverage.md) | Jest→Vitest, then coverage starting with pure reducers/utils | ✅ **COMPLETE and green** — 4 → **636 tests**, 32.4 % lines |
| 02 | [React → Lit / WebAwesome](./02-react-to-lit-webawesome.md) | Component-by-component inventory → `wa-*` / `keep-*` / new Lit / keep; the hard cases | ✅ **Phase 0 ~90 % done**; first element in production use (#669) |
| 03 | [wa-page & design tokens](./03-wa-page-and-design-tokens.md) | App shell on `wa-page` + WA tokens, Linaria tokenization, stripping Material Design | 🟢 **unblocked**; `theme-service` + WA-token resolvers landed as precedent |
| 04 | [Remove React](./04-remove-react.md) | Capstone: routing, `react-redux`→Lit controllers, Formik, entry point, sequencing | 🟡 React surface untouched (on plan); first dead React dep + bundle win |
| 05 | [Dependency triage](./05-dependabot-triage.md) | Dependabot alerts, `npm audit` re-audit, and the `main`-vs-`new_code` branch skew | ✅ 0 critical on `new_code`; 🟡 10 high (9 build-time, 1 non-applicable) |

## What changed since the last refresh (`7594672` → `e17010c`)

22 commits, PRs #668–#673. The theme of this round is **the foundation paying off**: the
first `keep-*` element went into production use, and the first real bundle win landed.

**Done ✅**
- **The branch is green.** Suite loads, coverage gate cleared, `pr_check` passes end to end.
- **`keep-monaco-editor` is now in production use** — the Source tab moved off
  `@monaco-editor/react` onto the Lit element via the `@lit/react` bridge, and gained a
  **Diff view** (#669). This is the first element to actually replace a React dependency.
- **Icons: self-hosted Font Awesome** registered as `library="fa"` (#669), replacing the
  `<wa-icon src="${IMG_DIR}/…">` form that only resolved when the app was mounted at
  `/admin/`. 38 `IMG_DIR` references remain elsewhere — see report 02.
- **`theme-service.ts`** centralises the three DOM carriers of appearance (`wa-dark` on
  `<html>`, `colorScheme`, `body.dataset.theme`) — report 03's precedent for token-driven
  theming, alongside `editor-theme` / `wa-color` / `wa-typography`, all now tested (#670).
- **Logging is enforced** — 0 `console.*` outside the facade, oxlint `no-console: error`
  (#673).
- **Auth failure paths fixed** — `renewToken` no longer parses blind; every failure ends at
  `removeAuth()`. First *action*/thunk test in the tree (#673).
- **Bundle down 8.9 %** — `prettier` moved to `dependencies` and lazily `import()`ed
  (#673). Entry chunk 6.94 MB → **6,322.51 kB**.
- **CI publishes a coverage summary** to the Actions job summary (#671).
- **636 tests / 63 files, 32.4 % lines** (was 509 / 53, ~26.8 %).

**Corrected in the analysis 📝**
- ➖ **P0-2 "CSP regressed" was wrong.** The disabled header is **dev-server only**; the
  production CSP lives in `config.json`, outside this repo. Reports 00 and 03 corrected.
- ➖ **`setBasePath` was inert, not merely stale.** In WebAwesome 3.x the base path feeds
  only the autoloader, and this app imports all 38 of its components explicitly. Both calls
  deleted (#673) rather than re-pointed — there was nothing to point at. Any advice to
  "set the base path" is obsolete.
- ⚠️ **Dependabot's 2 criticals are branch skew**, not live risk — see the banner above.
- 📌 **`@monaco-editor/react` + `@monaco-editor/loader` are now dead code** with zero
  imports, along with the `disabledpostinstall` script. Previously "verify the editor still
  resolves its assets"; now a clean deletion (report 00 P2-9, report 04).
- 📌 **`npm run build` mutates a tracked source file** — `updateBuildVersion.js` reformats
  `index.html`, not just its timestamp, so every build dirties the tree (report 00 P2-11).

**Still true from the previous refresh**
- ✅ `<wa-page>` is **FREE**, not Pro (verified in the 3.10.0 dist).
- 🔴 WebAwesome ships **no data grid and no date picker in any tier** — report 02 §5.1's
  choice remains third-party grid vs. custom Lit vs. stay on MUI.
- 🔴 **The icon problem is three systems** — `@mui/icons-material` (45 files),
  `react-icons` (18), and a 216 KB base64 registry `src/styles/app-icons.ts`, plus a dead
  `src/styles/icons.json`. `@fortawesome/fontawesome-free` is **no longer unimported** —
  #669 made it the source for the `fa` library.

## How they fit together

```
        ┌─────────────────────────────────────────────────┐
        │  Run continuously / in parallel                  │
        │  00 code-quality  (security P0s, CSP, bundle)    │
        │  01 vitest + coverage  (the regression net)      │
        │  05 dependency triage  (periodic re-audit)       │
        └─────────────────────────────────────────────────┘
                        │ coverage protects every step below
                        ▼
  03 tokens + wa-page ──▶ 02 components ──▶ 04 remove React
  (brand color, WA tokens,  (leaves → dialogs   (routing, react-redux,
   shell, CSP, icons)        → data views)       Formik, entry point)
```

- **03 is the foundation** for 02 and 04 — components can't drop MUI theming until the WA
  token layer exists. It is now **unblocked** (no Pro license needed).
- **02 must finish before 04** — you cannot delete `react`/`react-dom` while any React
  component remains.
- **00 and 01 are independent** and run continuously; coverage from 01 is what makes the
  02→04 rewrite safe.
- **New ordering constraint:** do report 02 §6.2 (collapse the four `keep-button*`
  components) **before** report 03's P3 tokenization, so three components that should not
  exist never get tokenized.

## 🚦 Go/No-Go gates & top cross-cutting risks

1. ✅ ~~**`<wa-page>` is WebAwesome _Pro_**~~ — **RESOLVED.** `page.js` ships in the free
   npm package at 3.10.0; the Pro set is `wa-combobox`, `wa-file-input`, `wa-toast`,
   `wa-sparkline`, charts and video. **No license decision required.** — *report 03*
2. ➖ ~~**CSP is not being sent at all**~~ — **WITHDRAWN as a repo issue.** That header is
   dev-server only; production CSP is served from `config.json`. The *substance* survives
   as a note for whoever owns that file: `wa-page` needs `style-src-attr` loosened from
   `'none'`, and Monaco's workers need `worker-src 'self' blob:`. The host/version mismatch
   half of this risk is gone — `setBasePath` no longer exists. — *reports 00, 03*
3. 🔴 **MUI X DataGrid has no WebAwesome equivalent in any tier** (5 files). Biggest
   component risk — the real choice is a third-party web-component grid (AG Grid /
   RevoGrid) vs. a custom Lit table vs. keeping MUI DataGrid on an island longest.
   — *reports 02, 04*
4. 🔴 **The one remaining security P0:** JWT access **and** refresh tokens in plaintext
   `localStorage` (42 refs). Any XSS = full session theft. Blocked on an API-contract
   decision, and `refresh_token` cannot be dropped unilaterally — `pkce.js` reads it for
   silent refresh. — *report 00 P0-1*
5. ✅ ~~**Static analysis is off**~~ — **RESOLVED.** `oxlint` runs clean and gates
   `pr_check` before build and test. — *report 00*
6. 🔴 **`@vitejs/plugin-react-swc` cannot simply be deleted** in report 04's purge phase.
   It is what applies `tsDecorators` + `useDefineForClassFields: false` to all TypeScript —
   remove it without replacing that configuration and every Lit element silently stops
   reacting (class-field shadowing). — *report 04 §2*

## Current-state snapshot (grounding numbers)

Measured on `new_code` @ `e17010c`. Figures vary slightly by grep method; treat small
deltas as noise.

| Metric | 2026-07-24 | `7594672` | **`e17010c`** |
|---|---|---|---|
| Source files (`.tsx` / `.ts`) | ~135 / ~75 | 130 / 103 | **130 / 105** |
| `.tsx` importing React | ~109 | 107 | **108** |
| Files importing `@mui/material` | ~72–84 | 69 | **69** (82 import some `@mui/*`) |
| `@mui/icons-material` / `react-icons` | 47 / 18 files | 45 / 18 | **45 / 18** |
| Redux call sites (`useSelector`/`useDispatch`) | ~344 across ~85 files | 323 across 77 | **323 across 76** (still **zero `connect()` HOCs**) |
| Linaria files / `getTheme()` readers | ~70 / 31 | 69 / 22 | **69 / 22** |
| Hand-written Lit components | 24 plain-JS `.js` | 26 TypeScript | **26 TypeScript**, one base class, one bridge, **1 in production use** |
| WebAwesome version | 3.6.0 | 3.10.0 | **3.10.0** |
| **Test files / tests** | 4 / 34 | 53 / 509 | **63 / 636** ✅ |
| Line coverage | ≈0 % | 26.5 % | **32.4 %** (utils 99 %, reducers ≥95 %, keep-elements 84 %) |
| `as any` (dispatch-thunk subset) | 151 (97) | 154 (95) | **154 (95)** |
| `console.*` outside the facade | 80 | 76 | **0** ✅ enforced by lint |
| Lint | not installed, not in CI | oxlint, gates CI | **oxlint + `no-console`, gates CI** ✅ |
| Production entry chunk | not measured | 6.94 MB / 1.88 MB gzip | **6,322.51 kB / 1,703.85 kB gzip** |
| `npm audit` | 9 alerts | 10 high | **10 high, 0 critical** |
| Largest files | `store/databases/action.ts` 2,953 | 2,882 | `store/databases/action.ts` **2,883**; `TabsAccess.tsx` 1,010; `CommonStyles.tsx` 936 |

## Suggested execution order

1. ~~**Phase −1: turn the branch green**~~ — ✅ **DONE** (#668, #669, #673). All four items
   landed: the `queryCommandSupported` polyfill, the `keep-monaco-editor` test, `prettier`
   moved to `dependencies`, and the import made dynamic.
2. **Phase 0 (parallel, continuous):** the cheap wins are now housekeeping — delete the
   dead `@monaco-editor/*` pair and the `disabledpostinstall` script (report 00 P2-9), stop
   the build mutating `index.html` (P2-11), and delete `src/react-app-env.d.ts` (P2-1).
   Then the substantive one: decide the **P0-1 token-storage** question with whoever owns
   the Keep API. Report 01's next coverage tranche continues alongside.
3. **Phase 1 (foundation):** report 03 — consolidate the four brand purples into one WA
   brand scale, decide the `--wa-font-size-scale` question, delete the dead icon assets,
   then stand up the `wa-page` shell. **No longer coupled to a CSP change in this repo**;
   flag the `style-src-attr` requirement to whoever maintains `config.json`.
4. **Phase 2 (components):** report 02 — finish Phase 0 (collapse the buttons; decide the
   DataGrid strategy), then leaves/controls → dialogs → cards/trees/lists → data-heavy
   views last. Start with `x-tree-view` → `wa-tree`: 2 files, free target, cheapest MUI X
   removal in the program.
5. **Phase 3 (capstone):** report 04 — router, `react-redux`→`StoreController`,
   Formik→native+Yup, swap the entry point, then drop `react`/`react-dom`/`@mui/*` and
   verify the grep-based Definition of Done. ("Wire the Monaco element" is ✅ done — #669.)
