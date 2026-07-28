# Report 04 — Capstone Roadmap: Fully Remove React

**Scope:** End-state plan to eliminate React (and every React-coupled dependency) from
`@hcl-software/domino-rest-adminclient`, leaving a Lit + WebAwesome + framework-agnostic
Redux SPA on Vite.

> **Refreshed 2026-07-28** against branch `new_code` @ `fcab645`. Previous refreshes:
> `e17010c` and `7594672` (both 2026-07-27). Originally written 2026-07-24.
>
> **No React *view* has been removed yet** — still on plan; this report is the last phase.
> But the ground under it shifted more this round than in any previous one:
> - ✅ **Three React-coupled runtime dependencies are gone from `package.json`** —
>   `@monaco-editor/react` + `@monaco-editor/loader` (#675), `@mui/x-date-pickers` (#703)
>   and `@mui/x-tree-view` (#704). §5 is closed. `dependencies` is down from 32 to **26**.
> - ✅ **The bundle claim in §7 is now proven at scale, not just in principle.** #693/#729
>   put Monaco behind a dynamic `import()`; the entry chunk fell **6,322.51 kB →
>   2,111.11 kB / 594.20 kB gzip** (−66.6 %). The technique §7 recommends works here.
> - ✅ **The shell is no longer React-structured.** #707 rebased it on `<wa-page>`, so
>   §7's "swap the entry point" step now inherits a shell whose *layout* is already a web
>   component — only the React subtrees inside its slots remain.
> - ✅ **Nothing in the view layer reads a theme value.** #708 retired the `theme` prop
>   plumbing entirely, which removes a whole category of prop-threading that a
>   `StoreController` migration would otherwise have had to reproduce.
> - ✅ **The test story keeps improving**: 70 test files / 747 tests, **7** of which use
>   `@testing-library/react` (up from 4 — the LoginPage suites). **29** element suites use
>   the framework-agnostic `mountLit` helper.
> - ✅ **G0 is green.** `npm run lint && npm run build && npm run test` all exit 0
>   (747 tests, 34.72 % line coverage).
> - 🔴 **One blocker remains where there were three**: MUI X DataGrid (5 files, **#702**).
>   WebAwesome ships no data grid in any tier, so "buy Pro" was never available.

**This report orchestrates the others.** It sequences and gates the whole migration and
covers the React-specific plumbing (entry point, routing, `react-redux`, Formik, Monaco
wrapper). For component-by-component MUI→Lit/WebAwesome conversion and the icon
catalogue, defer to:

- **Report 00** — cross-cutting code quality; the `as any` / typed-dispatch work in P1-1
  is a direct prerequisite for §3.
- **Report 01** — test tooling; the coverage that makes this rewrite survivable.
- **Report 02** — MUI → Lit/WebAwesome component migration (the 125 `.tsx` views). The
  date-picker and tree-view replacements are ✅ done; DataGrid (**#702**) is the one left.
- **Report 03** — the `wa-page` shell, design tokens, and icon migration
  (`@mui/icons-material` + `react-icons` + `app-icons.ts` → `<wa-icon>`).

React cannot be removed until reports 02 and 03 are essentially complete; this plan
defines the gates that make that ordering explicit.

---

## 1. Current-state snapshot (verified 2026-07-28)

| Fact | 2026-07-24 | `7594672` | `e17010c` | **`fcab645`** | Source |
|---|---|---|---|---|---|
| `.tsx` files | 135 | 130 | 130 | **125** | `find src -name '*.tsx'` |
| `.tsx`/`.ts` importing React | 109 | 107 | 107 | **97** | `grep -rln "from 'react'"` |
| Files using `react-redux` | 85 | 77 | 77 | **70** | grep |
| `useSelector` call sites | 224 | 207 | 207 | **178** | grep |
| `useDispatch` call sites | 120 | 116 | 116 | **112** | grep |
| `connect()` HOC call sites | **0** | 0 | 0 | **0** | grep — **all Redux consumption is via hooks** |
| `createSelector` (memoized selectors) | — | 0 | 0 | **0** | grep — see §3 |
| `React.lazy` / `Suspense` | — | — | 0 | **0** | grep — no React-side code-splitting at all |
| `dispatch(… as any)` casts | — | 95 | 95 | **94** | grep — report 00 P1-1 (**#694**) still open |
| `as any` (whole `src`) | — | — | 154 | **153** | grep |
| Files using `formik` | 19 | 19 | 19 | **19** (`useFormik` 8, `FormikProps` 11) | grep |
| Files using `yup` | 7 | 7 | 7 | **7** | grep |
| `@mui/material` imports | 70 files | 69 | 69 / 175 refs | **60 `.tsx` / 149 refs** | grep |
| `@mui/icons-material` imports | 47 files | 45 | 45 / 99 refs | **41 / 87 refs** | grep |
| `react-icons` imports | 18 files | 18 | 18 | **18** | grep |
| `@mui/x-data-grid` | 5 files | 5 | 5 | **5** 🔴 the last MUI X package | grep |
| `@mui/x-date-pickers` | 2 files | 2 | 2 | ➖ **gone** ✅ (#703) | `package.json` |
| `@mui/x-tree-view` | 2 files | 2 | 2 | ➖ **gone** ✅ (#704) | `package.json` |
| `@mui/lab` | present in deps | removed ✅ | ➖ gone | ➖ gone | `package.json` |
| `@monaco-editor/*` | 1 file | 1 file | 0 imports | ➖ **gone from deps** ✅ (#675) | `package.json` |
| `dayjs` | dep | dep | dep | 🟡 **dep with 0 real consumers** — only a comment matches | grep |
| `@emotion/*` direct imports in `src` | **0** | 0 | 0 | **0** (MUI peer only) | grep |
| Hand-written Lit web components | 24 plain-JS `.js` | 26 TS | 26 TS | **25 elements** (26 `.ts` incl. the base) | `src/components/keep-elements/` |
| `@lit/react` bridge | 1 file (`LitElements.tsx`) | 1 file | 1 file | **1 file** (`KeepElements.tsx`, 24 wrappers) | grep |
| WA React wrappers used directly | 0 | 0 | 0 | **1** — `WaPage` in `AppShell.tsx` | grep |
| `@testing-library/react` | 4 of 4 test files | 4 of 53 | 4 of 63 | **7 of 70** | grep |
| Framework-agnostic element tests | 0 | 26 | 28 | **29** (via `test/test-utils/lit.ts`) | grep |
| Router | `react-router-dom` v7 | v7.18.1, 31 files | v7.18.1, 31 files | **v7.18.1**, **29** importing files | grep |
| `<Routes>` hosts | 3 | 2 | 2 | **2** (`App.tsx`, `Views.tsx`) | grep |
| Live route paths | — | ~13 (claimed) | 9 (measured) | **9** — `*`, `/callback` in `App.tsx`; `/`, `/schema`, `/schema/:nsfPath/:dbName`, `/schema/…/access`, `/scope`, `/apps`, `/apps/consents` in `Views.tsx` | `App.tsx` + `Views.tsx` |
| Dead route stubs | — | — | `settings` (8 `.tsx`) | ➖ **`settings/` deleted** ✅ (#681); `/groups`, `/people`, `/mail` remain as empty `<Route>` shells | grep |
| Route hooks | `useNavigate` 14, `useLocation` 14, `useParams` 4 | unchanged | unchanged | **`useNavigate` 14, `useLocation` 13, `useParams` 4** | grep |
| App shell | `HomeElement` (Linaria flex) | same | same | **`AppShell` on `<wa-page>`** ✅ (#707) | `src/AppShell.tsx` |
| `ThemeProvider` / `CssBaseline` mounts | 2 / 3 | 2 / 3 | 2 / 3 | **1 / 1** (both in `AppShell.tsx`) | grep |
| `getTheme()` readers | 31 | 22 | 22 | **4** ✅ (#708) | grep |
| Entry chunk | — | 6.94 MB / 1.88 MB gzip | 6,322.51 kB / 1,703.85 kB | **2,111.11 kB / 594.20 kB gzip** ✅ | `npm run build` — see §7 |

Key versions at `fcab645`: react **19.2.8** · react-dom 19.2.8 · react-redux 9.3.0 ·
react-router-dom **7.18.1** · @reduxjs/toolkit **2.12.0** · @mui/material 9.2.0 ·
@awesome.me/webawesome 3.10.0 · lit 3.3.3 · monaco-editor 0.55.1 · prettier 3.9.6 ·
typescript 7.0.2 · vite 8.1.5 · vitest 4.1.10.
**26** `dependencies` (was 32), 17 `devDependencies`.

**Four findings that de-risk the whole effort:**

1. **Zero `connect()` HOCs** — every store read/write goes through
   `useSelector`/`useDispatch`. Replacing `react-redux` is a mechanical hook→controller
   swap, not an architecture change.
2. **The Redux store is already framework-agnostic** — `src/store/index.ts` is plain
   `combineReducers` over **17 classic switch reducers**; `configureStore` lives in the
   entry point (`src/index.tsx`). It survives untouched. **And it is now well tested** —
   every `store/*/reducer.ts` is at **100 %** line coverage against a 95 % gate (report 01),
   and #673 added the first *action*/thunk test (`test/store/account/action.test.ts`, covering
   `renewToken`'s error paths). Reducer parity plus the first thunk contract makes the
   eventual RTK/`createSlice` modernization (report 00 P1-2) materially safer than it was.
3. **26 typed Lit elements already exist** and are only *adapted* into React via
   `@lit/react`. Removing React means deleting the adapter (`KeepElements.tsx`) and using
   the custom elements directly — these components get *simpler*, not rewritten. This is
   now more than a claim: the elements are TypeScript, decorated, individually unit-tested
   without React, and augment `HTMLElementTagNameMap` for direct-DOM typing.
4. **The test suite is mostly already React-free.** **63 of 70** files never touch
   `@testing-library/react`. §8 is a 7-file job, not a whole-suite migration — and it grew
   for a good reason: #745/#748 added two LoginPage suites while dropping MUI from that
   screen.

✅ **The orphaned-route finding is resolved.** The previous refresh found `SettingsPage.tsx`
rendering four `<Route>` elements with **no `<Routes>` parent**, reachable from nothing.
**#681 deleted the whole `components/settings` subtree** (8 `.tsx`) along with the dangling
`/settings/account` navigation. The live inventory is now genuinely 9 paths across 2
`<Routes>` hosts — see **§10**. Three empty `<Route>` shells (`/groups`, `/people`,
`/mail`) remain in `Views.tsx`, annotated as pending LABS-1214 rather than left as silent
TODOs (report 00 P2-7).

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
| `react-icons` | WebAwesome `<wa-icon>` (report 03 §6.4) | Hard→03 | 18 files. |
| `@mui/icons-material` | WebAwesome `<wa-icon>` (report 03 §6.4) | Hard→03 | **41** files. **#718** |
| `@mui/material` | Lit + WebAwesome components (report 02) | Hard→02 | **60 `.tsx`** — largest surface. **#709** |
| ~~`@mui/lab`~~ | — | ✅ **already removed** | `0349a71`. |
| `@mui/x-data-grid` | Third-party WC grid or custom Lit table (report 02 §5.1) | **Hard**→02 | 5 files; **the riskiest single widget, and now the only MUI X package left**. No WebAwesome grid exists in any tier. **#702** |
| ~~`@mui/x-date-pickers`~~ | `keep-input-date` on `wa-input[type=date]` | ✅ **DONE** (#703) | Removed from `package.json`. Authored, not bought. |
| ~~`@mui/x-tree-view`~~ | `keep-tree` on `wa-tree`/`wa-tree-item` | ✅ **DONE** (#704) | Removed from `package.json`. It was flagged as the cheapest MUI X removal and it was. |
| `@emotion/react`, `@emotion/styled` | — (removed) | Drop | MUI peers only; **0** direct imports. |
| `formik` | Native form + Yup (§4) | **Work** | 19 files. **#717** |
| `@fortawesome/fontawesome-free` 7.3.1 | — | **Keep** ✅ | Load-bearing: `src/services/icon-library.ts` imports its glyphs as `?url` SVGs to self-host WA icons. |
| ~~`@fontsource-variable/crimson-pro`, `@fontsource-variable/quicksand`~~ | — | ✅ **DONE** (#679) | Deleted; they had 0 imports anywhere. |
| `redux`, `@reduxjs/toolkit`, `redux-thunk` | **Keep** | — | Framework-agnostic; no change. |
| `lit`, `@awesome.me/webawesome` | **Keep / expand** | — | Target runtime. |
| `yup`, `uuid`, `immer` | **Keep** | — | Framework-agnostic. |
| `dayjs` | — | 🟡 **Drop candidate** | Existed for `@mui/x-date-pickers`' `AdapterDayjs`. After #703 the only textual match in `src` is a comment. Verify and remove. |
| `events` | `EventTarget` | 🟡 **Drop candidate** | A Node polyfill shipped to the browser for one consumer, `src/utils/token-emitter.ts`. `EventTarget` is native and does the same job. |
| `@linaria/react`, `@wyw-in-js/*` | **Keep** | — | Styling survives React removal. (`@linaria/core` is no longer a direct dep.) |

### Build / test / lint / type dependencies

| Dependency | Action | Effort | Notes |
|---|---|---|---|
| `@vitejs/plugin-react-swc` (dev) | **Cannot simply remove** — see the caution below | **Work** | Keep the `wyw` (Linaria) plugin (§7). |
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

**Keep** the Redux store exactly as-is (`configureStore` + `rootReducer` over 17 classic
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

Effort: **M** (19 files, but the schemas already exist and the pattern is uniform). Fold
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
   for the element. The suite is green (747 tests) and `src/components/keep-elements` is at
   **84.5 %** line coverage against an **80 %** gate (#686).
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
   2,111.11 kB / 594.20 kB gzip**, a 66.6 % cut, with `editor.api2` (3,626.93 kB) and ~90
   language chunks now fetched only when a Source tab opens.

**Nothing in this section is open.** The one caveat worth carrying: this is deferral, not
deletion — total shipped bytes are roughly unchanged, and a user who opens a schema still
downloads Monaco. What changed is that everyone else does not.

---

## 6. Icons — replace `@mui/icons-material` + `react-icons` (+ `app-icons.ts`)

Owned by **report 03 §6.4**. There are **three** legacy icon systems to remove —
`@mui/icons-material` (**41** files, 87 refs), `react-icons` (18 files), and
`src/styles/app-icons.ts` (216 KB of base64 SVG data URIs, **19 importers**). ✅ The dead
`src/styles/icons.json` was deleted in #679. Tracked as **#718** and **#731**.

⚠️ **#731 is worth more than it was.** With Monaco split out (§5), `app-icons.ts`'s 216 KB
is now roughly **a tenth** of the 2,111.11 kB entry chunk rather than a thirtieth.

**Correction since the last refresh:** `@fortawesome/fontawesome-free` is **no longer
unimported**. #669 built `src/services/icon-library.ts` (76 lines), which registers a
self-hosted WA icon library from 12 Font Awesome glyphs imported as `?url` SVGs. That is
the target pattern, and it means the FA package is now a **keeper**, not a candidate for
removal. All three legacy systems converge on `<wa-icon>` fed by that registry; the base64
`app-icons.ts` registry should be folded into it. Apply the codemod during each component's
report-02 pass so a view loses its React icons at the same time it loses its React shell.

---

## 7. Entry point & build

### `src/index.tsx` → `src/index.ts`

> ⚠️ **Name clash — `src/index.ts` already exists.** #707 created it for the appearance
> boot code (previously an inline `<script>` in `index.html`, which the #685 CSP tightening
> forbids). `index.html` loads **both** module scripts today. Pick a different name for the
> app entry (`src/main.ts`) or fold the boot code into it deliberately; do not assume the
> filename is free.

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
| `dist/admin/assets/index-*.js` (entry) | **2,111.11 kB** | **594.20 kB** | always |
| `index-*.css` | 198 kB | — | always |
| `editor.api2-*.js` (Monaco core) | **3,626.93 kB** | 926.82 kB | on first Source tab |
| `editor.main-*.js` ×2 | 308.21 + 95.57 kB | — | with Monaco |
| `babel-*.js` (prettier) | 316.53 kB | 82.45 kB | on first format |
| `estree-*.js` (prettier) | 210.43 kB | 61.34 kB | on first format |
| `standalone-*.js` (prettier) | 81.05 kB | 26.74 kB | on first format |
| ~90 Monaco language chunks | 8–16 kB each | — | per language |

The entry chunk has gone **6.94 MB → 6,322.51 kB → 2,111.11 kB** across the three
refreshes. #673 did prettier (−608.01 kB); **#693/#729 did Monaco**, which is the −66.6 %
step. Both use the same shape:

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
import wyw from '@wyw-in-js/vite';
// deleted: import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  plugins: [
    wyw({ include: ['**/*.ts'] }),   // narrow from '{ts,tsx}' once no .tsx remain
    // REQUIRED replacement: a TS transform that still applies
    //   jsc.transform.useDefineForClassFields = false  +  legacy decorators,
    // or Lit's reactive accessors get shadowed by decorated class fields.
  ],
  build: { assetsDir: 'admin/assets' },
  server: { /* CSP (report 03 §5) + proxy */ },
});
```

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
  **80 %** lines (#686 raised it from 70) against a measured **84.5 %** — so the headroom is
  ~4 points, not 14. Every element converted from a `.tsx` view enters that directory —
  **budget a test per element**, or the gate fails as the numerator stops keeping up. This
  is the single most likely way P2 breaks CI. Global lines are gated at **30 %** and stand
  at **34.72 %**; `src/services/**` gained its own 90 % gate.

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
| **P0 — Foundations** | Add `store/store.ts` singleton + `StoreController`, `FormController`, custom router (§10). Typed `AppDispatch` first (report 00 P1-1 — still **94** `as any` dispatch casts, 0 `AppDispatch` in `src`; **#694**). | New primitives unit-tested; app still boots on React. | **M** | 🟡 partly done |
| **P1 — Routing** | Replace `react-router-dom` with the chosen router (§10). Convert the `App.tsx`/`Views.tsx` route hosts (**9 live paths**), port the 14 `useNavigate`/13 `useLocation`/4 `useParams` sites and `SideNav.tsx`'s `NavLink`s, and decide the fate of the three empty `/groups`, `/people`, `/mail` shells. | `grep react-router-dom src` → empty; navigation + deep links work end-to-end. | **M** | 🔴 (**#716**) |
| **P2 — Leaf components** | Per report 02, convert leaf views bottom-up: MUI→Lit/WebAwesome (02) **+** icons (03) **+** react-redux→StoreController (§3) **+** Formik→FormController (§4) in one pass per file. Rename `.tsx`→`.ts`. Add a test per new element. | Each converted subtree renders with no React import; `keep-elements` coverage gate stays green. | **L** (bulk) | 🔴 |
| **P3 — Hard widgets** | ✅ date-pickers (#703) and tree-view (#704) done. 🔴 **DataGrid (5 files) remains** (report 02 §5.1, **#702**). Convert `FormsContainer.tsx` itself to a Lit element — the Monaco wiring inside it is ✅ done and now lazy. | Data-heavy views (schema/apps/people) work on Lit. | **Hard** | 🟡 2 of 3 done |
| **P4 — Shell & entry** | ✅ `wa-page` shell landed (#707). 🔴 Remaining: `App.tsx`→`<app-root>`, `index.tsx`→`main.ts`, `index.html` mount, `AppShell` from React to Lit; delete `KeepElements.tsx`; drop `@lit/react` **and** the `WaPage` React wrapper. | App boots with no `ReactDOM`; `Provider` gone. | **M** | 🟡 shell done, mount not |
| **P5 — Purge** | Replace the React SWC plugin **preserving its decorator options** (§2 caution), remove React types, drop the runtime deps; convert the **7** remaining `@testing-library/react` files; tighten CSP/tsconfig. ✅ `react-app-env.d.ts` already deleted (#677). | Definition of Done (§11) fully green. | **M** | 🔴 |

### Hard gates (must be true before proceeding)
- **G0 (exit P−1):** ✅ **met at `fcab645`** — `npm run lint`, `npm run build` and
  `npm run test` (70 files / 747 tests) all exit 0, plus a SonarQube quality-gate step
  (#688). A red baseline makes every later gate unreadable; keep it green.
- **G1 (exit P1):** no `react-router-dom` import anywhere; all deep links + `basename
  '/admin/ui'` behaviour preserved.
- **G2 (per P2 file):** the file has **no** `from 'react'`, `react-redux`, or `formik`
  import, is renamed `.ts`, and any new element has a test.
- **G3 (exit P4):** `grep -rn "react-dom" src` empty; `Provider`/`createRoot` gone.
- **G4 (exit P5):** `package.json` has no `react`, `@mui/*`, `react-*`, `@emotion/*`,
  `formik`, `@lit/react`, `@monaco-editor/*`; `vite.config.mts` and `vitest.config.ts`
  still apply the Lit decorator options.

### Riskiest items (watch list)
1. **`@mui/x-data-grid` (5 files)** — richest widget (sort/filter/paginate/selection).
   **No WebAwesome equivalent exists in any tier**, so the choice is a third-party web
   component grid or a custom Lit table (report 02 §5.1). **Highest risk; decide early,
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
   (G0 met) and hold `keep-elements` at 84.5 % against an 80 % gate — a real detector.
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
**L (multi-month).** Dominated by P2 volume (125 `.tsx`, 70 react-redux files) and the one
remaining P3 hard widget. The plumbing this report owns (entry point, router,
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

**Consequences for §9.** The P2 conversion surface is smaller than the 130-`.tsx` headline:
at least 10 of those files are in unreachable subtrees. Decide their fate — delete or
revive — **before** P2, so effort is not spent porting views nothing can reach.

> **Side benefit:** removing `react-router-dom` also clears the open high-severity
> advisory tracked in report 00 P2-10 / report 05.

---

## 11. Definition of Done

All must hold on the new stack:

```bash
grep -rn "from 'react'"         src   # → (empty)          [97 files at fcab645]
grep -rn "react-dom"            src   # → (empty)
grep -rn "react-redux"          src   # → (empty)          [70 files]
grep -rn "react-router-dom"     src   # → (empty)          [29 files]
grep -rn "from 'formik'"        src   # → (empty)          [19 files]
grep -rn "@mui/"                src   # → (empty)          [75 files]
grep -rn "@lit/react"           src   # → (empty)          [1 file]
grep -rn "webawesome/dist/react" src  # → (empty)          [1 file — the WaPage wrapper]
grep -rn "react-icons"          src   # → (empty)          [18 files]
find src -name '*.tsx'                # → (empty; all authoring files are .ts)  [125]
grep -rn "@monaco-editor/"      src   # → ✅ only a code comment
find src -name 'react-app-env.d.ts'   # → ✅ (empty) since #677
```

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
