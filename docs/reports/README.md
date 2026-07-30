# Keep Admin UI — Code Quality & Migration Reports

Six analysis reports covering the state of `@hcl-software/domino-rest-adminclient` and a
staged program to modernize it: Jest→Vitest, React→Lit/WebAwesome, a WebAwesome design-token
layout, and full React removal — plus **[06 — Wave execution plan](./06-waves.md)**, the
operational companion that turns them into assignable work.

> 👉 **If you have been handed a wave to implement, go straight to
> [06-waves.md](./06-waves.md).** Reports 00–05 say what is wrong and why; 06 says who picks
> up what, in which order, and how they know they are done. It is measured against
> `new_code` @ `0d5458c` and supersedes any earlier wave table.

**Originally generated 2026-07-24. Refreshed 2026-07-30** against branch `new_code` @
`0d5458c` (previous refreshes: `fcab645`, `e17010c`, `7594672`) — every metric re-measured,
every checklist item re-scored, and the dependency and CSP claims re-verified against the
installed `@awesome.me/webawesome@3.10.0` and the tracked `jar/config/config.json`.

> **Status:** these are **analysis/planning documents**. Each report opens with a "what
> changed" table and ends with a phased, effort-tagged (S/M/L) checklist.

## ✅ The branch is green, and every gate passes

On `0d5458c`:

```
npm run lint          exit 0
npm run typecheck     exit 0
npm run build         exit 0
npm run bundle:budget exit 0       887.5 kB raw / 243.7 kB gzip  (budget 901.2 / 245.9)
npm test              exit 0       133 files, 1709 tests, 70.18 % lines
npm audit                          0 vulnerabilities
```

CI runs all five in `pr_check.yml` on Node 24, in that order, plus a SonarQube scan and
quality gate.

> **Note for anyone reading a draft of this refresh dated earlier today.** It opened by
> reporting three red gates on `5f0b913` — an unused `keepBlockDiagram` import in
> `Section.tsx:15` that failed `lint`, `typecheck` and `build`. **`0d5458c` removed it**, so
> that finding is closed and has been struck from the reports rather than carried.

## ✅ The P0 queue is empty, and this time the control exists

**#685 landed.** The last refresh flagged that #684 had closed the JWT-in-`localStorage` P0
on the strength of "CSP tightening as the compensating control", while the shipped policy
still allowed `script-src 'unsafe-inline'` on exactly the two routes serving the SPA
document. Both now send `script-src 'self'`, plus `style-src-attr 'none'`,
`style-src-elem 'self'` and `report-uri /api/csp-violation-report`. The compensating control
is real rather than promised.

Two residual notes, neither a P0: the **asset** route `/admin/*` is now the *loosest* profile
(`style-src 'self' 'unsafe-inline'`, the legacy combined directive) — the inverse of how it
used to be; and `connect-src` keeps its `*` deliberately, because the admin UI talks to
whatever Domino host serves it.

## ✅ Four long-standing tech-debt items closed at once

Report 00 had been calling these its own worst debt for four revisions:

| Was | Now | Where |
|---|---|---|
| **153** `as any`, **94** of them `dispatch(… as any)` | **44**, **0** dispatch casts | #694 |
| **17** hand-written `switch(action.type)` reducers | **0** — 17 `createSlice` modules over 10 slices | #710 |
| `store/databases/action.ts` at **2,885** lines, 5.8 % covered | **47** lines, 13 modules, **84.4 %** covered | #711, #801–#805 |
| **10 high** `npm audit` findings | ✅ **0 vulnerabilities** | #699, #716 |

## ⚠️ The GitHub security tab is now purely noise

Dependabot scans the **default branch `main`**, which is **479 commits behind** `new_code`
(was 160, and 80 before that). It reports **16 open alerts** — and **all 16 are now fixed
here**, including both criticals (`happy-dom`, resolved at `20.11.1`).

The two that were genuinely live last refresh both cleared, by opposite routes: the
`brace-expansion` DoS got a published fix (**5.0.8** installed), and the `react-router`
advisory was cleared by **deleting the package** (#716 replaced it with a 2-file in-repo
router at 97.8 % coverage) rather than bumping it.

