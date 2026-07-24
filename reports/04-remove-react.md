# Report 04 — Capstone Roadmap: Fully Remove React

**Scope:** End-state plan to eliminate React (and every React-coupled dependency) from
`@hcl-software/domino-rest-adminclient`, leaving a Lit + WebAwesome + framework-agnostic
Redux SPA on Vite.

**This report orchestrates the others.** It sequences and gates the whole migration and
covers the React-specific plumbing (entry point, routing, `react-redux`, Formik, Monaco
wrapper). For component-by-component MUI→Lit/WebAwesome conversion and the icon catalogue,
defer to:

- **Report 01** — inventory / current-state baseline.
- **Report 02** — MUI → Lit/WebAwesome component migration (the ~135 `.tsx` views, incl.
  DataGrid / date-pickers / tree-view replacements).
- **Report 03** — icon migration (`@mui/icons-material` + `react-icons` → WebAwesome icons).

React cannot be removed until reports 02 and 03 are essentially complete; this plan defines
the gates that make that ordering explicit.

---

## 1. Current-state snapshot (verified in this worktree)

| Fact | Value | Source |
|---|---|---|
| `.tsx` files | 135 | `find src -name '*.tsx'` |
| `.tsx`/`.ts` importing React | 109 | `grep -rln "from 'react'"` |
| Files using `react-redux` | 85 | `grep -rln react-redux` |
| `useSelector` call sites | 224 | grep |
| `useDispatch` call sites | 120 | grep |
| `connect()` HOC call sites | **0** | grep — **all Redux consumption is via hooks** |
| Files using `formik` | 19 (`useFormik` in 8, `FormikProps` typing in 11) | grep |
| Files using `yup` | 7 (validation schemas, already paired with Formik) | grep |
| `@mui/material` imports | 70 files | grep |
| `@mui/icons-material` imports | 47 files | grep |
| `react-icons` imports | 18 files | grep |
| `@mui/x-data-grid` | 5 files | grep |
| `@mui/x-date-pickers` | 2 files | grep |
| `@mui/x-tree-view` | 2 files | grep |
| `@emotion/*` direct imports in `src` | **0** (MUI peer only) | grep |
| `redux-thunk` direct references | 1 (async actions dispatched via `dispatch(x() as any)`) | grep |
| Hand-written Lit web components | 24 (`src/components/lit-elements/*.js`) already wrapped via `@lit/react` | ls |
| `@lit/react` bridge | 1 file: `src/components/lit-elements/LitElements.tsx` | grep |
| `@testing-library/react` | 4 test files (4 test files total) | grep |
| Router | `react-router-dom` v7, `<BrowserRouter>`/`<Routes>`/`<Route>` in `App.tsx`, `Views.tsx`, `SettingsPage.tsx` | grep |
| Route hooks | `useNavigate` 14, `useLocation` 14, `useParams` 4 files | grep |

**Three findings that de-risk the whole effort:**

1. **Zero `connect()` HOCs** — every store read/write already goes through
   `useSelector`/`useDispatch`. Replacing `react-redux` is a mechanical hook→controller
   swap, not an architecture change.
2. **The Redux store is already framework-agnostic** — `src/store/index.ts` is plain
   `combineReducers`; `configureStore` lives in the entry point. It survives untouched.
