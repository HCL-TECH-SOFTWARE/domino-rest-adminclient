# Keep Admin UI — Code Quality & Migration Reports

Six analysis reports covering the state of `@hcl-software/domino-rest-adminclient` and a
staged program to modernize it: Jest→Vitest, React→Lit/WebAwesome, a WebAwesome design-token
layout, and full React removal.

**Originally generated 2026-07-24. Refreshed 2026-07-28** against branch `new_code` @
`fcab645` (previous refreshes: `e17010c`, `7594672`) — every metric re-measured, every
checklist item re-scored, and the dependency and CSP claims re-verified against the
installed `@awesome.me/webawesome@3.10.0` and the tracked `jar/config/config.json`.

> **Status:** these are **analysis/planning documents**. Each report opens with a "what
> changed" table and ends with a phased, effort-tagged (S/M/L) checklist.

## ✅ The branch is green, the P0 queue is empty, and two foundation epics landed

On `fcab645`:

```
npm run lint    exit 0
npm run build   exit 0    entry chunk 2,111.11 kB / 594.20 kB gzip   (was 6,322.51 / 1,703.85)
npm run test    exit 0    70 files, 747 tests, 34.72 % lines
```

The last open P0 — **JWT access + refresh tokens in `localStorage`** — was **decided and
closed** (#684): *status quo, with CSP tightening as the compensating control.* That is a
legitimate resolution, and it makes one thing load-bearing:

> 🔴 **#685 is now the top item in the program.** The shipped policy in
> `jar/config/config.json` still allows `script-src 'unsafe-inline'` on exactly the two
> routes that serve the SPA document, while the asset routes are already `'self'` — so the
> directive is relaxed precisely where the XSS sink is. **It no longer needs to be:** the
> built `dist/index.html` on this commit contains no inline `<script>` body at all, because
> #707 moved the appearance boot code into `src/index.ts`. Dropping `'unsafe-inline'` is a
> config edit with a verified precondition. Until it lands, the #684 decision rests on a
> control that is not yet in place.

## ⚠️ The GitHub security tab is now actively misleading

Dependabot scans the **default branch `main`**, which is **160 commits behind** `new_code`
(was 80). It reports **16 open alerts**; **14 of them are already fixed here**, including
both criticals (`happy-dom`, resolved at `20.11.1`) and four of the five new `react-router`
advisories (resolved at `7.18.1`).

Exactly **one** finding is live on this branch: a build-time `brace-expansion` DoS
(alert 121) with no published fix on the 2.x line. It is currently buried in fifteen stale
ones — which is the concrete cost of the skew. Details in [report 05](./05-dependabot-triage.md).

## The reports

| # | Report | Scope | Status |
|---|--------|-------|--------|
| 00 | [Code quality & issues](./00-code-quality.md) | Cross-cutting quality/risk: security, lint & Sonar, `as any`, legacy Redux, God files, bundle | ✅ **P0 queue empty** — P0-1 *decided*, not deferred; P0-2 (CSP) promoted to top |
| 01 | [Vitest migration & coverage](./01-vitest-and-coverage.md) | Jest→Vitest, then coverage starting with pure reducers/utils | ✅ **COMPLETE and green** — 4 → **747 tests**, 34.72 %; ratchet raised (#686) |
| 02 | [React → Lit / WebAwesome](./02-react-to-lit-webawesome.md) | Component inventory → `wa-*` / `keep-*` / new Lit / keep; the hard cases | ✅ **Phase 0 COMPLETE**; three MUI subsystems retired; one decision left (#702) |
| 03 | [wa-page & design tokens](./03-wa-page-and-design-tokens.md) | App shell on `wa-page` + WA tokens, Linaria tokenization, stripping Material Design | ✅ **DELIVERED** — shell and token layer both shipped; a documented tail remains |
| 04 | [Remove React](./04-remove-react.md) | Capstone: routing, `react-redux`→Lit controllers, Formik, entry point, sequencing | 🟡 React surface untouched (on plan); 3 React-coupled deps deleted; bundle −66.6 % |
| 05 | [Dependency triage](./05-dependabot-triage.md) | Dependabot alerts, `npm audit` re-audit, and the `main`-vs-`new_code` branch skew | ✅ 0 critical, **0 browser-reachable**; 🟡 10 high from 2 root advisories |

## What changed since the last refresh (`e17010c` → `fcab645`)

80 commits, 34 merged PRs (#723–#767). The theme of this round is **the foundation being
spent**: report 03 went from a plan to a delivered phase, and the bundle moved by a factor
rather than a percentage.

**Done ✅**

- **The app shell is on `<wa-page>`** (#707/#751/#767). `AppShell.tsx` maps the app's
  regions onto slots; `HomeElement`'s flex row, `RightPanel`'s `calc(100% - 241px|50px)`,
  the sidenav width animation and the whole duplicated `MobileSidebar` are **deleted, not
  ported**. `test/shell-dead-code.test.ts` keeps them deleted.
- **The token layer landed** (#705/#706, then #708 in five PRs). `keep-theme.css` is the
  single source for the brand ramp *and* the semantic surface/text tokens; the `keep-*`
  elements and the Linaria layer both read `var(--wa-*)`; `getTheme()` went from **22
  readers to 4**; the `theme` prop plumbing is gone; `CommonStyles.tsx` was split per
  feature (936 → 20 lines + six modules).
- **Entry chunk −66.6 %** — **6,322.51 kB → 2,111.11 kB / 594.20 kB gzip** (#693/#729).
  Monaco now loads through a dynamic `import()`; `editor.api2` (3.6 MB) is fetched only when
  a Source tab opens.
- **Three more MUI subsystems retired**: `@mui/x-tree-view` → `keep-tree` (#704),
  `@mui/x-date-pickers` → `keep-input-date` (#703), and the four `keep-button*` variants
  collapsed into one (#701). `dependencies` is down from **32 to 26**.
- **SonarQube Cloud is wired** (#688) — `sonar-project.properties` plus scan and
  quality-gate steps in `pr_check.yml` and branch analysis in `sonar.yml`. The
  `coverage/sonar-report.xml` this repo has emitted for months finally has a consumer.
- **The type escape hatches are closed**: 0 `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`
  (#695), 0 undocumented silent `catch` (#683), 0 upward `store → components` imports
  (#696), 0 `console.*` outside the facade.
- **Icons finished the `src=` half** — `IMG_DIR` is down to one doc comment (#700/#730).
- **Dead weight deleted**: `@monaco-editor/*` + `disabledpostinstall` (#675),
  `src/react-app-env.d.ts` (#677), `icons.json` + `text-manipulation.css` + two
  `@fontsource-variable` packages (#679), the unreachable `settings` screen (#681).
- **747 tests / 70 files, 34.72 % lines**, and the coverage ratchet was **raised** for the
  first time (#686): global 20→30, `keep-elements` 70→80, plus a new `services` gate at 90.

**Corrected in the analysis 📝**

- ➖ **"The brand purple is consolidated" is only half true.** #705/#706 built the single
  source of truth, but nothing has yet deleted the other two: `KEEP_ADMIN_BASE_COLOR
  = #5F1EBE` still has **11 interpolations**, and **`#7e57c2` survives in 17 places** in the
  scoped login-button overrides at `styles.css:1946-1985`. Report 03 finding 3.
- 🐛 **One bug found while re-measuring — and one false alarm.** **The invalid-input
  styling never paints:** 14 fallback-less reads of non-existent three-digit WA colour
  steps sit in the `:state(user-invalid)` rules, and a `var()` on an undefined property
  with no fallback drops the declaration entirely (report 03 finding 11b). Confirmed in a
  browser: the border computes to `currentColor`, never red. It is the other half of the
  bug #744 fixed — that PR corrected the dead *selector*, and `css: false` meant no test
  could catch the dead *value*.
  ➖ **Retracted:** a first draft of this refresh also reported the dark login button
  painting its label in its own fill colour, from `--wa-color-brand` and
  `--wa-color-brand-on` both being `#7e57c2`. Measured while implementing #765: `wa-button`
  reads `--wa-color-brand-on-loud`/`-normal`/`-quiet` and never the bare
  `--wa-color-brand-on`, so that declaration was inert and the label was always white. The
  finding was reasoned from a token name instead of measured. Report 03 finding 3b.
- ➖ **"No raw `wa-*` markup in React" — the honest figure was always zero.** Two successive
  refreshes reported 26 files, then 17-with-one-`.tsx`; both counted comments. Verified
  against `e17010c` as well: that `.tsx` match was prose then too.
- 📌 **The neutral ramp cannot be re-skinned the way brand was.** #708 planned to override
  `--wa-color-neutral-*` and measurement killed it: WA's neutral ramp is **shared between
  light and dark**, and only the semantic tokens switch which step they read. The pins are
  on `--wa-color-surface-*` / `--wa-color-text-*` deliberately — do not "simplify" it back.
- 📌 **Shoelace-era token names keep reappearing and fail silently.** After
  `--wa-color-brand-600/500/700` (#706), #708 found two more rounds:
  `--wa-color-neutral-700/-1000/-0/-950` and `--wa-font-size-small/-medium/-large`.
  *Reading* one is worse than setting one — the fallback always wins, so the code looks
  token-driven and isn't. `keep-tooltip.ts` still has live instances (#765).
- 📌 **`dayjs` and `events` are now dead weight.** `dayjs` existed for `AdapterDayjs`; after
  #703 its only match in `src` is a comment. `events` polyfills Node's `EventEmitter` for
  one consumer that `EventTarget` would serve.
- ⚠️ **`src/index.ts` is taken.** #707 created it for the appearance boot code, so report
  04's "`index.tsx` → `index.ts`" entry-point swap needs a different name.

**Still true from previous refreshes**

- ✅ `<wa-page>` is **FREE**, not Pro — now settled empirically: it is in production.
- 🔴 WebAwesome ships **no data grid in any tier** — report 02 §5.1's choice (third-party
  grid vs. custom Lit vs. stay on MUI) is now the **only** blocking component decision.
  The date-picker half of this gap was closed by authoring, not buying.
- 🔴 **The icon problem is three systems** — `@mui/icons-material` (41 files),
  `react-icons` (18), and the 216 KB base64 registry `src/styles/app-icons.ts`. With Monaco
  split out, `app-icons.ts` is now ~10 % of the entry chunk rather than ~3 %.

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
  (✅ DELIVERED)            (leaves → dialogs   (routing, react-redux,
                             → data views)       Formik, entry point)
```

- **03 was the foundation** for 02 and 04, and it is now **built**. Components can drop MUI
  theming because the WA token layer exists.
- **02 must finish before 04** — you cannot delete `react`/`react-dom` while any React
  component remains.
- **00 and 01 are independent** and run continuously; coverage from 01 is what makes the
  02→04 rewrite safe.
- The ordering constraint that governed the last two refreshes — *collapse the four
  `keep-button*` components before tokenizing* — has been **discharged** (#701 before #708),
  and it worked: three components that should not exist never got tokenized.

## 🚦 Go/No-Go gates & top cross-cutting risks

1. 🔴 **The CSP edit is the compensating control for a closed security P0.** #684 accepted
   plaintext JWTs in `localStorage` on the strength of CSP tightening. The shipped policy
   does not yet deliver it: `script-src 'unsafe-inline'` on both SPA routes, and
   `style-src-attr 'none'` against 20 live inline `style="…"` attributes. The first half is
   now a config-only fix. **#685** — *reports 00, 03*
2. 🔴 **MUI X DataGrid has no WebAwesome equivalent in any tier** (5 files). The last
   blocking component decision, and the last `@mui/x-*` package. The real choice is a
   third-party web-component grid (AG Grid / RevoGrid) vs. a custom Lit table vs. keeping
   MUI DataGrid on an island longest. **#702** — *reports 02, 04*
3. 🔴 **The token sweep is half done and looks finished.** The keystone is in place, but
   **229 `light-dark()` literals** remain outside the element layer — 109 of them in
   `dark-mode.css`, which is still 469 lines of hand-written `.Mui*` overrides. Sequence its
   deletion with #709, not ahead of it. **#765** — *report 03*
4. 🔴 **`@vitejs/plugin-react-swc` cannot simply be deleted** in report 04's purge phase.
   It is what applies `tsDecorators` + `useDefineForClassFields: false` to all TypeScript —
   remove it without replacing that configuration and every Lit element silently stops
   reacting (class-field shadowing). **#747** removes the coupling. — *report 04 §2*
5. ⚠️ **The suite cannot see styling.** `vitest.config.ts` runs with `css: false` and jsdom
   has no canvas backend, so every guard on the token layer is a *source-scanning* test that
   pins structure, not appearance. **A green suite is not evidence that a visual change
   looks right**, and most screens sit behind login — budget a human click-through in both
   colour modes for anything touching report 03. — *reports 01 §B4, 03 §7*
6. ✅ ~~`<wa-page>` is Pro~~ · ✅ ~~Static analysis is off~~ · ✅ ~~The suite is red~~ —
   all resolved.

## Current-state snapshot (grounding numbers)

Measured on `new_code` @ `fcab645`. Figures vary slightly by grep method; treat small
deltas as noise.

| Metric | 2026-07-24 | `7594672` | `e17010c` | **`fcab645`** |
|---|---|---|---|---|
| Source files (`.tsx` / `.ts`) | ~135 / ~75 | 130 / 103 | 130 / 105 | **125 / 107** |
| `.tsx` importing React | ~109 | 107 | 108 | **97** |
| Files importing `@mui/material` | ~72–84 | 69 | 69 | **60 `.tsx`** (75 files import some `@mui/*`) |
| `@mui/icons-material` / `react-icons` | 47 / 18 files | 45 / 18 | 45 / 18 | **41 / 18** |
| MUI X packages | 3 | 3 | 3 | **1** — `@mui/x-data-grid`, 5 files |
| Redux call sites (`useSelector`/`useDispatch`) | ~344 across ~85 files | 323 across 77 | 323 across 76 | **290 across 69** (still **zero `connect()` HOCs**) |
| Linaria files / `styled.` blocks | ~70 / — | 69 / 198 | 69 / 198 | **68 / 175** |
| `getTheme()` readers | 31 | 22 | 22 | **4** ✅ |
| `--wa-*` references / files | — | — | 110 | **382 across 67** |
| `light-dark()` outside `keep-*` | — | — | — | **229** (109 in `dark-mode.css`) |
| Hand-written Lit components | 24 plain-JS `.js` | 26 TypeScript | 26 TypeScript | **25 elements**, one base class, one bridge (24 wrappers) |
| `ThemeProvider` / `CssBaseline` mounts | — | 2 / 3 | 2 / 3 | **1 / 1** (both in `AppShell.tsx`) |
| WebAwesome version | 3.6.0 | 3.10.0 | 3.10.0 | **3.10.0**, `wa-page` **in production** |
| **Test files / tests** | 4 / 34 | 53 / 509 | 63 / 636 | **70 / 747** ✅ |
| Line coverage | ≈0 % | 26.5 % | 32.4 % | **34.72 %** (utils 99.3, services 96.8, reducers 100, keep-elements 84.5) |
| `as any` (dispatch-thunk subset) | 151 (97) | 154 (95) | 154 (95) | **153 (94)** |
| `@ts-ignore` / silent `catch` / `console.*` | 1 / 3 / 80 | 1 / 1 / 76 | 1 / 1 / 0 | **0 / 0 / 0** ✅ |
| Static analysis | none | oxlint, gates CI | + `no-console` | **oxlint + SonarQube Cloud gate** ✅ |
| Production entry chunk | not measured | 6.94 MB / 1.88 MB gzip | 6,322.51 kB / 1,703.85 kB | **2,111.11 kB / 594.20 kB gzip** ✅ |
| `npm audit` | 9 alerts | 10 high | 10 high, 0 critical | **10 high, 0 critical, 0 browser-reachable** |
| Dependabot alerts on `main` / skew | — | 9 / — | 9 / 80 commits | **16 / 160 commits** ⚠️ |
| Largest files | `store/databases/action.ts` 2,953 | 2,882 | 2,883 | `store/databases/action.ts` **2,885**; `TabsAccess.tsx` 1,007; `FormsContainer.tsx` 807 — `CommonStyles.tsx` **off the list** |

## Suggested execution order

1. **Merge `new_code` to `main`.** It is the highest-leverage item in the program right now
   and it is not a code change: 160 commits of skew is hiding the one genuinely live
   dependency finding behind fifteen stale alerts (report 05).
2. **Land #685 (CSP).** Drop `script-src 'unsafe-inline'` from the two SPA profiles — the
   precondition is verified — and reconcile `style-src-attr` against the 20 inline
   attributes. This is what makes #684's closure of the token-storage P0 real.
3. **Decide #702 (DataGrid).** It gates 5 screens, the people/groups domain, the last
   `@mui/x-*` package, and report 04's ability to drop React. Decide early even though the
   migration lands late.
4. **Then run three tracks in parallel:**
   - *Styles* — #765 (the token tail + layout utilities), sequenced with #709.
   - *Components* — report 02 Phases 1 and 3 (presentational leaves, overlays), plus #718
     (icons), which is the largest single source of remaining MUI imports.
   - *Tests* — #690 (thunk coverage; consider #711's split first) and #691 (React component
     smoke tests, now that `renderWithProviders()` exists).
5. **Capstone:** report 04 — router (#716), `react-redux`→`StoreController` (#715),
   Formik→native+Yup (#717), swap the entry point, then drop `react`/`react-dom`/`@mui/*`
   and verify the grep-based Definition of Done.
