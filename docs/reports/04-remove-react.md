# Report 04 — Capstone Roadmap: Fully Remove React

**Scope:** End-state plan to eliminate React (and every React-coupled dependency) from
`@hcl-software/domino-rest-adminclient`, leaving a Lit + WebAwesome + framework-agnostic
Redux SPA on Vite.

> **Refreshed 2026-07-30** against branch `new_code` @ `0d5458c`. Previous refreshes:
> `fcab645` (2026-07-28), `e17010c` and `7594672` (both 2026-07-27). Originally written
> 2026-07-24.
>
> **This is the refresh where the plan became execution.** Every previous revision opened
> with "no React view has been removed yet". That is no longer true — **39 `.tsx` views have
> been converted to Lit elements** since `fcab645`, and the phases this report defines are
> now being worked, not staged.
> - ✅ **P0 is complete.** Both primitives exist and have production users:
>   `StoreController` (#798, **11** users) and `FormController` (#807, **2**). §3 and §4 are
>   no longer proposals.
> - ✅ **P1 is complete.** `react-router-dom` is **gone** — #716 replaced it with a 2-file
>   in-repo router at `src/router/`, covered at **97.8 %**, and #813 added route-level code
>   splitting on top. §10 is closed.
> - 🟡 **P2 is in flight and is the whole critical path.** The per-file leaf pass (**#806**)
>   has taken `.tsx` from 125 to **86**, and **79 files / 16,682 LOC** remain. Nothing feeds
>   it; #709, #719 and #786 all wait on it.
> - ✅ **Every blocker is cleared.** MUI X DataGrid — the one blocker the last refresh
>   carried — is **gone** (#770 deleted the People/Groups screens with it), and the icon
>   systems are gone too (#718/#913). `dependencies` is down from 32 → 26 → **19**.
> - ✅ **The store is no longer a liability.** #710 finished `createSlice`, #711 split the
>   2,885-line God action file into 13 modules, #694 typed the dispatch and removed all 94
>   `dispatch(… as any)` casts. Report 00's P1-1/2/3 all closed.
> - ⚠️ **The test suite is no longer "mostly React-free".** **25 of 133** files use
>   `@testing-library/react`, up from 7 of 70 — because #806's characterization suites test
>   React components *before* converting them. §8 grew from a 7-file job to a 25-file one,
>   deliberately, and those files are deleted with their subjects.
> - ✅ **G0 is green.** `lint`, `typecheck`, `build`, `bundle:budget` and `test` all exit 0
>   (**133 files / 1709 tests, 70.18 %**), and `npm audit` reports 0 vulnerabilities.

### The counting rule this report now uses

**A `.ts`/`.tsx` file whose entire content is a React binding for a `keep-*` element is not
counted as remaining work.** It holds no logic — one `@lit/react` `createComponent` call, or
a re-export of one — and its correct end state is *deletion alongside its last consumer*.

The excluded set is **34 files**: the 32 wrappers under `components/keep-elements/react/`,
the `KeepElements.tsx` barrel, and `commons/ZeroResultsWrapper.tsx`. **32 of the tree's 101
React importers are these shims**, so roughly a third of §11's exit gate
(`grep -rn "from 'react'" src` empty) is satisfied by deletion rather than conversion.
`test/keep-element-wrappers.test.ts` fails if a wrapper outlives its last consumer, which is
why the orphan count is 0 rather than the 16 that had quietly accumulated.

**This report orchestrates the others.** It sequences and gates the whole migration and
covers the React-specific plumbing (entry point, routing, `react-redux`, Formik, Monaco
wrapper). For component-by-component MUI→Lit/WebAwesome conversion and the icon
catalogue, defer to:

- **Report 00** — cross-cutting code quality; the `as any` / typed-dispatch work in P1-1
  is a direct prerequisite for §3.
- **Report 01** — test tooling; the coverage that makes this rewrite survivable.
- **Report 02** — MUI → Lit/WebAwesome component migration (the 125 `.tsx` views). The
  date-picker, tree-view and DataGrid replacements are all ✅ done; what remains is
  `@mui/material` in **43** files (**#709**), executed per-file inside **#806**.
- **Report 03** — the `wa-page` shell, design tokens, and icon migration
  (`@mui/icons-material` + `react-icons` + `app-icons.ts` → `<wa-icon>`).

React cannot be removed until reports 02 and 03 are essentially complete; this plan
defines the gates that make that ordering explicit.

---

## 1. Current-state snapshot (verified 2026-07-30)

| Fact | 2026-07-24 | `e17010c` | `fcab645` | **`0d5458c`** | Source |
|---|---|---|---|---|---|
| `.tsx` files | 135 | 130 | 125 | **86** (84 excl. wc shims) | `find src -name '*.tsx'` |
| `.tsx`/`.ts` importing React | 109 | 107 | 97 | **101 raw / 69 excl. shims** | `grep -rln "from 'react'"` |
| **Files left in the #806 pass** | — | — | — | **79 / 16,682 LOC** | per-tier, §9 |
| Files using `react-redux` | 85 | 77 | 70 | **51** | grep |
| `useSelector` call sites | 224 | 207 | 178 | **137** | grep |
| `useDispatch` call sites | 120 | 116 | 112 | **9** + `useAppDispatch` **82** | grep — #694 typed it |
| `connect()` HOC call sites | **0** | 0 | 0 | **0** | grep — all Redux consumption is via hooks |
| `StoreController` production users | — | — | 0 | **11** ✅ | grep — §3 shipped |
| `FormController` production users | — | — | — | **2** ✅ | grep — §4 shipped |
| `createSelector` (memoized selectors) | — | 0 | 0 | **2** | grep — see §3 |
| `React.lazy` / `Suspense` | — | 0 | 0 | **in use** ✅ (#813) | one memoised `lazy()` per `load` route |
| `dispatch(… as any)` casts | — | 95 | 94 | **0** ✅ (#694) | grep |
| `as any` (whole `src`) | — | 154 | 153 | **44** | grep |
| Files using `formik` | 19 | 19 | 19 | **12** | `grep -rl "from 'formik'"` |
| Files using `yup` | 7 | 7 | 7 | **4** | grep |
| `@mui/material` imports | 70 files | 69 / 175 refs | 60 / 149 refs | **43 files / 84 refs** | grep |
| `@mui/icons-material` imports | 47 files | 45 / 99 refs | 41 / 87 refs | ➖ **gone** ✅ (#718/#913) | `package.json` |
| `react-icons` imports | 18 files | 18 | 18 | ➖ **gone** ✅ (#718/#913) | `package.json` |
| `@mui/x-data-grid` | 5 files | 5 | 5 🔴 | ➖ **gone** ✅ (#770) | `package.json` |
| `@mui/x-date-pickers` / `-tree-view` / `@mui/lab` | present | gone | gone | ➖ gone | `package.json` |
| `@monaco-editor/*` | 1 file | 0 imports | gone from deps | ➖ gone | `package.json` |
| `dayjs` | dep | dep | 🟡 dep, 0 consumers | ➖ **gone** | `package.json` |
| `immer` / `redux` direct importers | — | — | — | `immer` ✅ **dropped** (`e27102f`); `redux` **0** importers, still declared 🟡 | grep |
| `@emotion/*` direct imports in `src` | **0** | 0 | 0 | **0** (MUI peer only) | grep |
| Hand-written Lit web components | 24 plain-JS | 26 TS | 25 elements | **50 elements** (54 `.ts`) | `src/components/keep-elements/` |
| `@lit/react` bridge | 1 file | 1 file | 1 file, 24 wrappers | **32 wrappers**, one per file + a 59-line barrel | `keep-elements/react/` |
| Orphaned wrappers | — | — | — | **0** (was 16) — gated by a test | `test/keep-element-wrappers.test.ts` |
| WA React wrappers used directly | 0 | 0 | 1 (`WaPage`) | **≥5** — `WaPage`, `WaBreadcrumb`, `WaBreadcrumbItem`, `WaIcon`, `WaInput` | grep |
| `@testing-library/react` | 4 of 4 | 4 of 63 | 7 of 70 | **25 of 133** ⚠️ up, by design | grep |
| Framework-agnostic element tests | 0 | 28 | 29 | **43** (via `test/test-utils/lit.ts`) | grep |
| Router | `react-router-dom` v7 | v7.18.1, 31 files | v7.18.1, 29 files | ➖ **REMOVED** ✅ (#716) — in-repo `src/router/`, 2 files, **97.8 %** covered | `package.json` |
| Route tables | 3 `<Routes>` | 2 | 2 | **2** — `App.tsx`, `Views.tsx`, now plain `RouteDef[]` arrays | grep |
| Live route paths | — | 9 | 9 | **9** — `/callback`, `*` in `App.tsx`; `/`, `/schema`, `/schema/:nsfPath/:dbName`, `/schema/…/access`, `/scope`, `/apps`, `/apps/consents` in `Views.tsx` | `App.tsx` + `Views.tsx` |
| Route hooks | `useNavigate` 14, `useLocation` 14, `useParams` 4 | unchanged | 14 / 13 / 4 | **25 / 29 / 11** — now the in-repo router's own hooks | grep |
| App shell | `HomeElement` (Linaria flex) | same | `AppShell` on `<wa-page>` ✅ | same | `src/AppShell.tsx` |
| `ThemeProvider` / `CssBaseline` mounts | 2 / 3 | 2 / 3 | 1 / 1 | **1 / 1** (both `AppShell.tsx`) 🔴 **#709** | grep |
| `getTheme()` readers | 31 | 22 | 4 | **6** | grep |
| Eager bundle closure | — | not measured | not measured | **887.5 kB raw / 243.7 kB gzip** | `npm run bundle:budget` — §7 |
| Entry chunk (misleading alone) | — | 6,322.51 kB | 2,111.11 kB | **323.5 kB** | see §7 |

Key versions at `0d5458c`: react **19.2.8** · react-dom 19.2.8 · react-redux 9.3.0 ·
@reduxjs/toolkit **2.12.0** · @mui/material 9.2.0 · @awesome.me/webawesome 3.10.0 ·
lit 3.3.3 · monaco-editor 0.55.1 · prettier 3.9.6 · typescript 7.0.2 · vite 8.1.5 ·
vitest 4.1.10. **18** `dependencies` (was 26, and 32 originally), 17 `devDependencies`.

**What de-risks the remaining effort:**

1. **Zero `connect()` HOCs, and both primitives now exist.** Every store read/write goes
   through hooks, and `StoreController` (11 users) has proven the hook→controller swap is
   mechanical. This is no longer a prediction.
2. **The Redux store is framework-agnostic *and* modern.** #710 migrated all 10 slices to
   `createSlice`, #711 split the God action file into 13 modules, and #694 typed the
   dispatch. Reducers are at **100 %** line coverage, `store/databases` at **84.4 %**. The
   store survives React's removal untouched.
3. **50 typed Lit elements already exist**, individually unit-tested without React, and
   augment `HTMLElementTagNameMap` for direct-DOM typing. Removing React means deleting the
   32 adapters and using the elements directly — these components get *simpler*, not
   rewritten.
4. **The remaining work is enumerated per file, not estimated.** §9 and #806 carry a
   four-tier breakdown of all 79 files by axis (MUI, store, Formik), derived mechanically
   from the tree rather than carried forward.

⚠️ **Two claims from previous revisions are now false and should not be repeated:**

- **"The test suite is mostly already React-free."** It is less React-free than it was:
  **25 of 133** files use `@testing-library/react`, up from 7 of 70. That is deliberate —
  #806 writes characterization suites against a React component *before* converting it
  (#880 for `BreadcrumbRouter`, #885 for the five Formik shapes), and those suites are
  deleted with their subjects. But §8 is a 25-file job now, not a 7-file one.
- **"No React view has been removed yet."** 39 have.

✅ **The route inventory is stable at 9 paths across 2 tables**, and both tables are now
plain `RouteDef[]` arrays consumed by the in-repo router rather than JSX `<Routes>` trees —
so §10's replacement work is done. The `/groups`, `/people` and `/mail` shells are gone with
the People/Groups deletion (#770).

---

## 2. Dependency removal map

Status legend: **Drop** = delete outright, no replacement needed · **Swap** = drop-in
replacement already available · **Work** = needs code/config authoring · **Hard** = large,
risky surface (owned by reports 02/03, listed here for completeness).

### Runtime dependencies

| Dependency | Replaced by | Effort | Notes |
|---|---|---|---|
| `react` | — (removed) | Drop | Last thing to go; gated on everything below. |
| `react-dom` | Lit rendering + custom-element root | Drop | Entry point swap (§7). |
| `react-redux` | Lit `StoreController` reactive controller (§3) | **Work** | **70 files, 290 hook call sites** (was 77/323) — mechanical but broad. Tracked as **#715**. |
| `react-router-dom` 7.18.1 | Small custom router (History API) or `@lit-labs/router` (§10) | **Work** | **9 live route paths** across 2 `<Routes>` hosts. **29** importing files (was 31). Tracked as **#716**. The remaining `react-router` advisory is RSC-mode-only and not reachable here — the DoS and open-redirect ones were cleared by 7.18.1 (report 05). |
| `@lit/react` | Direct custom-element usage (delete `KeepElements.tsx`) | Drop | Bridge is only needed *because of* React. **24** `createComponent` wrappers in one file. ⚠️ Also delete the `WaPage` React wrapper `AppShell.tsx` imports — `<wa-page>` is used directly once React is gone. |
| ~~`@monaco-editor/react`~~, ~~`@monaco-editor/loader`~~ | `keep-monaco-editor` | ✅ **DONE** (#675) | Both deleted from `dependencies`, together with the `disabledpostinstall` script that fed the AMD loader. |
| `monaco-editor` | **Keep** — direct dependency, imported by `keep-monaco-editor` | — | ✅ Now a **dynamic** `import()` (#693/#729), along with its three workers and the editor CSS. `editor.api2` is a 3,626.93 kB chunk fetched on first use. |
| `prettier` 3.9.6 | **Keep** | ✅ **done** | #673 moved it to `dependencies` *and* behind a memoised dynamic `import()` — it now code-splits out of the entry chunk (report 00 P0-10 closed). |
| ~~`react-icons`~~ | WebAwesome `<wa-icon>` | ➖ | ✅ **gone** — uninstalled in #718/#913 |
| `@mui/icons-material` | WebAwesome `<wa-icon>` (report 03 §6.4) | Hard→03 | **41** files. **#718** |
| `@mui/material` | Lit + WebAwesome components (report 02) | Hard→02 | **60 `.tsx`** — largest surface. **#709** |
| ~~`@mui/lab`~~ | — | ✅ **already removed** | `0349a71`. |
| ~~`@mui/x-data-grid`~~ | custom Lit table | ➖ | ✅ **gone** — #771 built `keep-data-table` and migrated all six MUI `<Table>` screens; #770 then deleted the People/Groups screens and the package. Was the riskiest single widget for four revisions |
| ~~`@mui/x-date-pickers`~~ | `keep-input-date` on `wa-input[type=date]` | ✅ **DONE** (#703) | Removed from `package.json`. Authored, not bought. |
| ~~`@mui/x-tree-view`~~ | `keep-tree` on `wa-tree`/`wa-tree-item` | ✅ **DONE** (#704) | Removed from `package.json`. It was flagged as the cheapest MUI X removal and it was. |
| `@emotion/react`, `@emotion/styled` | — (removed) | Drop | MUI peers only; **0** direct imports. |
| `formik` | `FormController` + Yup (§4) | **Work** | **12** files (was 19). `FormController` shipped in #807 and has 2 production users. **#717** |
| `@fortawesome/fontawesome-free` 7.3.1 | — | **Keep** ✅ | Load-bearing: `src/services/icon-library.ts` imports its glyphs as `?url` SVGs to self-host WA icons. |
| ~~`@fontsource-variable/crimson-pro`, `@fontsource-variable/quicksand`~~ | — | ✅ **DONE** (#679) | Deleted; they had 0 imports anywhere. |
| `redux`, `@reduxjs/toolkit`, `redux-thunk` | **Keep** | — | Framework-agnostic; no change. |
| `lit`, `@awesome.me/webawesome` | **Keep / expand** | — | Target runtime. |
| `yup`, `uuid`, `immer` | **Keep** | — | Framework-agnostic. |
| `dayjs` | — | 🟡 **Drop candidate** | Existed for `@mui/x-date-pickers`' `AdapterDayjs`. After #703 the only textual match in `src` is a comment. Verify and remove. |
| `events` | `EventTarget` | 🟡 **Drop candidate** | A Node polyfill shipped to the browser for one consumer, `src/utils/token-emitter.ts`. `EventTarget` is native and does the same job. |
| `@linaria/react`, `@wyw-in-js/*` | ~~**Keep**~~ **Drop** | ✅ **done** (#825) | **Corrected.** Styling did *not* survive React removal: `@linaria/react`'s dist calls `React.createElement` and `React.forwardRef`, so `styled` is a React component factory. `@linaria/core` — the framework-agnostic `css` tag — was never a dependency here, and the Lit elements take their `css` from `lit`. Both packages are uninstalled; the layer was retired by the component migration one file at a time rather than by a sweep. |

### Build / test / lint / type dependencies

| Dependency | Action | Effort | Notes |
|---|---|---|---|
| `@vitejs/plugin-react-swc` (dev) | **Cannot simply remove** — see the caution below | **Work** | Its decorator configuration is what has to survive, not the plugin. The `wyw` (Linaria) plugin this row used to say to keep is **gone** (#825). |
| `@types/react`, `@types/react-dom` (dev) | **Remove** | Drop | After the last `.tsx` is gone. |
| `@testing-library/react` (dev) | Replace in **7 files** with `mountLit` / `@testing-library/dom` | **S** | Was 4 of 63, now **7 of 70** — the two LoginPage suites and `renderWithProviders.tsx` (§8). |
| `@testing-library/jest-dom` (dev) | Keep (DOM matchers, framework-agnostic) | — | Imported as `@testing-library/jest-dom/vitest`. |
| ~~`eslintConfig: react-app` / `react-app/jest`~~ | ✅ **already gone** | — | Replaced by `oxlint` + `.oxlintrc.json` (report 00 P0-3). The oxlint `"react"` plugin entry can be dropped at the very end. |
| ~~`jest.config.ts` React transform~~ | ✅ **already gone** | — | Jest removed entirely (report 01). |
| ~~`babel.config.js`~~ | ✅ **already gone** | — | Removed with the Jest migration. |
| `tsconfig.json` `"jsx": "react-jsx"` | Remove once no `.tsx` remain | **Work** | (§7). `experimentalDecorators: true` and `useDefineForClassFields: false` are **already set** ✅ |
| ~~`src/react-app-env.d.ts`~~ | **Delete** | ✅ **DONE** (#677) | Deleted; `src/vite-env.d.ts` carries the asset-module shims. |
| ~~`src/custom-elements.d.ts`~~ | ✅ **already gone** | — | Each element now augments `HTMLElementTagNameMap` itself. |
| ~~`disabledpostinstall` script~~ | **Delete** | ✅ **DONE** (#675) | It existed only to feed `@monaco-editor/loader`'s AMD path. Note `jar/config/config.json` still serves `/monaco-editor-core/*` with its own CSP — dead weight to clean up in #685. |

> ⚠️ **Caution on `@vitejs/plugin-react-swc`.** The previous revision listed it as a
> straight "Drop". It is not: the plugin is currently what applies
> `tsDecorators: true` + `useDefineForClassFields: false` to **all** TypeScript, which is
> exactly what the Lit elements need. Removing it without replacing that SWC configuration
> reintroduces Lit's class-field-shadowing bug across every element, silently. Replace it
> with a plain SWC/esbuild TS transform carrying the same decorator options — and change
> `vite.config.mts` and `vitest.config.ts` **together**.

**Net:** **16** of the current 32 `dependencies` go (`react`, `react-dom`, `react-redux`,
`react-router-dom`, `@lit/react`, `@monaco-editor/react`, `@monaco-editor/loader`,
`react-icons`, `@mui/icons-material`, `@mui/material`, `@mui/x-data-grid`,
`@mui/x-date-pickers`, `@mui/x-tree-view`, `@emotion/react`, `@emotion/styled`, `formik`;
`@mui/lab` was already removed), plus 3 devDeps (`@vitejs/plugin-react-swc` *if*
replaced, `@types/react`, `@types/react-dom`) and `@testing-library/react`. Two of the
16 — `@monaco-editor/react` and `@monaco-editor/loader` — **have no importers today** and
can be deleted immediately, ahead of every phase in §9.

---

## 3. State ↔ view binding without `react-redux`

**Keep** the Redux store exactly as-is (`configureStore` + `rootReducer` — now 10 slices on
RTK `createSlice` since #710, not the 17 classic
switch reducers). Replace only the *binding layer* (`Provider` / `useSelector` /
`useDispatch`). Because there are **zero `connect()` HOCs**, a single Lit **reactive
controller** covers every one of the 323 hook sites (207 `useSelector` + 116
`useDispatch`).

> **Note on the `createSlice` modernization (report 00 P1-2).** It remains *orthogonal* to
> this report — a `createSlice` store binds to a `StoreController` exactly as a
> `combineReducers` store does, so the two can be sequenced in either order. What changed
> at `e17010c` is the safety net: every `store/*/reducer.ts` clears the 95 %/95 %/90 %/88 %
> coverage gate in `vitest.config.ts`, and `test/store/account/action.test.ts` (#673) is
> the first test to pin a *thunk*'s contract rather than a reducer's. A `createSlice`
> rewrite now has behavioural parity tests to land against instead of a manual diff.

**Recommendation: a `StoreController` reactive controller + a module-level store
singleton.** `@lit/context` is available if per-subtree store injection is ever needed,
but this app has a single global store, so a shared singleton (imported like any module)
is simpler than a context provider and avoids re-plumbing 77 files with a consumer.

> **Prerequisite worth doing first:** report 00 P1-1 (typed `AppDispatch`). 95 of the call
> sites are `dispatch(thunk() as any)`. Fixing the dispatch type *before* the controller
> swap means `StoreController.dispatch` lands correctly typed and the casts disappear in
> the same pass instead of being carried across.

### Store singleton (replaces `Provider` in the entry point)

```ts
// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './index';
export const store = configureStore({ reducer: rootReducer });
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;
```

### The controller (replaces `useSelector` + `useDispatch`)

```ts
// src/store/StoreController.ts
import { ReactiveController, ReactiveControllerHost } from 'lit';
import { store, AppDispatch, AppState } from './store';

export class StoreController<T> implements ReactiveController {
  value!: T;
  private unsub?: () => void;
  constructor(
    private host: ReactiveControllerHost,
    private selector: (s: AppState) => T,
  ) {
    host.addController(this);
    this.value = selector(store.getState());
  }
  hostConnected() {
    this.unsub = store.subscribe(() => {
      const next = this.selector(store.getState());
      if (next !== this.value) {      // shallow ref check → re-render only on change
        this.value = next;
        this.host.requestUpdate();     // triggers Lit re-render
      }
    });
  }
  hostDisconnected() { this.unsub?.(); }
  dispatch: AppDispatch = store.dispatch;   // replaces useDispatch
}
```

### Consumption pattern (per element)

```ts
// React (before):
//   const { authenticated } = useSelector((s: AppState) => s.account);
//   const dispatch = useDispatch();
//   dispatch(authenticate());

// Lit (after):
@customElement('app-root')
class AppRoot extends KeepElement {
  private account = new StoreController(this, (s) => s.account);

  private onLogin() { this.account.dispatch(authenticate()); }

  render() {
    return html`${this.account.value.authenticated ? html`…` : html`<login-page></login-page>`}`;
  }
}
```

**Migration notes for the 77 files:**
- One `StoreController` per distinct selector (mirrors one `useSelector` each) — the
  codebase already writes narrow selectors, so this is a 1:1 rename.
- The shallow ref check is why report 00 P1-5 (no memoized selectors) matters here: an
  inline selector returning a fresh object re-renders on *every* store change. There are
  still **0 `createSelector` call sites** at `e17010c` against 207 `useSelector` sites.
  Introducing `createSelector` before or during this pass converts a latent React perf
  issue into a Lit correctness-of-cost issue you have already solved.
- `dispatch(x() as any)` thunks work unchanged — RTK's default middleware includes thunk.
- No `Provider` wrapper; elements import the controller.
- Extend `KeepElement` (report 02 §2.2) rather than `LitElement` directly, so new elements
  inherit the shared `emit()` contract.
- Effort: **L** by volume, **S** per file. Do it component-by-component *inside* the
  report-02 MUI→Lit conversion so a view is de-React-ed and de-react-redux-ed in one pass.

---

## 4. Forms — replace Formik

Formik is used only via `useFormik` (8 files) + `FormikProps` typing (11), always paired
with Yup schemas (already installed, 7 files). **Recommendation: a tiny `FormController`
reactive controller** that wraps native form state + the existing Yup schema. No new
dependency; Yup stays.

```ts
// src/utils/FormController.ts
import { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ObjectSchema } from 'yup';

export class FormController<T extends object> implements ReactiveController {
  values: T;
  errors: Partial<Record<keyof T, string>> = {};
  constructor(
    private host: ReactiveControllerHost,
    initial: T,
    private schema: ObjectSchema<any>,
    private onSubmit: (v: T) => void,
  ) { this.values = { ...initial }; host.addController(this); }
  hostConnected() {}

  handleInput = (e: Event) => {
    const el = e.target as HTMLInputElement;      // works with <wa-input>, native inputs
    (this.values as any)[el.name] = el.value;
    this.host.requestUpdate();
  };
  async submit(e: Event) {
    e.preventDefault();
    try { await this.schema.validate(this.values, { abortEarly: false }); this.errors = {}; this.onSubmit(this.values); }
    catch (err: any) {
      this.errors = Object.fromEntries(err.inner.map((i: any) => [i.path, i.message]));
    }
    this.host.requestUpdate();
  }
}
```

```ts
// usage inside a Lit form element
render() {
  return html`
    <form @submit=${(e: Event) => this.form.submit(e)}>
      <wa-input name="name" .value=${this.form.values.name} @input=${this.form.handleInput}></wa-input>
      ${this.form.errors.name ? html`<span class="err">${this.form.errors.name}</span>` : ''}
      <wa-button type="submit">Save</wa-button>
    </form>`;
}
```

WebAwesome `<wa-input>`/`<wa-select>` are form-associated custom elements exposing native
constraint validation, so for simple forms the controller can be skipped in favour of
`form.reportValidity()` + Yup on submit.

> **Testing note:** `test/setupTests.ts` installs a complete `attachInternals` mock
> **unconditionally**, because jsdom 29's own `ElementInternals` lacks `setValidity` —
> which WA form-associated elements call during Lit's update cycle. Any form conversion
> inherits that stub for free; do not "fix" it back to a conditional guard.

Effort: **M** (**12** files, and the schemas already exist and the pattern is uniform). ⚠️ `FormController` is proven but not battle-tested at scale: its 2 production users are the Quick Config pair, and `TabsAccess.tsx` at 1,002 LOC is 3× anything it has carried. Expect to find gaps in the larger shapes and **file them rather than work around them** — that is what #885/#888 did, and it surfaced #887 and #890. Fold
each form conversion into its report-02 component pass.

---

## 5. Editor — ✅ CLOSED

The `<monaco-editor>` element this section proposed **exists, is wired, and is now the only
Monaco surface**: `src/components/keep-elements/keep-monaco-editor.ts` (672 lines, tag
`keep-monaco-editor`, exported as `KeepMonacoEditor` with `events: { onChange: 'change' }`),
rendered by `FormsContainer.tsx`. It went further than the original sketch:

- **ESM Monaco**, not the AMD loader — and since #693/#729 loaded through a **dynamic
  `import()`** together with `editor.worker`, `json.worker`, `ts.worker` (Vite `?worker`)
  and the editor CSS. `worker-src 'self' blob:` in the CSP remains load-bearing (report 03
  §5).
- **Token-driven theme** — `src/services/editor-theme.ts` (`buildEditorTheme`,
  `EDITOR_TOKENS`) builds a Monaco theme from live WebAwesome tokens, resolved through
  `wa-color.ts` / `wa-typography.ts`. This replaces the hand-written
  `json-light`/`json-dark` JSON themes in `FormsContainer`.
- **Prettier formatting** via `prettier/standalone` — now behind a **memoised dynamic
  `import()`** (`fetchPrettier()` / `prettierBundle ??=`, lines 33–48), so the formatter is
  fetched on first use rather than bundled into the entry chunk.
- Namespaced logging via `getLogger('components/keep-monaco-editor')`.

✅ **`@monaco-editor/loader` and `@monaco-editor/react` are deleted** (#675), along with the
`postinstall` copy of `monaco-editor/min/vs` into `public/`.

**Status of the work items this section listed:**

1. ✅ **Test regressions fixed.** #668 added a fake-Monaco harness
   (`test/test-utils/monaco.ts`) plus a `queryCommandSupported` polyfill, and a full suite
   for the element. The suite is green (1709 tests) and `src/components/keep-elements` is at
   **89.7 %** line coverage against an **85 %** gate (#880 raised it from #686's 80).
2. ✅ **`prettier` moved to `dependencies`** (#673, report 00 P0-10 closed) — and made
   dynamic, which is what actually shrank the bundle. See §7.
3. ✅ **`FormsContainer.tsx` points at `<KeepMonacoEditor>`** (#669). The `defineTheme` /
   `handleEditorDidMount` logic moved to `editor-theme.ts` and the element's lifecycle;
   the file no longer imports `@monaco-editor/*`.
4. ✅ **Dropped `@monaco-editor/react` + `@monaco-editor/loader` and the
   `disabledpostinstall` script** (#675). Nothing reads `public/monaco-editor-core` any
   more — though `jar/config/config.json` still serves that path with its own CSP entry,
   which is dead weight to clean up in #685.
5. ➖ **Not applicable.** An earlier revision said to "repeat for
   `access/ScriptEditor.tsx`". That file has **never** used Monaco — it is an MUI
   `TextField` + `KeepTextformArray` editor. `FormsContainer.tsx` was the *only* Monaco
   consumer.
6. ✅ **Made the Monaco import dynamic** (#693/#729) — the item this section carried as
   "the largest remaining single win". It was: the entry chunk fell **6,322.51 kB →
   2,111.11 kB / 594.20 kB gzip** at the time, a 66.6 % cut, with `editor.api2` (3,626.93 kB) and ~90
   language chunks now fetched only when a Source tab opens.

**Nothing in this section is open.** The one caveat worth carrying: this is deferral, not
deletion — total shipped bytes are roughly unchanged, and a user who opens a schema still
downloads Monaco. What changed is that everyone else does not.

---

## 6. Icons — ✅ CLOSED

**Two of the three legacy icon systems are gone.** #718/#913 converted 115 sites across 43
files and **uninstalled both packages**: `@mui/icons-material` and `react-icons` have **0**
references anywhere in `src` and appear nowhere in `package.json`. `wa-icon` is used across
32 modules, fed by `src/services/icon-library.ts`, and `test/services/icon-library.test.ts`
fails on any glyph name not registered in `ICONS`.

`@fortawesome/fontawesome-free` is a **keeper**, not a removal candidate: the registry
imports its glyphs as `?url` SVGs and self-hosts them.

🟡 **What is left is `src/styles/app-icons.ts` — 216 KB of base64 SVG data URIs, 20
importers (#731).** It was deliberately out of scope for #718 because **15 of its 19 render
sites are `<img>`, not `wa-icon`**, so its conversion is not separable from the component
pass. Measure its weight against the **eager closure** (887.5 kB raw), not the entry-chunk
line.

### Three findings from #718 worth not relearning

1. **A live CDN dependency nobody knew about.** `<wa-page>`'s navigation toggle was fetching
   `bars.svg` from `ka-f.fontawesome.com` on every authenticated screen. The `connect-src`
   wildcard permitted it, so it neither failed nor reported — and the module's own comment
   claimed the opposite. **A missing `library` attribute on `wa-icon` silently falls back to
   the Font Awesome CDN.** Removing that was worth more than the codemod.
2. **The bundle did not shrink the way the issue predicted.** MUI's icon factory
   (`createSvgIcon`, 84.8 kB raw) left the eager closure, but the 44 bundled glyphs inline as
   base64 `data:` URIs — so raw ended up **+19.5 kB** and gzip **+4.9 kB** against the
   pre-codemod baseline. Still under budget. The real saving waits for `@mui/material` (#709).
3. **MUI had been silently overriding the app's own icon size classes** since the day they
   were written — `.MuiSvgIcon-root` and an app class are both specificity 0,1,0, and MUI's
   Emotion styles inject last, so MUI won every tie. **Deleting MUI therefore changes icon
   sizes whichever way you go**; honouring the long-dead classes shrinks some icons up to
   42 %. That is a design decision, not a codemod's call. Also: `wa-icon`'s default canvas is
   `fixed` — a 1.25em × 1em box, wider than the 1em × 1em the old sets drew — so adopting the
   default would have widened ~115 sites by 25 % invisibly.

---

## 7. Entry point & build

### `src/index.tsx` → `src/index.ts`

> ⚠️ **Name clash — `src/index.ts` already exists.** #707 created it for the appearance
> boot code (previously an inline `<script>` in `index.html`). `index.html` loads **both**
> module scripts today. Pick a different name for the app entry (`src/main.ts`) or fold the
> boot code into it deliberately; do not assume the filename is free.
>
> ⚠️ **And it must stay a module.** The #685 CSP tightening has now **landed** — both SPA
> document routes send `script-src 'self'` with no `'unsafe-inline'` — so an inline
> `<script>` in `index.html` is not merely discouraged, it will be blocked at runtime. Boot
> code goes in a separate module, always.

Replace `ReactDOM.createRoot(...).render(<Provider><App/></Provider>)` with a
custom-element mount. Everything else (the CSS imports, theme init) stays. There is
**no `setBasePath()` call to carry across** — see the note below.

```ts
// src/main.ts (was index.tsx)
import './index.css';
import './styles/styles.css';
import './styles/dark-mode.css';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import './styles/keep-theme.css';            // the token layer — must follow webawesome.css
import './styles/keep-overrides.css';
import './styles/app-shell.css';             // wa-page region styling (#707)
import './services/icon-library';            // registers the self-hosted WA icon library
import './store/store';       // instantiates the singleton store
import './app-root';          // defines <app-root> (was App.tsx)

// no createRoot, no <Provider> — the store is a module singleton (§3)
// no setBasePath() — see below
```

> **Import order is load-bearing:** `webawesome.css` → `keep-theme.css` →
> `keep-overrides.css`. WA's own theme tokens live inside `@layer wa-theme`, so
> `keep-theme.css`'s unlayered declarations win — but only if they come after.
> `test/styles/keep-theme.test.ts` guards the token values, not the order.

> ✅ **The base-path defect is fixed.** The previous revision said to "fix the base path
> while you are here: it currently pins `webawesome@3.6.0` while 3.10.0 is installed
> (report 00 P0-9)". That call is **gone** from `src/index.tsx` as of `e17010c`, with a
> comment explaining why: WA 3.x feeds the base path to exactly one consumer, the
> autoloader, and this app imports all its WA components explicitly. Icons resolve through
> `services/icon-library.ts` instead, guarded by `icon-library.test.ts`. **Do not
> reintroduce `setBasePath()` during the entry-point swap.**

### `index.html`

Swap the mount node/script and keep the pre-render theme script (which already sets
`.wa-dark`):

```html
<!-- was: <div id="root"></div><script type="module" src="/src/index.tsx"></script> -->
<app-root></app-root>
<script type="module" src="/src/index.ts"></script>
```

✅ **The shell is already `<wa-page>`** — `AppShell.tsx` (#707), see report 03 §1.1. What
remains for this step is the *mount*, not the layout: `AppShell` becomes a Lit element that
renders `<wa-page>` directly instead of through `@lit/react`'s `WaPage` wrapper, and its
slots host `keep-*`/Lit subtrees instead of React ones.

### Bundle & code-splitting — ✅ the big win landed

`npm run build` at `fcab645` exits 0 in ~3 s and emits **103** JS chunks:

| Chunk | Size | Gzip | When it loads |
|---|---|---|---|
| **eager closure** (the number that matters) | **887.5 kB** | **243.7 kB** | always |
| `index-*.js` (entry chunk alone — misleading) | 323.5 kB | — | always |
| `KeepElements-*.js` | 332.2 kB | — | always |
| `keep-button-*.js` | 244.0 kB | 63.6 kB | always |
| `index-*.css` | 144.7 kB | 23.2 kB | always |
| `editor.api2-*.js` (Monaco core) | **3,626.93 kB** | 926.82 kB | on first Source tab |
| `editor.main-*.js` ×2 | 308.21 + 95.57 kB | — | with Monaco |
| `babel-*.js` (prettier) | 316.53 kB | 82.45 kB | on first format |
| `estree-*.js` (prettier) | 210.43 kB | 61.34 kB | on first format |
| `standalone-*.js` (prettier) | 81.05 kB | 26.74 kB | on first format |
| ~90 Monaco language chunks | 8–16 kB each | — | per language |

⚠️ **Measure the eager closure, not the entry-chunk line.** The entry chunk reads 323.5 kB,
but shared chunks stay eager — `KeepElements`, `keep-button` and the CSS all load on every
page. The real figure is **887.5 kB raw / 243.7 kB gzip**, read from
`dist/.vite/manifest.json` by `npm run bundle:budget`, against a budget of 901.2 / 245.9 —
**13.7 kB raw / 2.2 kB gzip of room**. ⚠️ **raw headroom was widened 2 % → 3 % for the duration of #806** (a tight raw budget fails on migration churn, not on regressions); gzip stays at 2 %, so
**gzip is now the sensitive half of the gate** and the one to watch: a conversion that grows
gzip is a real regression, one that only grows raw usually is not. Quoting
the entry-chunk line — as every previous revision of this report did — understates the eager
weight by roughly 2.7×.

The historic trend on the entry chunk was **6.94 MB → 6,322.51 kB → 2,111.11 kB → 323.5 kB**.
#673 did prettier (−608.01 kB); **#693/#729 did Monaco** (−66.6 %); **#813 did route
splitting**, which is what took it under 400 kB. All three use the same shape:

```ts
const fetchPrettier = () => Promise.all([
  import('prettier/standalone'),
  import('prettier/plugins/babel'),
  import('prettier/plugins/estree'),
]);
let prettierBundle: ReturnType<typeof fetchPrettier> | undefined;
const loadPrettier = () => (prettierBundle ??= fetchPrettier());
```

**The pattern is now proven twice.** Three observations follow:

1. **`React.lazy`/`Suspense` are still used 0 times** — the React app does no route-level
   code splitting at all. Both wins came from *module-level* dynamic imports inside Lit
   elements, not from React. All 125 `.tsx` files still ship in one chunk.
2. **This is deferral, not deletion.** Total bytes are roughly unchanged; what changed is
   who pays for them. Worth stating plainly so the −66.6 % is not read as a size reduction.
3. **The next target is `app-icons.ts`** (216 KB base64, 19 importers) — now ~10 % of the
   entry chunk rather than ~3 %, precisely because the chunk got smaller. Report 03 §6.4
   step 3, tracked as **#731**.

The dynamic-import boundary is also the natural seam for the future router (§10): a
`RouteDef.render` that `await import()`s its view element gives route-level splitting for
free — something the React version never had.

### `vite.config.mts`

Remove the React SWC plugin — **but preserve its decorator configuration** (see the
caution in §2):

```ts
import { defineConfig } from 'vite';
// deleted: import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  plugins: [
    // REQUIRED replacement: a TS transform that still applies standard (TC39)
    //   decorators — jsc.transform.decoratorVersion = '2022-03' — or Lit's
    //   `accessor` members are emitted untransformed and every decorated field
    //   throws "Unsupported decorator location: field" at module load.
    // `test/decorator-config.test.ts` fails in CI if this drifts.
  ],
  build: { assetsDir: 'admin/assets' },
  server: { /* CSP (report 03 §5) + proxy */ },
});
```

⚠️ **This sketch used to open with `wyw({ include: ['**/*.ts'] })` and a note to narrow the
glob once no `.tsx` remained. There is no `wyw` line any more (#825): the plugin and
`@linaria/react` are both uninstalled, so the only thing this file still has to get right is
the decorator version. The `exclude: ['**/components/keep-elements/**']` that used to be
load-bearing here — wyw's oxc type-stripper mis-desugars `accessor` — is load-bearing no
longer, because there is nothing to exclude from.**

Mirror the same change in `vitest.config.ts` in the same commit.

**CSP note:** once MUI/emotion are gone, their runtime `<style>` injection disappears, so
`'unsafe-hashes'` in `style-src-elem` can go. But `wa-page` needs `style-src-attr`
relaxed and Monaco's workers need `worker-src 'self' blob:`. Net: CSP gets *simpler* but
not stricter in every directive — see report 03 §5, and re-enable the header under its
correct name first (report 00 P0-2).

### `tsconfig.json`

`"jsx": "react-jsx"` is no longer needed once `.tsx` files become `.ts` authoring Lit
`html`\`…\` templates — remove it. `experimentalDecorators: true` and
`useDefineForClassFields: false` are **already set** and already suit Lit; leave them.
`src/react-app-env.d.ts` is deleted (#677) and the `tsconfig.test.json` split is done
(#687), so the production build no longer type-checks `test/`. Note `"jsx"` now lives in
`tsconfig.app.json`, which `tsconfig.test.json` extends — remove it from the one place.

`.tsx` → `.ts`: each converted file is renamed (no JSX left). This happens file-by-file
during report 02; the last rename removes the final React import.

---

## 8. Tests, lint

- **Tests — still small, and it grew for the right reason.** **7** of **70** files use
  `@testing-library/react`: `test/App.test.tsx`, `TabsAccess.test.tsx`,
  `EditView.test.tsx`, `UnsavedChangesDialog.test.tsx`, the two new
  `LoginPage.*.test.tsx` suites (#745/#748) and the shared
  `test/test-utils/renderWithProviders.tsx` (#689). The other **29** element suites already
  use the framework-agnostic `mountLit`/`cleanupLit` helper in `test/test-utils/lit.ts`, and
  the store/service/util suites need no DOM library at all. When those views are converted,
  replace `render()` with `mountLit` (or `@testing-library/dom`) and drop
  `@testing-library/react`. Keep `@testing-library/jest-dom/vitest` matchers and `jsdom`.
  **Effort: S.**
- 🆕 **A third harness genre appeared: source-scanning suites.** `shell-dead-code.test.ts`,
  `theme-selectors.test.ts` and `keep-theme.test.ts` parse source and CSS as *text* rather
  than executing it, because `css: false` makes styling invisible to the runner. They are
  what stops deleted shell code and tokenized colours from creeping back. They survive React
  removal untouched — they never referenced a framework.
- **A second framework-agnostic harness now exists:** `test/test-utils/monaco.ts` (#668)
  fakes `monaco-editor` so the element suite runs under jsdom. Reuse it rather than
  reintroducing a real Monaco into tests when `FormsContainer` is converted in P3.
- **Lint:** `oxlint` already replaced the `react-app` presets. `.oxlintrc.json` lists a
  `"react"` plugin — drop it in the final purge. Consider adding a Lit/web-components
  rule set at that point if oxlint offers one; otherwise the TS + correctness categories
  already carry most of the value.
- **Coverage gates:** `vitest.config.ts` now gates `src/components/keep-elements/**` at
  **85 %** lines (#880 raised it from #686's 80) against a measured **89.7 %** — so the headroom is
  ~4 points, not 14. Every element converted from a `.tsx` view enters that directory —
  **budget a test per element**, or the gate fails as the numerator stops keeping up. This
  is the single most likely way P2 breaks CI. Global lines are gated at **61 %** and stand
  at **70.18 %**; there are now **14** per-path gates, not 4.

  ⚠️ **Two ratchet hazards specific to P2**, both learned the hard way (report 01 §B3):

  1. **When a conversion creates a new well-covered directory, add its gate in the same
     PR.** #880 found three areas — `store/databases/**`, `src/router/**`,
     `FormController` — that were well covered and **had no gate at all**. A directory
     nobody lists is not a low floor, it is *no* floor, and a drift report cannot show you
     a gap.
  2. **`FormController.react.ts` is gated at 100/100/100/100 and is meant to be deleted**
     during P4. Delete the threshold entry *with the file*; a floor on a path that no
     longer exists protects nothing while looking like it does.

---

## 9. Sequencing, gates & risk

React (`react` + `react-dom`) can only be dropped when **the last `.tsx`, the last
`react-redux` hook, the last `<Route>`, and the last Formik import are gone.** (The last
Monaco-React import is ✅ already gone.) Sequence so that each phase leaves the app
shippable (React and Lit coexist throughout via the existing `@lit/react` bridge until the
very end).

| Phase | Work | Gate to exit | Effort | Status |
|---|---|---|---|:---:|
| **P−1 — Unblock** | Fix report 01 §0 (jsdom polyfill + Monaco test), move `prettier` to `dependencies`, make the Monaco import dynamic. | `npm run lint && npm run build && npm run test` all green. | **S** | ✅ **done** — #668/#673, and the dynamic Monaco import landed in #693/#729 |
| **P−0.5 — Free deletion** | Drop `@monaco-editor/react`, `@monaco-editor/loader` and the `disabledpostinstall` script. | `npm ci && npm run build` still green. | **XS** | ✅ **done** — #675 |
| **P0 — Foundations** | Add `store/store.ts` singleton + `StoreController`, `FormController`, custom router (§10). Typed `AppDispatch` first (report 00 P1-1). | New primitives unit-tested; app still boots on React. | **M** | ✅ **DONE** — `StoreController` #798 (**11** users), `FormController` #807 (**2** users), typed dispatch #694 (**0** casts left). #885/#888 characterized `FormController` against the five real Formik shapes and found two real defects doing it (#887, #890) |
| **P1 — Routing** | Replace `react-router-dom` with the in-repo router (§10). | `grep react-router-dom src` → empty; navigation + deep links work end-to-end. | **M** | ✅ **DONE** (#716) — `src/router/` is 2 files at **97.8 %** coverage; both route tables are now plain `RouteDef[]`. #813 added route-level code splitting on top, and the `/groups`, `/people`, `/mail` shells went with #770 |
| **P2 — Leaf components** | Convert leaf views **one file at a time, not as four sweeps**: MUI→Lit/WA **+** react-redux→StoreController (§3) **+** Formik→FormController (§4) **+** Linaria→`static styles` **+** `.tsx`→`.ts` in a single commit per file. The icon axis is ✅ empty. Delete any `Keep*` wrapper whose last consumer the conversion removed. | Each converted file has **no** `react`/`react-redux`/`formik`/`@mui` import; `keep-elements` gate stays green. | **L** (bulk) | 🟡 **IN FLIGHT — the whole critical path** (**#806**). `.tsx` 125 → **86**; **79 files / 16,682 LOC** left, tiered A 18 / B 29 / C 19 / D 13 |
| **P3 — Hard widgets** | ✅ **ALL CLEARED.** date-pickers (#703), tree-view (#704), and **DataGrid** — #771 built `keep-data-table` and migrated all six MUI `<Table>` screens, then #770 deleted the People/Groups screens and `@mui/x-data-grid` with them. Remaining: convert `FormsContainer.tsx` (804 lines) itself, tier C of #806. | Data-heavy views work on Lit. | **Hard** | ✅ **DONE** — no widget blocker remains |
| **P4 — Shell & entry** | ✅ `wa-page` shell landed (#707); `index.tsx` boot code already moved into a real module (no inline script — CSP forbids one). 🔴 Remaining: `App.tsx` (137) → `<app-root>`, `AppShell.tsx` (248) React→Lit, `Views.tsx` (266), `index.tsx` (37), `router/react.tsx` (352); delete the 32 `@lit/react` wrappers + barrel; drop `@lit/react` **and** the ≥5 WA React wrappers (`WaPage`, `WaBreadcrumb`, `WaBreadcrumbItem`, `WaIcon`, `WaInput`). | App boots with no `ReactDOM`; `Provider` gone. | **M** | 🟡 shell done, mount not |
| **P5 — Purge** | Replace the React SWC plugin **preserving its decorator options** (§2 caution), remove React types, drop the runtime deps; retire the **25** `@testing-library/react` files (most are characterization suites that die with their subjects); tighten tsconfig. ✅ `react-app-env.d.ts` deleted (#677); ✅ CSP already tightened (#685). | Definition of Done (§11) fully green. | **M** | 🔴 |

### Hard gates (must be true before proceeding)
- **G0 (exit P−1):** ✅ **met at `0d5458c`** — `lint`, `typecheck`, `build`, `bundle:budget`
  and `test` (133 files / 1709 tests) all exit 0, plus a SonarQube quality gate (#688).
  ⚠️ **Keep it green, and note how cheaply it is lost:** two commits earlier one unused import
  failed three gates at once, and because CI runs `lint → typecheck → build` **before** `test`,
  the suite was never reached. A red baseline makes every later gate unreadable.
- **G1 (exit P1):** ✅ **met** — no `react-router-dom` import anywhere; `src/router/` carries
  the deep-link and `basename '/admin/ui'` behaviour, covered at 97.8 %.
- **G2 (per P2 file):** the file has **no** `from 'react'`, `react-redux`, `formik` or
  `@mui/` import, is renamed `.ts`, and any new element has a test:
  ```
  grep -n "from 'react'\|react-redux\|formik\|@mui/" src/path/to/File.ts   # must be empty
  ```
  plus `npm run lint`, `npm run typecheck` (`tsc -b` — `--noEmit` never looks at `test/`),
  `npm run build` and the suite green. **A file that does not clear the grep is not
  converted; it is half-converted**, which is worse than untouched because the next person
  cannot tell which half is done.
- **G2b (per P2 file):** if the conversion removed the last consumer of a `Keep*` wrapper,
  the wrapper **and** its barrel line are deleted in the same commit.
  `test/keep-element-wrappers.test.ts` enforces this.
- **G3 (exit P4):** `grep -rn "react-dom" src` empty; `Provider`/`createRoot` gone.
- **G4 (exit P5):** `package.json` has no `react`, `@mui/*`, `react-*`, `@emotion/*`,
  `formik`, `@lit/react`, `@monaco-editor/*`; `vite.config.mts` and `vitest.config.ts`
  still apply the Lit decorator options.

### Riskiest items (watch list)
1. ~~**`@mui/x-data-grid` (5 files)**~~ — ✅ **RESOLVED.** The decision was a custom Lit
   table: #771 built `keep-data-table` and migrated all six MUI `<Table>` screens, then #770
   deleted the People/Groups screens and the package with them. This was the top risk on this
   list for four revisions. Recorded because the resolution is the interesting part: **no
   WebAwesome equivalent exists in any tier**, so the options were a third-party grid or
   building one, and building one won. (Historic text follows.) **Was: highest risk; decide early,
   schedule early in P3.**
2. **70 `react-redux` files / 290 hook sites** — low complexity, high volume. Risk is
   churn and merge conflicts, not difficulty. Mitigate by doing it inside the P2 per-file
   pass and keeping PRs small (**#715**). ✅ **De-risked by #708:** the `theme`/`themeMode`
   prop plumbing — 20 pass-downs and 15 generics — is gone, so that is one whole category
   of prop threading the controller migration no longer has to reproduce.
3. **The SWC decorator configuration** — a silent, whole-layer breakage if
   `@vitejs/plugin-react-swc` is removed without replacing `tsDecorators` +
   `useDefineForClassFields: false`. Class-field shadowing does not fail loudly; it just
   stops elements reacting. Covered by the 29 element test suites, which **are** green
   (⚠️ G0 is currently **not** met — see §9) and hold `keep-elements` at 89.7 % against an
   85 % gate — a real detector.
   **#747** proposes standard decorators + `accessor`, which removes the coupling entirely.
4. **Routing** — **downgraded, and further de-risked.** Nested routes across 2 hosts + a
   `PrivateRoutes` guard + `basename`, but only **9 live paths** (§10), and #681 deleted the
   unreachable `settings` subtree that muddied the count. A subtle base-path or guard
   regression still breaks deep links, so add route smoke tests before P1 exit — but this is
   an **M**, not an open-ended audit.
5. ✅ **`x-date-pickers` / `x-tree-view`** — **both removed** (#703, #704), exactly as this
   list predicted. `x-tree-view` was the cheapest win in the program and it cost 2 files.
6. **CSP** — the framing has changed. It was never "disabled entirely": the
   `vite.config.mts` key is dev-server only, and the production policy is
   `jar/config/config.json`, in this repo. What matters for **P4** is that the shipped
   policy sets `style-src-attr 'none'` while `wa-page` writes inline styles for
   `--header-height` and drawer state, and 20 static `style="…"` attributes ship inside
   `keep-*` elements. Validate the shell against the intended policy, not the dev one
   (#685, report 03 §5). Keep `worker-src 'self' blob:` — Monaco's workers need it.

### Rollback strategy
- React and Lit **coexist** through P0–P4 via the `@lit/react` bridge, so every phase ships
  independently and is revertable by reverting its PRs — no long-lived mega-branch.
- Keep phases behind small PRs gated on `lint` + `build` + `test` + the phase gate grep.
  If a converted view regresses, revert that single file's PR; the bridge means the React
  version still works.
- Do **not** remove any dependency (P5) until its last importer is gone (enforced by the
  DoD greps), so a partial migration can never produce a broken `npm install`.
- **Point of no return:** deleting `KeepElements.tsx` / dropping `@lit/react` (P4). Land it
  only after G2 holds for 100 % of files.

### Overall effort
**M–L (weeks, not months).** P0, P1 and P3 are all ✅ done, and P2 is **79 files /
16,682 LOC** with a per-file recipe and a per-file gate — so what is left is bounded and
enumerated rather than estimated. The plumbing this report owns (entry point, router,
StoreController, FormController, Monaco wrapper) is **M** and front-loaded — the Monaco
piece is **done**, and the shell is now a web component (#707) even though its mount is
still React.

---

## 10. Routing replacement (detail)

Current shape (verified at `fcab645`): a `<BrowserRouter basename="/admin/ui">` in
`App.tsx:90` with a catch-all auth split (`path='*'` → **`AppShell`**/`LoginPage`, plus
`/callback`), and nested `<Routes>` in `Views.tsx:148` behind a `PrivateRoutes` guard from
`components/routers/ProtectedRoute`, inside a `NavigationGuardProvider
basename="/admin/ui"`. ✅ **The orphaned `SettingsPage.tsx` `<Route>`s are gone** — #681
deleted the subtree. Three empty shells (`/groups`, `/people`, `/mail`) remain in
`Views.tsx:166-172`, annotated as pending LABS-1214. Params used: `:nsfPath`, `:dbName`,
`:formName` (4 `useParams` sites). **29** files import `react-router-dom`.

**Options evaluated:**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Browser **Navigation API** | Native, no dep, modern | Safari/Firefox support still partial (2026); needs a polyfill/fallback | Not yet safe as sole router |
| **`@lit-labs/router`** | Lit-native `Routes` controller, nested routes, URL pattern params | Labs (pre-1.0) API churn; adds a dep | Viable; good if the team wants batteries-included |
| **Small custom router** (History API + `URLPattern`) | ~100 LOC, zero deps, full control over `basename`, guard, and lazy loading; matches the app's modest **9 live routes** | Must hand-write matching + a `<route-outlet>` | **Recommended** |

**Recommendation: a small custom router** — the route set is small and mostly flat, the app
already needs bespoke behaviour (`basename '/admin/ui'`, the `authenticated` split, the
`PrivateRoutes` guard), and it avoids a Labs dependency. Use `URLPattern` for `:param`
matching, `history.pushState` + a `popstate` listener, and expose a reactive controller so
elements re-render on navigation.

```ts
// src/router/router.ts (sketch)
export interface RouteDef { pattern: URLPattern; render: (p: Record<string,string>) => unknown; guard?: () => boolean; }
class Router extends EventTarget {
  base = '/admin/ui';
  navigate(path: string) { history.pushState({}, '', this.base + path); this.dispatchEvent(new Event('nav')); }
  current() { return location.pathname.replace(this.base, '') || '/'; }
}
export const router = new Router();
addEventListener('popstate', () => router.dispatchEvent(new Event('nav')));
```

```ts
// RouterController → re-render an element on nav; <a> clicks call router.navigate()
class RouterController implements ReactiveController {
  constructor(private host: ReactiveControllerHost) { host.addController(this); }
  hostConnected() { router.addEventListener('nav', this.onNav); }
  hostDisconnected() { router.removeEventListener('nav', this.onNav); }
  private onNav = () => this.host.requestUpdate();
}
```

Hook mapping:

| react-router-dom | Replacement |
|---|---|
| `useNavigate()` → `navigate('/x')` | `router.navigate('/x')` |
| `useParams()` | matched `URLPattern` groups passed into the route's `render(params)` |
| `useLocation()` | `router.current()` (+ `RouterController` for reactivity) |
| `<Route path element>` | `RouteDef` entry in a routes array |
| `<Routes>` host / `<Outlet>` | a `<route-outlet>` Lit element that renders the matched def |
| `NavLink` (4 live uses in `SideNav.tsx`; also in the dead `SettingsPage.tsx`) | an `<a>` + `router.navigate()` + an `aria-current` class |
| `PrivateRoutes` guard | `RouteDef.guard = () => store.getState().account.authenticated` |
| `basename="/admin/ui"` | `router.base` (prefix on navigate + strip on match) |

### Route inventory — smaller than the previous revision claimed

**Correction.** The previous revision listed `/groups`, `/people`, `/mail`, `/settings`
(+ `/settings/account|roles|mail|logs`) as routes to port. **They are not live routes.**
In `Views.tsx` those four `<Route>` blocks sit inside a `{/* … */}` JSX comment
(lines 148–161), and `SettingsPage.tsx` has **no importer anywhere in `src`** — its only
reference is the commented-out `<SettingsPage />` at `Views.tsx:159`. `src/components/settings/`
(8 `.tsx`, 469 LOC) and `src/components/groups/` (2 `.tsx`, 760 LOC) are therefore
**unreachable from the running app**, which is why report 01 measures them at 1.3 % and
0.9 % line coverage. (`src/components/people/` is only *partly* dead — `PeopleForm.tsx` is
still imported by `applications/FormDrawer.tsx`.)

**Live routes to port — 9 distinct paths, against the 16 the previous revision listed:**

| Host | Paths |
|---|---|
| `App.tsx` | `*` (auth split), `/callback` |
| `Views.tsx` (behind `PrivateRoutes`) | `/`, `/schema`, `/schema/:nsfPath/:dbName`, `/schema/:nsfPath/:dbName/:formName/access`, `/scope`, `/apps`, `/apps/consents` |
| `Views.tsx` (unguarded) | `/callback` |

> 🔴 **One live dangling navigation:** `src/components/sidenav/OptionList.tsx:40` calls
> `history.push('/settings/account')` — a target with no matching route since the settings
> block was commented out. It currently falls through `App.tsx`'s `path='*'` and renders
> nothing useful. Decide during P1 whether to restore the settings routes or remove the
> navigation; do not port the bug into the new router.

**Consequences for §9 — resolved.** The unreachable subtrees were dealt with rather than
ported: #681 deleted `components/settings` (8 `.tsx`), #770 deleted the People/Groups screens
and their `/groups`, `/people` route shells. The P2 surface is now the enumerated **79
files** in #806, all of them reachable.

> ✅ **Side benefit realised:** removing `react-router-dom` cleared the two open
> high-severity advisories tracked in report 00 P2-10 / report 05. `npm audit` now reports
> **0 vulnerabilities** — and it cleared them by *deleting* the package rather than bumping
> it, which is the more durable fix.

---

## 11. Definition of Done

All must hold on the new stack:

```bash
grep -rn "from 'react'"         src   # → (empty)   [101 at 0d5458c; 32 are wc shims]
grep -rn "react-dom"            src   # → (empty)
grep -rn "react-redux"          src   # → (empty)   [51 files]
grep -rn "from 'formik'"        src   # → (empty)   [12 files]
grep -rn "@mui/"                src   # → (empty)   [43 files — #709]
grep -rn "@lit/react"           src   # → (empty)   [32 wrappers + 1 barrel]
grep -rn "webawesome/dist/react" src  # → (empty)   [≥5 — WaPage, WaBreadcrumb(+Item), WaIcon, WaInput]
find src -name '*.tsx'                # → (empty; all authoring files are .ts)  [86]
grep -rn "react-router"         src   # → ✅ (empty) since #716
grep -rn "react-icons\|icons-material" src # → ✅ (empty) since #718/#913
grep -rn "x-data-grid"          src   # → ✅ (empty) since #770
grep -rn "@monaco-editor/"      src   # → ✅ only a code comment
find src -name 'react-app-env.d.ts'   # → ✅ (empty) since #677
```

⚠️ **Do not read the `from 'react'` count as 101 files of work.** 32 of them are the
`@lit/react` wrapper shims, which hold no logic and are **deleted with their last consumer**
rather than converted — so roughly a third of this gate closes as a side effect of P2/P4
rather than as its own task. See the counting rule at the top of this report.

- `package.json` `dependencies` contains **no** `react`, `react-dom`, `react-redux`,
  `react-router-dom`, `@lit/react`, `react-icons`, `@mui/*`, `@emotion/*`, `formik`;
  `devDependencies` contains no `@types/react*` or `@testing-library/react`.
  ✅ `@monaco-editor/*`, `@mui/lab`, `@mui/x-date-pickers`, `@mui/x-tree-view` and both
  `@fontsource-variable/*` are already gone.
- 🆕 Also verify the two drop candidates this refresh found: **`dayjs`** (no real consumer
  since #703) and **`events`** (a Node polyfill for one `EventTarget`-shaped use in
  `utils/token-emitter.ts`).
- ✅ `package.json` `scripts` no longer contains `disabledpostinstall` (#675).
- `vite.config.mts` and `vitest.config.ts` no longer use `@vitejs/plugin-react-swc` **but
  still apply legacy decorators + `useDefineForClassFields: false`** — unless **#747** has
  landed standard decorators + `accessor`, which removes the requirement;
  `tsconfig.json` no longer sets `"jsx": "react-jsx"`.
- `.oxlintrc.json` no longer lists the `react` plugin.
- `npm run lint`, `npm run build` (tsc -b + vite build) and `npm run test` are all green,
  with the coverage gates in `vitest.config.ts` satisfied — **and the SonarQube quality
  gate** (#688), once it is switched from report-only.
- The production CSP in `jar/config/config.json` is validated in enforcing mode with
  `script-src` free of `'unsafe-inline'` and `style-src-attr` reconciled against the app's
  actual inline styles (#685).
- App boots from `<app-root>` inside `<wa-page>` with the Redux store as a module
  singleton, routing/deep-links, forms, and the Monaco editor all functional — verified in
  a browser smoke test, in **both** colour modes (the suite runs with `css: false` and
  cannot see appearance).