3. **24 Lit web components already exist** and are only *adapted* into React via
   `@lit/react`. Removing React means deleting the adapter (`LitElements.tsx`) and using the
   custom elements directly — these components get *simpler*, not rewritten. `@emotion` has
   no direct usage, so it falls out for free with MUI.

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
| `react-redux` | Lit `StoreController` reactive controller (§3) | **Work** | 85 files, 344 hook call sites — mechanical but broad. |
| `react-router-dom` v7 | Small custom router (History API) or `@lit-labs/router` (§2) | **Work** | ~10 route defs, 3 router hosts. |
| `@lit/react` | Direct custom-element usage (delete `LitElements.tsx`) | Drop | Bridge is only needed *because of* React. |
| `@monaco-editor/react` | `@monaco-editor/loader` (already a dep) in a `<monaco-editor>` Lit element (§5) | **Work** | 1 consumer (`FormsContainer.tsx`). |
| `react-icons` | WebAwesome `<wa-icon>` (report 03) | Hard→02/03 | 18 files. |
| `@mui/icons-material` | WebAwesome `<wa-icon>` (report 03) | Hard→02/03 | 47 files. |
| `@mui/material` | Lit + WebAwesome components (report 02) | Hard→02 | 70 files — largest surface. |
| `@mui/lab` | report 02 | Drop/02 | No `src` imports found; likely already removable. |
| `@mui/x-data-grid` | WebAwesome/Lit table or `<wa-*>` + grid (report 02) | **Hard**→02 | 5 files; **riskiest single widget**. |
| `@mui/x-date-pickers` | `<wa-*>` date input or native `<input type=date>` + dayjs | Hard→02 | 2 files. |
| `@mui/x-tree-view` | Lit tree (2 tree files) / existing `lit-source` tree | Hard→02 | 2 files; a Lit source tree already exists. |
| `@emotion/react`, `@emotion/styled` | — (removed) | Drop | MUI peers only; **0** direct imports. |
| `formik` | Native form + Yup (§4) | **Work** | 19 files. |
| `redux`, `@reduxjs/toolkit`, `redux-thunk` | **Keep** | — | Framework-agnostic; no change. |
| `lit`, `@awesome.me/webawesome` | **Keep / expand** | — | Target runtime. |
| `@monaco-editor/loader` | **Keep** (becomes the only Monaco dep) | — | Already installed. |
| `yup`, `uuid`, `dayjs`, `immer`, `events` | **Keep** | — | Framework-agnostic. |
| `@linaria/*`, `@wyw-in-js/*` | **Keep** | — | Styling survives React removal. |

### Build / test / lint / type dependencies

| Dependency | Action | Effort | Notes |
|---|---|---|---|
| `@vitejs/plugin-react-swc` (dev) | **Remove** from `vite.config.mts` | Drop | Keep the `wyw` (Linaria) plugin (§7). |
| `@types/react`, `@types/react-dom` (dev) | **Remove** | Drop | After last `.tsx` is gone. |
| `@testing-library/react` (dev) | Replace with `@open-wc/testing` / `@testing-library/dom` | **Work** | Only 4 test files (§8). |
| `@testing-library/jest-dom` (dev) | Keep (DOM matchers, framework-agnostic) | — | |
| `eslintConfig: react-app` + `react-app/jest` (in `package.json`) | Replace with flat ESLint + `eslint-plugin-lit` / `eslint-plugin-wc` | **Work** | Removes React lint rules. |
| `jest.config.ts` `jsc.transform.react.runtime: 'automatic'` | Remove React transform block | Drop | SWC transpiles plain TS after `.tsx`→`.ts`. |
| `babel.config.js` (`@babel/preset-typescript`) | Keep | — | No React preset present. |
| `tsconfig.json` `"jsx": "react-jsx"` | Change to `"react-jsx"`→removed, or `"preserve"`; Lit needs no JSX | **Work** | (§7). |
| `src/react-app-env.d.ts` | Delete | Drop | CRA/react ambient types. |
| `src/custom-elements.d.ts` | Keep/expand (declare custom elements) | — | Already declares 3 custom tags. |

**Net:** 16 packages removed from `dependencies` (`react`, `react-dom`, `react-redux`,
`react-router-dom`, `@lit/react`, `@monaco-editor/react`, `react-icons`, `@mui/icons-material`,
`@mui/material`, `@mui/lab`, `@mui/x-data-grid`, `@mui/x-date-pickers`, `@mui/x-tree-view`,
`@emotion/react`, `@emotion/styled`, `formik`), plus 3 devDeps (`@vitejs/plugin-react-swc`,
`@types/react`, `@types/react-dom`) and `@testing-library/react`.

---

## 3. State ↔ view binding without `react-redux`

