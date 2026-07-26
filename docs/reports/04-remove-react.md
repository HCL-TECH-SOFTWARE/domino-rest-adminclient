# Report 04 — Capstone Roadmap: Fully Remove React

**Scope:** End-state plan to eliminate React (and every React-coupled dependency) from
`@hcl-software/domino-rest-adminclient`, leaving a Lit + WebAwesome + framework-agnostic
Redux SPA on Vite.

> **Refreshed 2026-07-27** against branch `new_code` @ `e17010c`. Previously refreshed
> 2026-07-27 against `7594672`. Originally written 2026-07-24.
>
> **No React *view* has been removed yet** — and that is on plan; this report is the last
> phase. But the first React-coupled runtime dependency is now **dead code**, and the first
> real bundle win has landed:
> - ✅ **The editor swap is done.** `FormsContainer.tsx` now renders `<KeepMonacoEditor>`
>   (#669). `grep -rn "@monaco-editor/" src` returns **only a comment** —
>   `@monaco-editor/react` and `@monaco-editor/loader` are still in `dependencies` with
>   **zero importers**. §5 is now a `package.json` deletion, not a code change.
> - ✅ **First code-split landed.** #673 moved `prettier` to `dependencies` *and* behind a
>   memoised dynamic `import()`. The entry chunk fell from 6.94 MB / 1.88 MB gzip to
>   **6,322.51 kB / 1,703.85 kB gzip**. This is the technique §7 recommends, proven on the
>   codebase — see §7's bundle subsection.
> - ✅ **All 24→26 Lit elements are TypeScript on a shared base class**, so the
>   "components get simpler, not rewritten" claim in §1 is now demonstrably true.
> - ✅ **The test story flipped**: 63 test files / 636 tests, only **4** of which use
>   `@testing-library/react`. The other 28 element suites already use a
>   framework-agnostic `mountLit` helper. §8 shrank accordingly.
> - ✅ **`tsconfig` already has the Lit posture** (`experimentalDecorators: true`,
>   `useDefineForClassFields: false`), so §7's tsconfig work is half done.
> - ✅ **G0 is green.** `npm run lint && npm run build && npm run test` all exit 0
>   (636 tests, 32.44 % line coverage). The P−1 phase of §9 is complete.
> - 🔴 **§5.1's DataGrid option set changed** — see report 02: WebAwesome ships **no** data
>   grid in any tier, so "buy Pro" was never available.

**This report orchestrates the others.** It sequences and gates the whole migration and
covers the React-specific plumbing (entry point, routing, `react-redux`, Formik, Monaco
wrapper). For component-by-component MUI→Lit/WebAwesome conversion and the icon
catalogue, defer to:

- **Report 00** — cross-cutting code quality; the `as any` / typed-dispatch work in P1-1
  is a direct prerequisite for §3.
- **Report 01** — test tooling; the coverage that makes this rewrite survivable.
- **Report 02** — MUI → Lit/WebAwesome component migration (the 130 `.tsx` views, incl.
  DataGrid / date-pickers / tree-view replacements).
- **Report 03** — the `wa-page` shell, design tokens, and icon migration
  (`@mui/icons-material` + `react-icons` + `app-icons.ts` → `<wa-icon>`).

React cannot be removed until reports 02 and 03 are essentially complete; this plan
defines the gates that make that ordering explicit.

---

## 1. Current-state snapshot (verified 2026-07-27)

| Fact | 2026-07-24 | `7594672` | **`e17010c`** | Source |
|---|---|---|---|---|
| `.tsx` files | 135 | 130 | **130** | `find src -name '*.tsx'` |
| `.tsx`/`.ts` importing React | 109 | 107 | **107** | `grep -rln "from 'react'"` |
| Files using `react-redux` | 85 | 77 | **77** | grep |
| `useSelector` call sites | 224 | 207 | **207** | grep |
| `useDispatch` call sites | 120 | 116 | **116** | grep |
| `connect()` HOC call sites | **0** | 0 | **0** | grep — **all Redux consumption is via hooks** |
| `createSelector` (memoized selectors) | — | 0 | **0** | grep — see §3 |
| `React.lazy` / `Suspense` | — | — | **0** | grep — no React-side code-splitting at all |
| `dispatch(… as any)` casts | — | 95 | **95** | grep — report 00 P1-1 still open |
| `as any` (whole `src`) | — | — | **154** | grep |
| Files using `formik` | 19 | 19 | **19** (`useFormik` 8, `FormikProps` 11) | grep |
| Files using `yup` | 7 | 7 | **7** | grep |
| `@mui/material` imports | 70 files | 69 | **69 files / 175 refs** | grep |
| `@mui/icons-material` imports | 47 files | 45 | **45 files / 99 refs** | grep |
| `react-icons` imports | 18 files | 18 | **18** | grep |
| `@mui/x-data-grid` | 5 files | 5 | **5** | grep |
| `@mui/x-date-pickers` | 2 files | 2 | **2** | grep |
| `@mui/x-tree-view` | 2 files | 2 | **2** | grep |
| `@mui/lab` | present in deps | removed ✅ | ➖ gone | `package.json` |
| `@monaco-editor/*` imports in `src` | 1 file | 1 file (`FormsContainer.tsx`) | **0** ✅ | grep — only a code comment matches |
| `@emotion/*` direct imports in `src` | **0** | 0 | **0** (MUI peer only) | grep |
| Hand-written Lit web components | 24 plain-JS `.js` | 26 TypeScript `.ts` | **26 TypeScript `.ts`** on a shared `KeepElement` base | `src/components/keep-elements/` |
| `@lit/react` bridge | 1 file (`LitElements.tsx`) | 1 file | **1 file** (`KeepElements.tsx`, 26 `createComponent` wrappers) | grep |
| `@testing-library/react` | 4 of 4 test files | 4 of 53 | **4 of 63 test files** ✅ | grep |
| Framework-agnostic element tests | 0 | 26 | **28** (via `test/test-utils/lit.ts`) | grep |
| Router | `react-router-dom` v7 | v7.18.1, 31 files | **v7.18.1**, 31 importing files | grep |
| `<Routes>` hosts | 3 | 2 | **2** (`App.tsx`, `Views.tsx`) — `SettingsPage.tsx`'s bare `<Route>`s are **dead code**, see §10 | grep |
| Live route paths | — | ~13 (claimed, never measured) | **9** (measured) | `App.tsx` + `Views.tsx`; the rest are JSX-commented (§10) |
| Unreachable view subtrees | — | — | `components/settings` (8 `.tsx`), `components/groups` (2 `.tsx`) | grep — no importers |
| Route hooks | `useNavigate` 14, `useLocation` 14, `useParams` 4 | unchanged | **unchanged** | grep |
| Entry chunk | — | 6.94 MB / 1.88 MB gzip | **6,322.51 kB / 1,703.85 kB gzip** | `npm run build` — see §7 |

Key versions at `e17010c`: react **19.2.8** · react-dom 19.2.8 · react-redux 9.3.0 ·
react-router-dom **7.18.1** · @reduxjs/toolkit **2.12.0** · @mui/material 9.2.0 ·
@awesome.me/webawesome 3.10.0 · lit 3.3.3 · monaco-editor 0.55.1 · prettier 3.9.6.
32 `dependencies`, 17 `devDependencies`.

**Four findings that de-risk the whole effort:**

1. **Zero `connect()` HOCs** — every store read/write goes through
   `useSelector`/`useDispatch`. Replacing `react-redux` is a mechanical hook→controller
   swap, not an architecture change.
2. **The Redux store is already framework-agnostic** — `src/store/index.ts` is plain
   `combineReducers` over **17 classic switch reducers**; `configureStore` lives in the
   entry point (`src/index.tsx`). It survives untouched. **And it is now well tested** —
   every `store/*/reducer.ts` is above the 95 % coverage gate (report 01), and #673 added
   the first *action*/thunk test (`test/store/account/action.test.ts`, covering
   `renewToken`'s error paths). Reducer parity plus the first thunk contract makes the
   eventual RTK/`createSlice` modernization (report 00 P1-2) materially safer than it was.
3. **26 typed Lit elements already exist** and are only *adapted* into React via
   `@lit/react`. Removing React means deleting the adapter (`KeepElements.tsx`) and using
   the custom elements directly — these components get *simpler*, not rewritten. This is
   now more than a claim: the elements are TypeScript, decorated, individually unit-tested
   without React, and augment `HTMLElementTagNameMap` for direct-DOM typing.
4. **The test suite is mostly already React-free.** **59 of 63** files never touch
   `@testing-library/react`. §8 is still a 4-file job, not a whole-suite migration.

**The finding that raised risk is now audited — and it shrinks the job.**
`SettingsPage.tsx` does render four `<Route>` elements with **no `<Routes>` parent**
(lines 90–99: `/settings/account|roles|mail|logs`). But the file has **no importer
anywhere in `src`**: its only reference is a commented-out `<SettingsPage />` inside
`Views.tsx`, where the `/groups`, `/people`, `/mail` and `/settings` route blocks are also
commented out. Those orphaned `<Route>`s never execute. See **§10** for the corrected live
route inventory (**9 paths**) and for the one *live* navigation that now dangles.

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
| `react-redux` | Lit `StoreController` reactive controller (§3) | **Work** | 77 files, 323 hook call sites — mechanical but broad. |
| `react-router-dom` 7.18.1 | Small custom router (History API) or `@lit-labs/router` (§10) | **Work** | **9 live route paths** across 2 `<Routes>` hosts (§10 corrects the previous count). 31 importing files. Still carries an open **high**-severity advisory on `react-router` (report 00 P2-10 / report 05) — removal resolves it. |
| `@lit/react` | Direct custom-element usage (delete `KeepElements.tsx`) | Drop | Bridge is only needed *because of* React. 26 `createComponent` wrappers in one file. |
| `@monaco-editor/react` ^4.8.0-rc.3 | `keep-monaco-editor` — **swap complete** (§5) | 🔴 **Drop now** | **Zero importers in `src`.** Still in `dependencies`. Delete today — no code change required. |
| `@monaco-editor/loader` ^1.7.0 | Same — the element imports Monaco as ESM | 🔴 **Drop now** | **Zero importers in `src`.** Still in `dependencies`. The `disabledpostinstall` script that existed to feed its AMD loader is now definitively obsolete — delete both together. |
| `monaco-editor` | **Keep** — direct dependency, imported by `keep-monaco-editor` | — | Promoted from transitive in `7594672`. Currently a **static** top-level import; see §5/§7 for the code-splitting opportunity. |
| `prettier` 3.9.6 | **Keep** | ✅ **done** | #673 moved it to `dependencies` *and* behind a memoised dynamic `import()` — it now code-splits out of the entry chunk (report 00 P0-10 closed). |
| `react-icons` | WebAwesome `<wa-icon>` (report 03 §6.4) | Hard→03 | 18 files. |
| `@mui/icons-material` | WebAwesome `<wa-icon>` (report 03 §6.4) | Hard→03 | 45 files. |
| `@mui/material` | Lit + WebAwesome components (report 02) | Hard→02 | 69 files — largest surface. |
| ~~`@mui/lab`~~ | — | ✅ **already removed** | `0349a71`. |
| `@mui/x-data-grid` | Third-party WC grid or custom Lit table (report 02 §5.1) | **Hard**→02 | 5 files; **riskiest single widget**. Note: no WebAwesome grid exists in any tier. |
| `@mui/x-date-pickers` | `wa-input type="date"` + dayjs (report 02 §5.2) | Hard→02 | 2 files. No WA date picker in any tier — native input is the answer. |
| `@mui/x-tree-view` | `wa-tree`/`wa-tree-item` (free) | **Swap**→02 | 2 files. **The cheapest MUI X removal — schedule it first.** |
| `@emotion/react`, `@emotion/styled` | — (removed) | Drop | MUI peers only; **0** direct imports. |
| `formik` | Native form + Yup (§4) | **Work** | 19 files. |
| `@fortawesome/fontawesome-free` 7.3.1 | — | **Keep** ✅ | No longer dead: #669 made it load-bearing — `src/services/icon-library.ts` imports 12 glyphs as `?url` SVGs to self-host WA icons. |
| `@fontsource-variable/crimson-pro`, `@fontsource-variable/quicksand` | — | Drop | Still **0 imports** anywhere in `src`, `public` or `index.html`. Decide before they become load-bearing. |
| `redux`, `@reduxjs/toolkit`, `redux-thunk` | **Keep** | — | Framework-agnostic; no change. |
| `lit`, `@awesome.me/webawesome` | **Keep / expand** | — | Target runtime. |
| `yup`, `uuid`, `dayjs`, `immer`, `events` | **Keep** | — | Framework-agnostic. |
| `@linaria/react`, `@wyw-in-js/*` | **Keep** | — | Styling survives React removal. (`@linaria/core` is no longer a direct dep.) |

### Build / test / lint / type dependencies

| Dependency | Action | Effort | Notes |
|---|---|---|---|
| `@vitejs/plugin-react-swc` (dev) | **Cannot simply remove** — see the caution below | **Work** | Keep the `wyw` (Linaria) plugin (§7). |
| `@types/react`, `@types/react-dom` (dev) | **Remove** | Drop | After the last `.tsx` is gone. |
| `@testing-library/react` (dev) | Replace in **4 files** with `mountLit` / `@testing-library/dom` | **S** | Was "4 of 4 test files"; now 4 of 63 (§8). |
| `@testing-library/jest-dom` (dev) | Keep (DOM matchers, framework-agnostic) | — | Imported as `@testing-library/jest-dom/vitest`. |
| ~~`eslintConfig: react-app` / `react-app/jest`~~ | ✅ **already gone** | — | Replaced by `oxlint` + `.oxlintrc.json` (report 00 P0-3). The oxlint `"react"` plugin entry can be dropped at the very end. |
| ~~`jest.config.ts` React transform~~ | ✅ **already gone** | — | Jest removed entirely (report 01). |
| ~~`babel.config.js`~~ | ✅ **already gone** | — | Removed with the Jest migration. |
| `tsconfig.json` `"jsx": "react-jsx"` | Remove once no `.tsx` remain | **Work** | (§7). `experimentalDecorators: true` and `useDefineForClassFields: false` are **already set** ✅ |
| `src/react-app-env.d.ts` | **Delete** | Drop | Still present; unreferenced CRA ambient types (report 00 P2-1). Move any needed asset-module shims to `src/vite-env.d.ts`. |
| ~~`src/custom-elements.d.ts`~~ | ✅ **already gone** | — | Each element now augments `HTMLElementTagNameMap` itself. |
| `disabledpostinstall` script | **Delete** | Drop | `cp -R ./node_modules/monaco-editor/min/vs ./public/monaco-editor-core` — existed only to feed `@monaco-editor/loader`'s AMD path. With that dep dead, the script is obsolete with no caveats (report 00 P2-9). |

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

## 5. Editor — ✅ done in code; two dead dependencies left to delete

The `<monaco-editor>` element this section proposed **exists and is wired**:
`src/components/keep-elements/keep-monaco-editor.ts` (582 lines, tag `keep-monaco-editor`,
exported as `KeepMonacoEditor` with `events: { onChange: 'change' }`), and
`FormsContainer.tsx` renders it (line 658). It went further than the original sketch:

- **ESM Monaco**, not the AMD loader — `import * as monaco from 'monaco-editor'` plus
  `editor.worker`, `json.worker` and `ts.worker` via Vite's `?worker` imports (which is why
  `worker-src 'self' blob:` in the CSP is load-bearing — report 03 §5).
- **Token-driven theme** — `src/services/editor-theme.ts` (`buildEditorTheme`,
  `EDITOR_TOKENS`) builds a Monaco theme from live WebAwesome tokens, resolved through
  `wa-color.ts` / `wa-typography.ts`. This replaces the hand-written
  `json-light`/`json-dark` JSON themes in `FormsContainer`.
- **Prettier formatting** via `prettier/standalone` — now behind a **memoised dynamic
  `import()`** (`fetchPrettier()` / `prettierBundle ??=`, lines 33–48), so the formatter is
  fetched on first use rather than bundled into the entry chunk.
- Namespaced logging via `getLogger('components/keep-monaco-editor')`.

**Consequently `@monaco-editor/loader` moves from "Keep" to "Drop"** — the ESM approach
needs neither the loader nor the `postinstall` copy of `monaco-editor/min/vs` into
`public/` (disabled in `7594672`; see report 00 P2-9).

**Status of the work items this section listed:**

1. ✅ **Test regressions fixed** — but *not* by making the Monaco import dynamic. #668
   added a fake-Monaco harness (`test/test-utils/monaco.ts`) plus a
   `queryCommandSupported` polyfill, and a full suite for the element. The suite is green
   (636 tests) and `src/components/keep-elements` is at **84.2 %** line coverage against a
   70 % gate.
2. ✅ **`prettier` moved to `dependencies`** (#673, report 00 P0-10 closed) — and made
   dynamic, which is what actually shrank the bundle. See §7.
3. ✅ **`FormsContainer.tsx` points at `<KeepMonacoEditor>`** (#669). The `defineTheme` /
   `handleEditorDidMount` logic moved to `editor-theme.ts` and the element's lifecycle;
   the file no longer imports `@monaco-editor/*`.
4. 🔴 **Drop `@monaco-editor/react` + `@monaco-editor/loader` and delete the
   `disabledpostinstall` script.** *This is the only item left, and it is now trivially
   safe:* both packages have **zero importers in `src`** — the sole textual match is a
   code comment in `keep-monaco-editor.ts` line 139. The earlier caveat ("verify the
   editor still resolves its assets before removing the loader") is **resolved**: the
   element imports `monaco-editor` as ESM and its three workers via Vite `?worker`, so
   nothing reads `public/monaco-editor-core` and nothing reads the AMD loader.
5. ➖ **Not applicable.** The previous revision said to "repeat for
   `access/ScriptEditor.tsx`". That file has **never** used Monaco — at `7594672` and at
   `e17010c` it is an MUI `TextField` + `KeepTextformArray` editor. `FormsContainer.tsx`
   was the *only* Monaco consumer.

**Still open (moved out of this section's critical path):** the Monaco import itself is
**static** (`import * as monaco from 'monaco-editor'`, line 11), so Monaco core still sits
in the entry chunk. Making it dynamic inside `firstUpdated()` is now a pure bundle
optimisation rather than a test fix — the largest remaining single win, and the same
technique #673 already proved with `prettier` (§7).

Effort: item 4 is **XS** (a `package.json` edit); the dynamic-import optimisation is **S**.

---

## 6. Icons — replace `@mui/icons-material` + `react-icons` (+ `app-icons.ts`)

Owned by **report 03 §6.4**. There are **three** legacy icon systems to remove —
`@mui/icons-material` (45 files, 99 refs), `react-icons` (18 files), and
`src/styles/app-icons.ts` (216 KB of base64 SVG data URIs, **19 importers**) — plus a dead
`src/styles/icons.json` (144 KB, still **0 importers**, delete it).

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

Replace `ReactDOM.createRoot(...).render(<Provider><App/></Provider>)` with a
custom-element mount. Everything else (the five CSS imports, theme init) stays. There is
**no `setBasePath()` call to carry across** — see the note below.

```ts
// src/index.ts (was index.tsx)
import './index.css';
import './styles/styles.css';
import './styles/dark-mode.css';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import './styles/keep-overrides.css';        // renamed from lit-overrides.css
import './services/icon-library';            // registers the self-hosted WA icon library
import './store/store';       // instantiates the singleton store
import './app-root';          // defines <app-root> (was App.tsx)

// no createRoot, no <Provider> — the store is a module singleton (§3)
// no setBasePath() — see below
```

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

The shell itself becomes `<wa-page>` — see **report 03 §2.3** (now confirmed free tier).
`<wa-page>` is **not used anywhere** in `src` yet.

### Bundle & code-splitting — ✅ first win landed

`npm run build` at `e17010c` exits 0 in ~3 s and emits:

| Chunk | Size | Gzip | When it loads |
|---|---|---|---|
| `dist/admin/assets/index-*.js` (entry) | **6,322.51 kB** | **1,703.85 kB** | always |
| `babel-*.js` (prettier) | 316.53 kB | — | on first format |
| `estree-*.js` (prettier) | 210.43 kB | — | on first format |
| `standalone-*.js` (prettier) | 81.05 kB | — | on first format |
| ~60 Monaco language chunks | — | — | per language |

The previous refresh measured the entry chunk at **6.94 MB / 1.88 MB gzip**. The drop is
entirely #673: `prettier` moved from `devDependencies` to `dependencies` *and* its three
modules moved behind a memoised dynamic `import()` in `keep-monaco-editor.ts`. Those three
modules are exactly the `babel` + `estree` + `standalone` chunks above — **608.01 kB** that
the entry chunk no longer carries:

```ts
const fetchPrettier = () => Promise.all([
  import('prettier/standalone'),
  import('prettier/plugins/babel'),
  import('prettier/plugins/estree'),
]);
let prettierBundle: ReturnType<typeof fetchPrettier> | undefined;
const loadPrettier = () => (prettierBundle ??= fetchPrettier());
```

**This is the pattern to repeat, and it is the report's first measured win.** Two
observations follow from it:

1. **`React.lazy`/`Suspense` are used 0 times** — the React app does no route-level code
   splitting at all. That is not worth retrofitting *into* React given this report's
   direction, but it means the whole app — all 130 `.tsx` files — ships in one chunk today.
2. **Monaco core is the next and largest target.** `keep-monaco-editor.ts` still imports it
   statically (§5). Moving `import * as monaco from 'monaco-editor'` into `firstUpdated()`
   applies exactly the `loadPrettier()` shape above and should take several MB more out of
   the entry chunk, since the editor appears on one tab of one view. Do it before P4 so the
   shell swap is measured against a realistic baseline.

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
Delete `src/react-app-env.d.ts`. Consider splitting out a `tsconfig.test.json` so the
production build stops type-checking `test/` (report 00 P1-9).

`.tsx` → `.ts`: each converted file is renamed (no JSX left). This happens file-by-file
during report 02; the last rename removes the final React import.

---

## 8. Tests, lint

- **Tests — much smaller than it was.** Only **4** of **63** files use
  `@testing-library/react`: `test/App.test.tsx`, `test/components/access/TabsAccess.test.tsx`,
  `test/components/forms/EditView.test.tsx`,
  `test/components/dialogs/UnsavedChangesDialog.test.tsx`. The other **28** element suites
  already use the framework-agnostic `mountLit`/`cleanupLit` helper in
  `test/test-utils/lit.ts`, and the 19 store suites plus the service/util suites need no
  DOM library at all. When those 4 views are converted, replace `render()` with `mountLit`
  (or `@testing-library/dom`) and drop `@testing-library/react`. Keep
  `@testing-library/jest-dom/vitest` matchers and `jsdom`. **Effort: S.**
- **A second framework-agnostic harness now exists:** `test/test-utils/monaco.ts` (#668)
  fakes `monaco-editor` so the element suite runs under jsdom. Reuse it rather than
  reintroducing a real Monaco into tests when `FormsContainer` is converted in P3.
- **Lint:** `oxlint` already replaced the `react-app` presets. `.oxlintrc.json` lists a
  `"react"` plugin — drop it in the final purge. Consider adding a Lit/web-components
  rule set at that point if oxlint offers one; otherwise the TS + correctness categories
  already carry most of the value.
- **Coverage gates:** `vitest.config.ts` gates `src/components/keep-elements/**` at 70 %
  lines; the directory currently sits at **84.2 %**, so there is headroom but not much.
  Every element converted from a `.tsx` view enters that directory — budget a test per
  element, or the gate will start failing as the numerator stops keeping up. Global lines
  are gated at 20 % and stand at **32.44 %**.

---

## 9. Sequencing, gates & risk

React (`react` + `react-dom`) can only be dropped when **the last `.tsx`, the last
`react-redux` hook, the last `<Route>`, and the last Formik import are gone.** (The last
Monaco-React import is ✅ already gone.) Sequence so that each phase leaves the app
shippable (React and Lit coexist throughout via the existing `@lit/react` bridge until the
very end).

| Phase | Work | Gate to exit | Effort | Status |
|---|---|---|---|:---:|
| **P−1 — Unblock** | Fix report 01 §0 (jsdom polyfill + Monaco test), move `prettier` to `dependencies`, make the Monaco import dynamic. | `npm run lint && npm run build && npm run test` all green. | **S** | ✅ **done** — #668/#673; all three exit 0 (Monaco import made *testable*, not dynamic — see §5) |
| **P−0.5 — Free deletion** | Drop `@monaco-editor/react`, `@monaco-editor/loader` and the `disabledpostinstall` script (§5, item 4). | `grep -rn "@monaco-editor/" src` already empty; `npm ci && npm run build` still green. | **XS** | 🔴 **do first — no code change needed** |
| **P0 — Foundations** | Add `store/store.ts` singleton + `StoreController`, `FormController`, custom router (§10). Typed `AppDispatch` first (report 00 P1-1 — still 95 `as any` dispatch casts, 0 `AppDispatch` in `src`). `<monaco-editor>` ✅ already exists and is wired. | New primitives unit-tested; app still boots on React. | **M** | 🟡 partly done |
| **P1 — Routing** | Replace `react-router-dom` with the chosen router (§10). Convert the `App.tsx`/`Views.tsx` route hosts (**9 live paths**), port the 14 `useNavigate`/14 `useLocation`/4 `useParams` sites and `SideNav.tsx`'s 4 `NavLink`s, and decide the fate of the commented-out settings/groups routes. | `grep react-router-dom src` → empty; navigation + deep links work end-to-end. | **M** | 🔴 |
| **P2 — Leaf components** | Per report 02, convert leaf views bottom-up: MUI→Lit/WebAwesome (02) **+** icons (03) **+** react-redux→StoreController (§3) **+** Formik→FormController (§4) in one pass per file. Rename `.tsx`→`.ts`. Add a test per new element. | Each converted subtree renders with no React import; `keep-elements` coverage gate stays green. | **L** (bulk) | 🔴 |
| **P3 — Hard widgets** | DataGrid (5), date-pickers (2), tree-view (2) replacements (report 02). Convert `FormsContainer.tsx` itself to a Lit element — the Monaco wiring inside it is ✅ already done. Optionally make the Monaco import dynamic (§7). | Data-heavy views (schema/apps/people) work on Lit. | **Hard** | 🔴 |
| **P4 — Shell & entry** | `wa-page` shell (report 03 §2.3); `App.tsx`→`<app-root>`, `index.tsx`→`index.ts`, `index.html` mount; delete `KeepElements.tsx`; drop `@lit/react`. | App boots with no `ReactDOM`; `Provider` gone. | **M** | 🔴 |
| **P5 — Purge** | Replace the React SWC plugin **preserving its decorator options** (§2 caution), remove React types, delete `react-app-env.d.ts`, drop the runtime deps; convert the 4 remaining `@testing-library/react` files; tighten CSP/tsconfig. | Definition of Done (§11) fully green. | **M** | 🔴 |

### Hard gates (must be true before proceeding)
- **G0 (exit P−1):** ✅ **met at `e17010c`** — `npm run lint`, `npm run build` and
  `npm run test` (63 files / 636 tests) all exit 0. A red baseline makes every later gate
  unreadable; keep it green.
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
2. **~77 `react-redux` files / 323 hook sites** — low complexity, high volume. Risk is
   churn and merge conflicts, not difficulty. Mitigate by doing it inside the P2 per-file
   pass and keeping PRs small.
3. **The SWC decorator configuration** — a silent, whole-layer breakage if
   `@vitejs/plugin-react-swc` is removed without replacing `tsDecorators` +
   `useDefineForClassFields: false`. Class-field shadowing does not fail loudly; it just
   stops elements reacting. Covered by the 28 element test suites, which **are** green
   (G0 met) and hold `keep-elements` at 84.2 % line coverage — a real detector now.
4. **Routing** — **downgraded.** Nested routes across 2 hosts + a `PrivateRoutes` guard +
   `basename`, but only **9 live paths** (§10); the orphaned `<Route>`s in
   `SettingsPage.tsx` turned out to be unreachable. A subtle base-path or guard regression
   still breaks deep links, so add route smoke tests before P1 exit — but this is now an
   **M**, not the open-ended audit the previous revision implied.
5. **`x-date-pickers` / `x-tree-view`** — fewer files and both now have clear answers
   (native date input; free `wa-tree`). `x-tree-view` is the cheapest win in the whole
   program.
6. **CSP** — **still disabled entirely** at `e17010c`: `vite.config.mts` sets the header
   under the key `'disabledContent-Security-Policy'`, which no browser reads (report 00
   P0-2). Re-enable it *before* P4, or the shell swap will be validated against a policy
   that is not being enforced. The policy text already carries `worker-src 'self' blob:`,
   which Monaco's workers need.

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
**L (multi-month).** Dominated by P2 volume (130 `.tsx`, 77 react-redux files) and the P3
hard widgets. The plumbing this report owns (entry point, router, StoreController,
FormController, Monaco wrapper) is **M** and front-loaded — and the Monaco piece is
**built, wired and tested**, leaving only a two-line `package.json` deletion (P−0.5).

---

## 10. Routing replacement (detail)

Current shape (verified at `e17010c`): a `<BrowserRouter basename="/admin/ui">` in
`App.tsx` (line 85) with a catch-all auth split (`path='*'` → `HomeElement`/`LoginPage`,
plus `/callback`), nested `<Routes>` in `Views.tsx` (lines 135–146, behind a
`PrivateRoutes` guard from `components/routers/ProtectedRoute`, inside a
`NavigationGuardProvider basename="/admin/ui"`), and `SettingsPage.tsx` rendering
`<Route path="/settings/…">` elements **with no `<Routes>` parent**. Params used:
`:nsfPath`, `:dbName`, `:formName` (4 `useParams` sites). 31 files import
`react-router-dom`.

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
grep -rn "from 'react'"         src   # → (empty)
grep -rn "react-dom"            src   # → (empty)
grep -rn "react-redux"          src   # → (empty)
grep -rn "react-router-dom"     src   # → (empty)
grep -rn "from 'formik'"        src   # → (empty)
grep -rn "@mui/"                src   # → (empty)
grep -rn "@lit/react"           src   # → (empty)
grep -rn "@monaco-editor/"      src   # → ✅ already only a code comment
grep -rn "react-icons"          src   # → (empty)
find src -name '*.tsx'                # → (empty; all authoring files are .ts)
find src -name 'react-app-env.d.ts'   # → (empty)   [still present at e17010c]
```

- `package.json` `dependencies` contains **no** `react`, `react-dom`, `react-redux`,
  `react-router-dom`, `@lit/react`, `@monaco-editor/react`, `@monaco-editor/loader`,
  `react-icons`, `@mui/*`, `@emotion/*`, `formik`; `devDependencies` contains no
  `@types/react*` or `@testing-library/react`.
- `package.json` `scripts` no longer contains `disabledpostinstall`, and
  `@fontsource-variable/*` is either wired up or removed.
- `vite.config.mts` and `vitest.config.ts` no longer use `@vitejs/plugin-react-swc` **but
  still apply legacy decorators + `useDefineForClassFields: false`**;
  `tsconfig.json` no longer sets `"jsx": "react-jsx"`.
- `.oxlintrc.json` no longer lists the `react` plugin.
- `npm run lint`, `npm run build` (tsc -b + vite build) and `npm run test` are all green,
  with the coverage gates in `vitest.config.ts` satisfied.
- A CSP header is actually **sent** (report 00 P0-2) and validated in enforcing mode.
- App boots from `<app-root>` inside `<wa-page>` with the Redux store as a module
  singleton, routing/deep-links, forms, and the Monaco editor all functional — verified in
  a browser smoke test.
