# Keep Admin UI — Code Quality & Migration Reports

Six analysis reports covering the state of `@hcl-software/domino-rest-adminclient` and a
staged program to modernize it: Jest→Vitest, React→Lit/WebAwesome, a WebAwesome design-token
layout, and full React removal.

**Originally generated 2026-07-24. Refreshed 2026-07-27** against branch `new_code` @
`7594672` — every metric re-measured, every checklist item re-scored, and the mapping
tables re-verified against the installed `@awesome.me/webawesome@3.10.0`.

> **Status:** these are **analysis/planning documents**. The refresh changed no source
> code. Each report opens with a "what changed" table and ends with a phased,
> effort-tagged (S/M/L) checklist.

## 🔴 Read this first — the branch is currently red

`npm run test` **fails** on `new_code`, and `pr_check` runs it. Two regressions, both from
the most recent commit (`7594672`, "Adding tne lit monaco editor"), both small:

1. **4 test suites cannot load.** `keep-monaco-editor.ts` does a top-level
   `import * as monaco from 'monaco-editor'`, and `KeepElements.tsx` imports it — so every
   consumer of the React bridge evaluates Monaco's ESM bundle in jsdom, which calls
   `document.queryCommandSupported`. One polyfill line in `test/setupTests.ts` fixes it
   (verified: 53 files / **509 tests** then pass).
2. **The `keep-elements` coverage gate is breached** — 60.3 % lines vs. the 70 % threshold,
   because that 538-line element shipped with no test.