**Keep** the Redux store exactly as-is (`configureStore` + `rootReducer`). Replace only the
*binding layer* (`Provider` / `useSelector` / `useDispatch`). Because there are **zero
`connect()` HOCs**, a single Lit **reactive controller** covers every one of the 344 hook
sites.

**Recommendation: a `StoreController` reactive controller + a module-level store singleton.**
`@lit/context` is available if per-subtree store injection is ever needed, but this app has a
single global store, so a shared singleton (imported like any module) is simpler than a
context provider and avoids re-plumbing 85 files with a context consumer.

### Store singleton (replaces `Provider` in the entry point)

```ts
// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './index';
export const store = configureStore({ reducer: rootReducer });
export type AppDispatch = typeof store.dispatch;
```

### The controller (replaces `useSelector` + `useDispatch`)

```ts
// src/store/StoreController.ts
import { ReactiveController, ReactiveControllerHost } from 'lit';
import { store, AppDispatch } from './store';
import type { AppState } from './index';

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
class AppRoot extends LitElement {
  private account = new StoreController(this, (s) => s.account);
  private styles  = new StoreController(this, (s) => s.styles);

  private onLogin() { this.account.dispatch(authenticate()); }

  render() {
    return html`${this.account.value.authenticated ? html`…` : html`<login-page></login-page>`}`;
  }
}
```

**Migration notes for the 85 files:**
- One `StoreController` per distinct selector (mirrors one `useSelector` each) — the codebase
  already writes narrow selectors, so this is a 1:1 rename.
- `dispatch(x() as any)` thunks work unchanged — RTK's default middleware includes thunk, and
  the store keeps `redux-thunk`.
- No `Provider` wrapper; elements import the controller. This is the bulk of the work but it
  is **mechanical and independently testable** per element.
- Effort: **L** by volume, **S** per file. Do it component-by-component *inside* the report-02
  MUI→Lit conversion so a view is de-React-ed and de-react-redux-ed in one pass.

---

## 4. Forms — replace Formik

Formik is used only via `useFormik` (8 files) + `FormikProps` typing (11), always paired with
Yup schemas (already installed). **Recommendation: a tiny `FormController` reactive controller
that wraps native form state + the existing Yup schema.** No new dependency; Yup stays.

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

WebAwesome `<wa-input>`/`<wa-select>` also expose native constraint validation, so for simple
forms the controller can be skipped entirely in favour of `form.reportValidity()` + Yup on
submit. Effort: **M** (19 files, but the schemas already exist and the pattern is uniform).
Fold each form conversion into its report-02 component pass.

---

## 5. Editor — replace `@monaco-editor/react`

Only one consumer: `src/components/forms/FormsContainer.tsx`, which already imports **both**
`@monaco-editor/react` (`<Editor>`) *and* `@monaco-editor/loader` (`loader.init()` for theme
setup). Drop the React wrapper; keep the loader; encapsulate Monaco in one Lit element.

```ts
// src/components/lit-elements/monaco-editor.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import loader from '@monaco-editor/loader';

@customElement('monaco-editor')
export class MonacoEditor extends LitElement {
  static styles = css`:host,.wrap{display:block;height:100%}`;
  @property() value = '';
  @property() language = 'json';
  @property() theme = 'json-light';
  @query('.wrap') private wrap!: HTMLElement;
  private editor?: any;

  async firstUpdated() {
    const monaco = await loader.init();       // reuse existing defineTheme('json-light'/'json-dark') setup here
    this.editor = monaco.editor.create(this.wrap, {
      value: this.value, language: this.language, theme: this.theme, automaticLayout: true,
    });
    this.editor.onDidChangeModelContent(() =>
      this.dispatchEvent(new CustomEvent('editor-change', { detail: this.editor.getValue() })));
  }
  updated(c: Map<string, unknown>) {
    if (c.has('theme') && this.editor) this.editor.updateOptions({ theme: this.theme });
    if (c.has('value')  && this.editor && this.editor.getValue() !== this.value) this.editor.setValue(this.value);
  }
  disconnectedCallback() { super.disconnectedCallback(); this.editor?.dispose(); }
  render() { return html`<div class="wrap"></div>`; }
}
```