**`npm audit` on this branch reports 0 vulnerabilities.** 16 open alerts against a tree with
zero actual vulnerabilities trains everyone to ignore the security tab, which is the state in
which a real alert gets missed. Merging `new_code` is the entire remaining remediation.
Details in [report 05](./05-dependabot-triage.md).

## The reports

| # | Report | Scope | Status |
|---|--------|-------|--------|
| 00 | [Code quality & issues](./00-code-quality.md) | Cross-cutting quality/risk: security, lint & Sonar, `as any`, legacy Redux, God files, bundle | ✅ **P0 queue empty**, CSP control landed (#685); 4 long-standing P1/P2 items closed |
| 01 | [Vitest migration & coverage](./01-vitest-and-coverage.md) | Jest→Vitest, then coverage starting with pure reducers/utils | ✅ **COMPLETE and green** — 4 → **1709 tests**, **70.18 %**; 14 per-path gates (#880) |
| 02 | [React → Lit / WebAwesome](./02-react-to-lit-webawesome.md) | Component inventory → `wa-*` / `keep-*` / new Lit / keep; the hard cases | ✅ **Every MUI blocker closed** — DataGrid solved by building `keep-data-table` (#771). 50 elements |
| 03 | [wa-page & design tokens](./03-wa-page-and-design-tokens.md) | App shell on `wa-page` + WA tokens, Linaria tokenization, stripping Material Design | ✅ **DELIVERED** — shell, tokens and icons all shipped; a `light-dark()` tail remains |
| 04 | [Remove React](./04-remove-react.md) | Capstone: routing, `react-redux`→Lit controllers, Formik, entry point, sequencing | 🟡 **Now executing, not planning.** P0/P1/P3 ✅; **39 views converted**; P2 is 79 files left |
| 05 | [Dependency triage](./05-dependabot-triage.md) | Dependabot alerts, `npm audit` re-audit, and the `main`-vs-`new_code` branch skew | ✅ **Done** — 0 vulnerabilities, 0 of 16 alerts live. Just merge `new_code` |
| 06 | [**Wave execution plan**](./06-waves.md) | Lanes, waves, dependency graph, per-issue entry points, house rules, traps | 🟢 **Live** — the pickup document. **Single-lane now**: #806 is the whole critical path |

## The one number that matters

**#806 — the per-file leaf pass — is the only thing on the critical path.** Nothing feeds it;
#709, #719 and #786 all wait on it.

| | Report 04 baseline | `fcab645` | **`0d5458c`** |
|---|--:|--:|--:|
| `.tsx` files | 130 | 125 | **86** |
| files left in the pass | — | — | **79 / 16,682 LOC** |
| files importing `@mui/*` | 82 | 75 | **43** |
| `useSelector`/`useDispatch` sites | 323 | 178 | **146** |
| Formik files | 19 | 19 | **12** |
| registered `keep-*` elements | — | 25 | **50** |

⚠️ **Two counting rules, or these numbers will mislead you.**

1. **A React shim over a web component is not remaining work.** 34 files — the 32
   `@lit/react` wrappers, their barrel, and one re-export — hold no logic and are *deleted
   with their last consumer*. **32 of the tree's 101 React importers are these shims.**
2. **`useSelector`/`useDispatch` will stay flat and then collapse.** The converted files were
   chosen for having no store access; the remaining 146 sites sit overwhelmingly in route
   components that cannot convert until the shell does (P4). Not a progress bar.

## What changed in this refresh (`fcab645` → `0d5458c`)

**319 commits, 99 merged PRs (#753–#922)** — by far the largest delta between refreshes, and
the round in which **the programme stopped planning and started executing**. Report 04 had
opened every previous revision with "no React view has been removed yet"; 39 have now been
converted. Every remaining blocker in reports 02, 03 and 04 closed, and report 05's work is
finished outright. The full per-report detail is in each document's own "what changed" table;
the headlines are in the sections above.

<details>
<summary>The previous refresh (`e17010c` → `fcab645`), kept for the record</summary>

80 commits, 34 merged PRs (#723–#767). The theme of that round was **the foundation being
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

</details>

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

1. ✅ **All gates green.** An earlier draft of this refresh reported three red gates on
   `5f0b913` from one unused import; `0d5458c` removed it. Recorded only because the shape
   recurs: CI runs `lint → typecheck → build` before `test`, so one unused import makes every
   other gate unreadable. — *report 00*
2. ✅ **The CSP compensating control has landed.** #684 accepted plaintext JWTs in
   `localStorage` on the strength of CSP tightening, and **#685 delivered it**: both SPA
   document routes now send `script-src 'self'`, `style-src-attr 'none'`, `style-src-elem
   'self'` and a `report-uri`, and the 20 inline `style="…"` attributes are gone (**0** real
   occurrences). — *reports 00, 03*
3. ✅ **MUI X DataGrid is resolved — by building, not buying.** #771 authored
   `keep-data-table` and migrated all six MUI `<Table>` screens; #770 deleted the
   People/Groups screens and `@mui/x-data-grid` with them. Worth recording that this report
   recommended a third-party grid and the custom table won: the usages were far smaller than a
   general-purpose grid. — *reports 02, 04*
4. 🟡 **The token sweep is smaller but still looks finished when it is not.** **131
   `light-dark()` literals** remain (down from 229) — 84 of them in `dark-mode.css`, now 395
   lines. **54 of its 75 selectors contain `.Mui`**, so it is two jobs: that half is deleted by
   **#709**, the rest retires per file inside **#806**. Plus **256** raw hex literals in
   `.ts`/`.tsx`. — *report 03*
5. ⚠️ **#765 closed with its layout half deliberately dropped.** `wa-stack` / `wa-cluster` /
   `wa-grid` adoption is **zero** and the strings have never existed in `src`. Do not cite
   #765 as evidence they are in use. The primitives should arrive in *new* layout. — *report 03*
6. 🔴 **`@vitejs/plugin-react-swc` cannot simply be deleted** in report 04's purge phase.
   It is what applies `tsDecorators` + `useDefineForClassFields: false` to all TypeScript —
   remove it without replacing that configuration and every Lit element silently stops
   reacting (class-field shadowing). **#747** removes the coupling. — *report 04 §2*
7. ⚠️ **The suite cannot see styling — and this has now cost two shipped bugs.**
   `vitest.config.ts` runs with `css: false` and jsdom
   has no canvas backend, so every guard on the token layer is a *source-scanning* test that
   pins structure, not appearance. **A green suite is not evidence that a visual change
   looks right**, and most screens sit behind login — budget a human click-through in both
   colour modes for anything touching report 03. — *reports 01 §B4, 03 §7*
8. ✅ ~~`<wa-page>` is Pro~~ · ✅ ~~Static analysis is off~~ · ✅ ~~MUI X DataGrid~~ ·
   ✅ ~~The icon systems~~ · ✅ ~~`npm audit`~~ · ✅ ~~Untyped dispatch~~ ·
   ✅ ~~Classic Redux~~ · ✅ ~~The God action file~~ — all resolved.

## Current-state snapshot (grounding numbers)

Measured on `new_code` @ `0d5458c`. Figures vary slightly by grep method; treat small
deltas as noise.

| Metric | 2026-07-24 | `e17010c` | `fcab645` | **`0d5458c`** |
|---|---|---|---|---|
| Source files (`.tsx` / `.ts`) | ~135 / ~75 | 130 / 105 | 125 / 107 | **86 / 162** |
| React importers (`.ts`+`.tsx`) | ~109 | 108 | 97 | **101 raw / 69 excl. wrapper shims** |
| Files importing `@mui/material` | ~72–84 | 69 | 60 `.tsx` (75 any `@mui/*`) | **43** — the only MUI package left |
| `@mui/icons-material` / `react-icons` | 47 / 18 files | 45 / 18 | 41 / 18 | ✅ **0 / 0** — both uninstalled |
| MUI X packages | 3 | 3 | 1 | ✅ **0** |
| Redux call sites (`useSelector`/`useDispatch`) | ~344 across ~85 | 323 across 76 | 290 across 69 | **146 across 54** (still **zero `connect()` HOCs**) |
| `dispatch(… as any)` | 97 | 95 | 94 | ✅ **0** |
| `switch(action.type)` reducers / `createSlice` | 17 / 0 | 17 / 0 | 17 / 0 | ✅ **0 / 17 modules, 10 slices** |
| Linaria files / `styled.` blocks | ~70 / — | 69 / 198 | 68 / 175 | **50 / 148** |
| `getTheme()` readers | 31 | 22 | 4 | **6** |
| `--wa-*` references / files | — | 110 | 382 across 67 | **504 across 67**; 34 tokens read, **all resolve** |
| `light-dark()` literals | — | — | 229 (109 in `dark-mode.css`) | **131** (84 in `dark-mode.css`, now 395 lines) |
| `wa-stack`/`wa-cluster`/`wa-grid` | 0 | 0 | 0 | **0** — ⚠️ #765's layout half was **dropped**, not adopted |
| Hand-written Lit components | 24 plain-JS `.js` | 26 TypeScript | 25 elements, 24 wrappers | **50 elements**, one base class, **32** wrappers (0 orphaned) |
| `ThemeProvider` / `CssBaseline` mounts | — | 2 / 3 | 1 / 1 | **1 / 1** (both `AppShell.tsx`) 🔴 #709 |
| Router | `react-router-dom` v7 | v7.18.1, 31 files | v7.18.1, 29 files | ✅ **removed** — in-repo `src/router/`, 2 files, 97.8 % covered |
| WebAwesome version | 3.6.0 | 3.10.0 | 3.10.0 | **3.10.0**, `wa-page` **in production** |
| **Test files / tests** | 4 / 34 | 63 / 636 | 70 / 747 | **133 / 1709** ✅ |
| Line coverage | ≈0 % | 32.4 % | 34.72 % | **70.18 %** (utils 99.3, router 97.8, services 96.1, reducers 100, keep-elements 89.4, store/databases 84.4) |
| Coverage gates | none | global + 4 | global + 4 | **global 61 % + 14 per-path** (#880) |
| `as any` (whole `src`) | 151 | 154 | 153 | **44** |
| `@ts-ignore` / silent `catch` / `console.*` / inline `style=` | 1 / 3 / 80 / — | 1 / 1 / 0 / — | 0 / 0 / 0 / 20 | ✅ **0 / 0 / 0 / 0** |
| Static analysis | none | oxlint + `no-console` | oxlint + SonarQube gate | **same — and currently failing**, 1 error |
| Eager bundle closure | not measured | not measured | not measured | **887.5 kB / 243.7 kB gzip** (budget 901.2 / 245.9 — raw headroom temporarily **3 %** for #806, gzip 2 %) |
| Entry chunk (misleading alone) | not measured | 6,322.51 kB | 2,111.11 kB | **323.5 kB** |
| `dependencies` / `devDependencies` | 32 / 17 | 32 / 17 | 21 / 17 | **18 / 17** |
| `npm audit` | 9 alerts | 10 high | 10 high, 0 reachable | ✅ **0 vulnerabilities** |
| Dependabot alerts on `main` / skew | — | 9 / 80 commits | 16 / 160 commits | **16 / 479 commits** ⚠️ — but **0 live here** |
| Largest files | `store/databases/action.ts` 2,953 | 2,883 | 2,885 | `TabsAccess.tsx` **1,002**; `FormsContainer.tsx` 804; `store/databases/types.ts` 778 — `action.ts` **47** and `CommonStyles.tsx` **20**, both off the list |

⚠️ **`.tsx` fell 125 → 86 while `.ts` rose 107 → 162, and total LOC is flat at ~37,400.**
That is #806 working as designed: files are *converted* from React to Lit, not deleted, so the
work shows as a migration between the two columns rather than a shrinking tree. Flat LOC does
not mean nothing happened.

⚠️ **Two entries in "largest files" are Lit elements, not React** — `keep-source.ts` (776) and
`keep-quick-config-form.ts` (658). Converting a file does not make it small; #712's extraction
technique applies to elements too.

## Suggested execution order

**Superseded by [06 — Wave execution plan](./06-waves.md).** **Items 2–5 have all landed**
(#788/#795 CSP, #771/#770 DataGrid, #716 router, #798 `StoreController`, #807
`FormController`, #718 icons, #710/#711 the store, #690/#801–#805 thunk coverage). Item 1 —
merge `new_code` → `main` — is still open as PR **#786** and is a Wave 3 gate; the skew is now
**479 commits**. Go to report 06 for the current ordering.

**The short version of the current order:** take a #806 subtree (whole, not by tier), then
#709, then #719.

<details>
<summary>The 2026-07-28 ordering, kept for the record</summary>

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

</details>