Details and exact fixes: [report 01 §0](./01-vitest-and-coverage.md#0-current-status--suite-is-red)
and [report 00 P0-7 / P0-8](./00-code-quality.md).

Also worth knowing before planning anything: **CSP is currently switched off** — the header
key in `vite.config.mts` reads `disabledContent-Security-Policy`, so no policy is sent
([report 00 P0-2](./00-code-quality.md), [report 03 §5](./03-wa-page-and-design-tokens.md)).

## The reports

| # | Report | Scope | Status |
|---|--------|-------|--------|
| 00 | [Code quality & issues](./00-code-quality.md) | Cross-cutting quality/risk: security (CSP, token storage), lint pipeline, `as any`, legacy Redux, God files, bundle size | 🟡 **lint/CRA-cleanup DONE**; CSP regressed; security P0s open |
| 01 | [Vitest migration & coverage](./01-vitest-and-coverage.md) | Jest→Vitest, then coverage starting with pure reducers/utils | ✅ **migration COMPLETE** (4→509 tests); 🔴 suite currently red |
| 02 | [React → Lit / WebAwesome](./02-react-to-lit-webawesome.md) | Component-by-component inventory → `wa-*` / `keep-*` / new Lit / keep; the hard cases | ✅ **Phase 0 ~90 % done**; component phases not started |
| 03 | [wa-page & design tokens](./03-wa-page-and-design-tokens.md) | App shell on `wa-page` + WA tokens, Linaria tokenization, stripping Material Design | 🟢 **unblocked — `wa-page` is free**; work not started |
| 04 | [Remove React](./04-remove-react.md) | Capstone: routing, `react-redux`→Lit controllers, Formik, entry point, sequencing | 🟡 foundations landing; React surface untouched (on plan) |
| 05 | [Dependency triage](./05-dependabot-triage.md) | The original 9 Dependabot alerts (all fixed) + a 2026-07-27 re-audit | ✅ original 9 fixed; 🟡 10 new (9 build-time, 1 non-applicable) |

## What changed between 2026-07-24 and 2026-07-27

58 commits landed on `new_code`. The program bought **foundation quality**, not converted
screens — which was the right order.

**Done ✅**
- **Jest → Vitest**, tests moved to a top-level `test/` tree, **4 → 509 tests**, coverage
  ratchet with per-directory gates (PRs #649, #663).
- **Lint revived** — `oxlint` clean over `src` + `test`, gating `pr_check` before build and
  test; `noUnusedLocals`/`noUnusedParameters` on (PRs #664, #665).
- **All 26 Lit elements converted to TypeScript** with decorators on a shared `KeepElement`
  base, one unit test each, renamed `lit-*` → `keep-*` (PRs #652–#659, #666).
- **Dead weight removed** — `config/**`, `babel.config.js`, `jest.config.ts`, `__mocks__/`,
  `public/index.html`, `Jenkinsfile`, unused public images, `@mui/lab`, `About.tsx`,
  `copyable-text.js`, `custom-elements.d.ts`. CI moved to Node 24.
- **The `keep-monaco-editor` element was authored** — report 02 §5.3 / report 04 §5's
  recommendation, with ESM Monaco, workers, and a token-driven theme.
- **All 9 original Dependabot alerts fixed**, `react-router-dom` bumped to 7.18.1.

**Regressed or newly broken 🔴**
- `npm run test` is red (above).
- CSP is switched off entirely.
- `prettier` is imported by shipped code but declared as a devDependency.
- `setBasePath` still pins `webawesome@3.6.0` while 3.10.0 is installed.

**Corrected in the analysis 📝**
- ✅ **`<wa-page>` is FREE**, not Pro (verified in the 3.10.0 dist). Report 03's licensing
  go/no-go is resolved; the free-tier CSS-grid fallback is demoted to an escape hatch.
- 🔴 **WebAwesome ships no data grid and no date picker in _any_ tier.** "Buy WA Pro Data
  Grid" was never an option; report 02 §5.1's choice is now third-party grid vs. custom Lit
  vs. stay on MUI.
- 🔴 **The icon problem is three systems, not two** — `@mui/icons-material` (45 files),
  `react-icons` (18), and a 216 KB base64 registry `src/styles/app-icons.ts` (78 glyphs,
  10+ consumers), plus a dead 144 KB `icons.json` and an unimported
  `@fortawesome/fontawesome-free`.

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
2. 🔴 **CSP is not being sent at all**, and when restored it will fight WebAwesome:
   `style-src-attr 'none'` blocks `wa-page`'s JS-driven inline styles, the policy
   allow-lists `cdn.jsdelivr.net` while `setBasePath` points at `ka-f.webawesome.com` (host
   *and* version mismatch), and Monaco's workers need `worker-src 'self' blob:`.
   **Re-enable CSP and adopt `wa-page` in one change.** — *reports 00, 03*
3. 🔴 **MUI X DataGrid has no WebAwesome equivalent in any tier** (5 files). Biggest
   component risk — the real choice is a third-party web-component grid (AG Grid /
   RevoGrid) vs. a custom Lit table vs. keeping MUI DataGrid on an island longest.
   — *reports 02, 04*
4. 🔴 **Security P0s, unchanged:** JWT access **and** refresh tokens in plaintext
   `localStorage` (50 refs); no CSP to contain an XSS. Any XSS = full session theft.
   — *report 00*
5. ✅ ~~**Static analysis is off**~~ — **RESOLVED.** `oxlint` runs clean and gates
   `pr_check` before build and test. — *report 00*
6. 🔴 **`@vitejs/plugin-react-swc` cannot simply be deleted** in report 04's purge phase.
   It is what applies `tsDecorators` + `useDefineForClassFields: false` to all TypeScript —
   remove it without replacing that configuration and every Lit element silently stops
   reacting (class-field shadowing). — *report 04 §2*

## Current-state snapshot (grounding numbers)

Measured on `new_code` @ `7594672`. Figures vary slightly by grep method; treat small
deltas as noise.

| Metric | 2026-07-24 | **2026-07-27** |
|---|---|---|
| Source files (`.tsx` / `.ts`) | ~135 / ~75 | **130 / 103** |
| `.tsx` importing React | ~109 | **107** |
| Files importing `@mui/*` | ~72–84 | **69** (`@mui/material`) |
| `@mui/icons-material` / `react-icons` | 47 / 18 files | **45 / 18** |
| Redux call sites (`useSelector`/`useDispatch`) | ~344 across ~85 files | **323 across 77 files** (still **zero `connect()` HOCs**) |
| Linaria `styled` files / `getTheme()` readers | ~70 / 31 | **69 / 22** |
| Hand-written Lit components | 24 plain-JS `.js` | **26 TypeScript `.ts`**, one shared base class, one bridge |
| WebAwesome version | 3.6.0 | **3.10.0** |
| **Test files / tests** | **4 / 34** | **53 / 509** ✅ |
| Line coverage | ≈0 % | **26.5 %** (utils 99 %, store reducers ≥95 %) |
| `as any` (dispatch-thunk subset) | 151 (97) | **154 (95)** |
| `console.*` | 80 | **89** (a `Logger` facade now exists but is barely adopted) |
| Lint | not installed, not in CI | **oxlint, clean, gates CI** ✅ |
| Production entry chunk | not measured | **6.94 MB / 1.88 MB gzip** |
| Largest files | `store/databases/action.ts` 2,953 | `store/databases/action.ts` **2,882**; `TabsAccess.tsx` 1,007; `CommonStyles.tsx` 936 |

## Suggested execution order

1. **Phase −1 (now, hours not days):** turn the branch green — polyfill
   `document.queryCommandSupported`, add a `keep-monaco-editor` test, move `prettier` to
   `dependencies`, make the Monaco import dynamic. *(reports 00 P0-7/P0-8/P0-10, 01 §C1–C3)*
2. **Phase 0 (parallel, continuous):** report 00's remaining P0s — restore and tighten CSP,
   move tokens out of `localStorage`, adopt the `Logger` facade — and report 01's next
   coverage tranche (`src/services/**`, the shared `renderWithProviders` helper).
3. **Phase 1 (foundation):** report 03 — consolidate the four brand purples into one WA
   brand scale, decide the `--wa-font-size-scale` question, delete the dead icon assets,
   then stand up the `wa-page` shell **together with the CSP fix**.
4. **Phase 2 (components):** report 02 — finish Phase 0 (collapse the buttons; decide the
   DataGrid strategy), then leaves/controls → dialogs → cards/trees/lists → data-heavy
   views last. Start with `x-tree-view` → `wa-tree`: 2 files, free target, cheapest MUI X
   removal in the program.
5. **Phase 3 (capstone):** report 04 — router, `react-redux`→`StoreController`,
   Formik→native+Yup, wire the Monaco element, swap the entry point, then drop
   `react`/`react-dom`/`@mui/*` and verify the grep-based Definition of Done.