The `defineTheme('json-light'/'json-dark')` logic already in `FormsContainer` moves verbatim
into a one-time init. `handleEditorDidMount` behaviour becomes `firstUpdated`/`onDidChange…`.
Note: the `postinstall` step already copies `monaco-editor/min/vs` into `public/` — keep it.
Effort: **M** (self-contained, one element, one call site).

---

## 6. Icons — replace `@mui/icons-material` + `react-icons`

Owned by **report 03**. Both libraries render inline SVG via React; replace with WebAwesome
`<wa-icon name="…">`, which is already loaded (base path set in the entry point via
`setBasePath(...)`). 65 files total (47 + 18). Build a name-mapping table (MUI/react-icons →
WebAwesome icon id) in report 03 and apply during each component's report-02 pass so a view
loses its React icons at the same time it loses its React shell. Effort: tracked in report 03.

---

## 7. Entry point & build

### `src/index.tsx` → `src/index.ts`

Replace `ReactDOM.createRoot(...).render(<Provider><App/></Provider>)` with a custom-element
mount. Everything else (CSS imports, `setBasePath`, theme init) stays.

```ts
// src/index.ts (was index.tsx)
import './index.css';
import './styles/styles.css';
import './styles/dark-mode.css';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import './styles/lit-overrides.css';
import { setBasePath } from '@awesome.me/webawesome/dist/utilities/base-path.js';
import './store/store';       // instantiates the singleton store
import './app-root';          // defines <app-root> (was App.tsx)

setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/webawesome.loader.js');
// no createRoot, no <Provider> — the store is a module singleton (§3)
```

### `index.html`

Swap the mount node/script and keep the pre-render theme script:

```html
<!-- was: <div id="root"></div><script type="module" src="/src/index.tsx"></script> -->
<app-root></app-root>
<script type="module" src="/src/index.ts"></script>
```

Optionally wrap the shell in WebAwesome's `<wa-page>` layout element for the app chrome
(sidebar/header) — see report 02 for the shell layout.

### `vite.config.mts`

Remove the React SWC plugin; keep Linaria/wyw:

```ts
import { defineConfig } from 'vite';
import wyw from '@wyw-in-js/vite';
// deleted: import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  plugins: [ wyw({ include: ['**/*.{ts,tsx}'] }) ],   // narrow to '**/*.ts' once no .tsx remain
  build: { assetsDir: 'admin/assets' },
  server: { /* CSP + proxy unchanged */ },
});
```

CSP note: the current `style-src-elem` allows WebAwesome CDN + `'unsafe-hashes'` for the emotion/MUI
injected `<style>` hashes. Once MUI/emotion are gone, the runtime style injection they caused
disappears; revisit and tighten `style-src` after report 02.

### `tsconfig.json`

