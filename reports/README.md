# Keep Admin UI — Code Quality & Migration Reports

Generated 2026-07-24. Five analysis reports covering the current state of
`@hcl-software/domino-rest-adminclient` and a staged program to modernize it:
Jest→Vitest, React→Lit/WebAwesome, a WebAwesome design-token layout, and full
React removal.

> **Status:** these are **analysis/planning documents only**. No source code was
> changed. Each report ends with a phased, effort-tagged (S/M/L) checklist.

## The reports

| # | Report | Scope | Owner phase |
|---|--------|-------|-------------|
| 00 | [Code quality & issues](./00-code-quality.md) | Cross-cutting quality/risk: security (CSP, token storage), dead ESLint pipeline, `as any`, legacy Redux, God files, dead CRA config | **Do now**, parallel |
| 01 | [Vitest migration & coverage](./01-vitest-and-coverage.md) | Jest→Vitest (config, deps, Sonar), then a coverage strategy starting with pure reducers/utils | **Do now**, parallel |
| 02 | [React → Lit / WebAwesome](./02-react-to-lit-webawesome.md) | Component-by-component inventory → `wa-*` / existing `lit-*` / new Lit / keep; the 4 hard cases | After 03 tokens |
| 03 | [wa-page & design tokens](./03-wa-page-and-design-tokens.md) | App-shell on `wa-page` + WA tokens, Linaria migration, stripping Material Design | Gate + foundation |
| 04 | [Remove React](./04-remove-react.md) | Capstone roadmap: routing, `react-redux`→Lit controllers, Formik, entry point, dependency-ordered sequencing | Last (depends on 02+03) |

## How they fit together

```
        ┌─────────────────────────────────────────────┐
        │  Run continuously / in parallel              │
        │  00 code-quality (P0 security + ESLint now)  │
        │  01 vitest + coverage (safety net)           │
        └─────────────────────────────────────────────┘
                        │ coverage protects every step below
                        ▼
  03 design tokens + wa-page ──▶ 02 components ──▶ 04 remove React
  (brand color, WA tokens,       (leaves → dialogs   (routing, react-redux,
   shell, resolve Pro gate)       → data views)       Formik, entry point)
```

- **03 is the foundation** for 02 and 04 — components can't drop MUI theming
  until the WA token layer exists.
- **02 must finish before 04** — you cannot delete `react`/`react-dom` while any
  React component remains.
- **00 and 01 are independent** and should start immediately; coverage from 01
  is the regression net that makes the 02→04 rewrite safe.

## 🚦 Go/No-Go gates & top cross-cutting risks

Decide these **before** committing to the migration path — several are hard
blockers documented across the reports:

1. **`<wa-page>` is WebAwesome _Pro_; the repo has only the free tier**
   (`@awesome.me/webawesome@^3.6.0`). Either license Pro or use the documented
   free CSS-grid + `wa-drawer` fallback (same slot model). — *report 03*
2. **CSP will fight WebAwesome.** `vite.config.mts` sets `style-src-attr 'none'`
   (blocks wa-page's JS-driven inline styles) and allow-lists `cdn.jsdelivr.net`
   while `setBasePath` points at `ka-f.webawesome.com` (host mismatch). — *reports 00, 03*
3. **MUI X DataGrid has no free WebAwesome equivalent** (5 files). Biggest
   component risk — decide Pro grid vs. AG Grid/RevoGrid vs. custom Lit, or keep
   MUI DataGrid on an island longest. — *reports 02, 04*
4. **Security P0s to fix regardless of migration:** JWT access **and** refresh
   tokens in plaintext `localStorage` + wide-open CSP (`default-src … *`,
   `connect-src 'self' data: *`, `'unsafe-inline'`); any XSS = full session
   theft. — *report 00*
5. **Static analysis is off.** The `lint` script references ESLint + CRA presets,
   but ESLint isn't installed and CI never runs lint. — *report 00*

## Current-state snapshot (grounding numbers)

Figures vary by grep method across reports; treat as orders of magnitude.

| Metric | Value |
|---|---|
| Source files (`.tsx` / `.ts`) | ~135 / ~75 |
| `.tsx` importing React | ~109 |
| Files importing `@mui/*` | ~72–84 |
| `@mui/icons-material` / `react-icons` | 47 / 18 files |
| Redux call sites (`useSelector`/`useDispatch`) | ~344 across ~85 files (**zero `connect()` HOCs**) |
| Linaria `styled` files | ~70 (emotion/styled already 0) |
| Hand-written Lit components | 24 (`src/components/lit-elements/*.js`, plain JS) bridged via one `LitElements.tsx` |
| WebAwesome-referencing files | ~18 |
| **Test files / source files** | **4 / ~210 (≈0% coverage)** |
| `as any` (151 total; `dispatch(thunk() as any)`) | 151 (97) |
| Largest files | `store/databases/action.ts` (2,953 lines), 700–1,000-line God components |

## Suggested execution order

1. **Phase 0 (now, parallel):** report 00 P0 fixes (install/wire ESLint, tighten
   CSP, move tokens out of `localStorage`) **and** report 01 (adopt Vitest, port
   the 4 tests, establish a coverage baseline on store/utils).
2. **Phase 1 (foundation + gate):** report 03 — consolidate the 4 brand purples
   into one WA brand scale, define the WA token layer, resolve the wa-page Pro
   go/no-go and CSP conflicts.
3. **Phase 2 (components):** report 02 — migrate leaves/controls → dialogs →
   cards/trees/lists → data-heavy views last, each covered by tests from Phase 0.
4. **Phase 3 (capstone):** report 04 — router, `react-redux`→`StoreController`,
   Formik→native+Yup, Monaco vanilla wrapper, swap the entry point, then drop
   `react`/`react-dom`/`@mui/*` and verify the grep-based Definition of Done.