`"jsx": "react-jsx"` is no longer needed once `.tsx` files become `.ts` authoring Lit
`html`\`…\` templates. Set `jsx` to unused (remove it) and rely on `experimentalDecorators`
(already `true`) for Lit `@customElement`/`@property`. Delete `src/react-app-env.d.ts`. The
existing `experimentalDecorators: true` + `useDefineForClassFields` posture already suits Lit.

`.tsx` → `.ts`: each converted file is renamed (no JSX left). This happens file-by-file during
report 02; the last rename removes the final React import.

---

## 8. Tests, lint

- **Tests (4 files):** replace `@testing-library/react` `render()` with `@open-wc/testing`'s
  `fixture(html\`<el></el>\`)` (or `@testing-library/dom`). Keep `@testing-library/jest-dom`
  matchers and `jsdom`. Remove the `jsc.transform.react` block from `jest.config.ts`. Small
  surface (**S**) because only 4 test files exist.
- **Lint:** the `react-app` / `react-app/jest` presets (declared inline in `package.json`
  `eslintConfig`) pull in React rules. Replace with a flat ESLint config using
  `@typescript-eslint` + `eslint-plugin-lit` + `eslint-plugin-wc`. Update the `lint` script
  (`--ext ts,tsx` → `--ext ts`) once `.tsx` are gone.

---

## 9. Sequencing, gates & risk

React (`react` + `react-dom`) can only be dropped when **the last `.tsx`, the last
`react-redux` hook, the last `<Route>`, and the last Formik/Monaco-React import are gone.**
Sequence so that each phase leaves the app shippable (React and Lit coexist throughout via the
existing `@lit/react` bridge until the very end).

| Phase | Work | Gate to exit | Effort |
|---|---|---|---|
| **P0 — Foundations** | Add `store/store.ts` singleton + `StoreController`, `FormController`, `<monaco-editor>` element, custom router (§2/§10). No view changes yet. | New primitives unit-tested; app still boots on React. | **M** |
| **P1 — Routing** | Replace `react-router-dom` with the chosen router (§10). Convert `App.tsx`/`Views.tsx`/`SettingsPage.tsx` route hosts and the 14 `useNavigate`/14 `useLocation`/4 `useParams` sites to the router API. | `grep react-router-dom src` → empty; navigation works end-to-end. | **M** |
| **P2 — Leaf components** | Per report 02, convert leaf views bottom-up: MUI→Lit/WebAwesome (02) **+** icons (03) **+** react-redux→StoreController (§3) **+** Formik→FormController (§4) in one pass per file. Rename `.tsx`→`.ts`. | Each converted subtree renders with no React import. | **L** (bulk) |
| **P3 — Editor & hard widgets** | `FormsContainer` Monaco swap (§5); DataGrid (5), date-pickers (2), tree-view (2) replacements (report 02). | Data-heavy views (schema/apps/people) work on Lit. | **Hard** |
| **P4 — Shell & entry** | Convert `App.tsx`→`<app-root>`, `index.tsx`→`index.ts`, `index.html` mount, delete `LitElements.tsx` bridge (use custom elements directly), drop `@lit/react`. | App boots with no `ReactDOM`; `Provider` gone. | **M** |
| **P5 — Purge** | Remove React SWC plugin, React types, `react-app` eslint, jest React transform; remove 16 runtime + 4 dev deps; convert tests off `@testing-library/react`; tighten CSP/tsconfig. | Definition of Done (§11) fully green. | **M** |

### Hard gates (must be true before proceeding)
- **G1 (exit P1):** no `react-router-dom` import anywhere; all deep links + `basename
  '/admin/ui'` behaviour preserved.
- **G2 (per P2 file):** the file has **no** `from 'react'`, `react-redux`, or `formik` import
  and is renamed `.ts`.
- **G3 (exit P4):** `grep -rn "react-dom" src` empty; `Provider`/`createRoot` gone.
- **G4 (exit P5):** `package.json` has no `react`, `@mui/*`, `react-*`, `@emotion/*`, `formik`,
  `@lit/react`, `@monaco-editor/react`.

### Riskiest items (watch list)
1. **`@mui/x-data-grid` (5 files)** — richest widget (sort/filter/paginate/selection). No
   drop-in WebAwesome equivalent; owned by report 02, likely a custom Lit table. **Highest
   risk; schedule early in P3 to de-risk.**
2. **~85 `react-redux` files / 344 hook sites** — low complexity, high volume. Risk is churn
   and merge conflicts, not difficulty. Mitigate by doing it inside the P2 per-file pass and
   keeping PRs small.
3. **Routing** — nested routes across 3 hosts + `PrivateRoutes` guard + `basename`. A subtle
   base-path or guard regression breaks deep links. Add route smoke tests before P1 exit.
4. **`x-date-pickers` / `x-tree-view`** — fewer files but bespoke UX (a Lit source tree
   already exists to reuse for the tree case).
5. **CSP** — MUI/emotion runtime `<style>` injection currently forces `'unsafe-hashes'` in
   `style-src-elem`; verify Linaria's build-time CSS + WebAwesome cover all styling before
   tightening.

### Rollback strategy
- React and Lit **coexist** through P0–P4 via the existing `@lit/react` bridge, so every phase
  ships independently and is revertable by reverting its PRs — no long-lived mega-branch.
- Keep phases behind small PRs gated on `build` + `test` + the phase gate grep. If a converted
  view regresses, revert that single file's PR; the bridge means the React version still works.
- Do **not** remove any dependency (P5) until its last importer is gone (enforced by the DoD
  greps), so a partial migration can never produce a broken `npm install`.
- **Point of no return:** deleting `LitElements.tsx` / dropping `@lit/react` (P4). Land it only
  after G2 holds for 100% of files.

### Overall effort
**L (multi-month).** Dominated by P2 volume (135 `.tsx`, 85 react-redux files) and the P3 hard
widgets. The plumbing this report owns (entry point, router, StoreController, FormController,
Monaco wrapper) is **M** and front-loaded in P0/P1; it unblocks the parallelizable P2 grind.

---

## 10. Routing replacement (detail)

Current shape (verified): a `<BrowserRouter basename="/admin/ui">` in `App.tsx` with a
catch-all auth split, nested `<Routes>` in `Views.tsx` (behind a `PrivateRoutes` guard from
`components/routers/ProtectedRoute`), and a third nested `<Routes>` in `SettingsPage.tsx`.
Params used: `:nsfPath`, `:dbName`, `:formName` (4 `useParams` sites).

**Options evaluated:**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Browser **Navigation API** | Native, no dep, modern | Safari/Firefox support still partial (2026); would need a polyfill/fallback | Not yet safe as sole router |
| **`@lit-labs/router`** | Lit-native `Routes` controller, nested routes, URL pattern params | Labs (pre-1.0) API churn; adds a dep | Viable; good if the team wants batteries-included |
| **Small custom router** (History API + `URLPattern`) | ~100 LOC, zero deps, full control over `basename`, guard, and lazy loading; matches the app's modest ~10 routes | Must hand-write matching + a `<route-outlet>` | **Recommended** |

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
| `PrivateRoutes` guard | `RouteDef.guard = () => store.getState().account.authenticated` |
| `basename="/admin/ui"` | `router.base` (prefix on navigate + strip on match) |

Route inventory to port (from `App.tsx` / `Views.tsx` / `SettingsPage.tsx`): `/`, `/schema`,
`/schema/:nsfPath/:dbName`, `/schema/:nsfPath/:dbName/:formName/access`, `/scope`, `/apps`,
`/apps/consents`, `/groups`, `/people`, `/mail`, `/settings` (+ `/settings/account|roles|mail|logs`),
`/callback`.

---

## 11. Definition of Done

All must hold on the new stack:

```bash
grep -rn "from 'react'"        src   # → (empty)
grep -rn "react-dom"           src   # → (empty)
grep -rn "react-redux"         src   # → (empty)
grep -rn "react-router-dom"    src   # → (empty)
grep -rn "from 'formik'"       src   # → (empty)
grep -rn "@mui/"               src   # → (empty)
grep -rn "@lit/react"          src   # → (empty)
grep -rn "@monaco-editor/react" src  # → (empty)
find src -name '*.tsx'               # → (empty; all authoring files are .ts)
```

- `package.json` `dependencies` contains **no** `react`, `react-dom`, `react-redux`,
  `react-router-dom`, `@lit/react`, `@monaco-editor/react`, `react-icons`, `@mui/*`,
  `@emotion/*`, `formik`; `devDependencies` contains no `@vitejs/plugin-react-swc`,
  `@types/react*`, `@testing-library/react`; `eslintConfig` no longer extends `react-app`.
- `vite.config.mts` has no `@vitejs/plugin-react-swc`; `jest.config.ts` has no React transform;
  `tsconfig.json` no longer sets `"jsx": "react-jsx"`.
- `npm run build` (tsc -b + vite build) and `npm test` are green.
- App boots from `<app-root>` with the Redux store as a module singleton, routing/deep-links,
  forms, and the Monaco editor all functional — verified in a browser smoke test.
