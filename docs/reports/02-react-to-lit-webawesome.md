# Report 02 — React → Lit / WebAwesome Migration

**Scope:** Map every React component under `src/components/**` (plus top-level `App.tsx`, `Views.tsx`, `Footer.tsx`) to a migration target: an existing hand-written `keep-*` component, a real WebAwesome `wa-*` component, a **new** Lit component to author, or **KEEP** (leave on React/MUI for now).

> **Refreshed 2026-07-27** against branch `new_code` @ `e17010c`. Previously refreshed
> 2026-07-27 against `7594672`; originally written 2026-07-24, when the Lit layer was
> 27 untyped `.js` files under `lit-elements/`.
>
> **Phase 0 (Foundation) is essentially COMPLETE.** All elements are TypeScript with
> decorators on a shared base class, renamed `lit-*` → `keep-*`, each with a unit test.
> One Phase-0 item — collapsing the four button components — is **not** done.
>
> **The first real screen conversion landed (PR #669).** The Source tab of
> `FormsContainer.tsx` now renders `keep-monaco-editor` through the `@lit/react` bridge
> instead of `@monaco-editor/react`, gained a **Diff view**, moved its icons onto a
> self-hosted Font Awesome library, and pushed theme switching into
> `src/services/theme-service.ts`. §5.3 is now a *done* section with a short tail.
>
> **Two mapping corrections** (unchanged, re-verified against the installed
> `@awesome.me/webawesome@3.10.0`):
> - ✅ **`<wa-page>` is FREE**, not Pro — `dist/components/page/` ships in the npm
>   package. Report 03's biggest go/no-go gate is resolved.
> - 🔴 **There is no WebAwesome data grid or date picker in _any_ tier.** "Buy WA Pro
>   Data Grid" was never a real option; §5.1 is corrected below.
>
> **One standing claim retracted:** §2.1 used to say `src/index.tsx` "sets the asset base
> path". The two `setBasePath()` calls were **deleted** in PR #673 and must not come back
> — in WebAwesome 3.x the base path feeds only the autoloader, which this app never uses.
> See §2.1.

**Companion reports (cross-reference):**
- `reports/03-wa-page-and-design-tokens.md` — layout primitives → `wa-*` CSS utilities, theming, design tokens, dark mode, CSP. All "layout only" and "token/theme" concerns are deferred there.
- `reports/04-remove-react.md` — final sequencing of the React removal. This report keeps the component-level detail; report 04 owns end-state ordering and the Redux-removal plan.

**WebAwesome version:** `@awesome.me/webawesome@^3.10.0` (3.10.0 installed). Every `wa-*` name below was re-verified against `node_modules/@awesome.me/webawesome/dist/components/` and the Pro list in the bundled skill's `references/choosing-components.md`.

---

## 0. What changed since 2026-07-24

### 0.1 New this refresh (`7594672` → `e17010c`, PRs #667–#673)

| §  | Item | Status | Where |
|----|------|:---:|---|
| §5.3 | Wire `keep-monaco-editor` into the Source tab | ✅ **DONE** — `FormsContainer.tsx` imports `KeepMonacoEditor` from `KeepElements` and renders it at line 658; **`@monaco-editor/react` has zero imports left in `src`** | PR #669 |
| §5.3 | **Diff view** (new capability, not in the old plan) | ✅ **DONE** — third option in the view dropdown after Tree/Text. `keep-source-header.ts` exports `TEXTUAL_VIEWS`/`isTextualView()`; Text and Diff share one Monaco buffer, so switching preserves edits. `keep-monaco-editor` gained `diffMode`/`originalValue` and a `createDiffEditor` path | PR #669 |
| §5.3 | Test `keep-monaco-editor` | ✅ **DONE** — two suites, deliberately: `keep-monaco-editor.test.ts` drives a **fake** `monaco-editor` (component behaviour), while `.lifecycle.test.ts` runs **real** Monaco under jsdom via `test/test-utils/monaco.ts` (library invariants a fake cannot reach — it caught a dispose-ordering bug the fake suite passed through). `document.queryCommandSupported` polyfilled in `test/setupTests.ts`. See report 01 §A10 | PRs #668, #673 |
| §5.3 | Move `prettier` to `dependencies` | ✅ **DONE** — and its three modules are now **dynamically** `import()`ed, splitting `babel` 316.53 kB / `estree` 210.43 kB / `standalone` 81.05 kB out of the entry chunk | PR #673 |
| §5.3 | Make the **Monaco** import dynamic | 🔴 **NOT DONE** — `keep-monaco-editor.ts:11` is still a top-level `import * as monaco from 'monaco-editor'`. Entry chunk is **6,322.51 kB / 1,703.85 kB gzip**; the drop from 6.94 MB was prettier, not Monaco | — |
| §5.5 | Icons off absolute asset paths | 🟡 **STARTED** — `src/services/icon-library.ts` registers a **self-hosted Font Awesome** library as `library="fa"` (11 glyphs bundled from `@fortawesome/fontawesome-free@7.3.1` via `?url`), replacing `<wa-icon src="${IMG_DIR}/…">` in the source-editor chrome. **38 `IMG_DIR` references and 9 `<wa-icon src=…>` occurrences remain elsewhere** — see §5.5 | PR #669 |
| §6.5 | Centralise the theme carriers | 🟡 **PARTIAL** — `src/services/theme-service.ts` is now the single writer for the three DOM carriers of appearance: `wa-dark` on `<html>`, `<html>.style.colorScheme`, and `body.dataset.theme`. This is *plumbing*, not tokens — the per-component hardcoded colors are untouched | PR #669 |
| §2.1 | `setBasePath()` | ✅ **REMOVED** — both calls deleted. In WebAwesome 3.x the base path feeds exactly one consumer (the autoloader); this app imports its **18 distinct** WA components explicitly, so the value was never read. The old call also pointed at a *file* under `webawesome@3.6.0`, a version no longer installed. `src/index.tsx:18-27` documents why it must not return | PR #673 |

### 0.2 Carried forward from the previous refresh

| §  | Item | Status | Where |
|----|------|:---:|---|
| §6.1 | Author elements in TypeScript with `lit` decorators | ✅ **DONE** — all 26 elements, `@customElement`/`@property`/`@state`/`@query` | PRs #652–#659 |
| §6.7 | Shared base class | ✅ **DONE** — `KeepElement` (`keep-element.ts`) with a typed, composed `emit()` | `88a47bd` |
| §6.4 | Consistent event contract | ✅ **DONE** — `emit()` dispatches `bubbles: true, composed: true`; `KeepElements.tsx` maps `events` for `KeepCheckbox` and `KeepMonacoEditor` | `88a47bd` |
| §6.3 | Single global `webawesome.css` import | ✅ **DONE** — exactly one import, in `src/index.tsx`; components import only the `wa-*` element modules they render | PRs #652–#659 |
| §6.6 | Predictable registration | ✅ **DONE** — one file per tag, self-registering via `@customElement`; 25 of the 26 re-exported through `KeepElements.tsx` (`keep-schema-status` is internal by design) |  |
| §6.x | Naming | ✅ **DONE** — `lit-elements/` → `keep-elements/`, `lit-*` → `keep-*`, `LitElements.tsx` → `KeepElements.tsx`, `lit-overrides.css` → `keep-overrides.css` | `8ea711b`, PR #666 |
| — | Test coverage for the element layer | ✅ **DONE** — 28 suites under `test/components/keep-elements/` (26 elements + the base class + a Monaco lifecycle suite), `test/test-utils/lit.ts` (`mountLit`/`cleanupLit`); shadow-DOM assertions work. The directory now sits at **84.2 % line coverage** | report 01 §B2 |
| §6.2 | Collapse `lit-button*` into one component | 🔴 **NOT DONE** — `keep-button` (wraps `wa-button`) still coexists with `keep-button-yes`/`-no`/`-neutral`, which are plain `<button>`s with hardcoded hex | — |
| §6.5 | Move ad-hoc dark-mode overrides to a token layer | 🔴 **NOT DONE** — e.g. `keep-button.ts` still carries a `#f4e9ff` `::part` override; `keep-source*.ts` use `light-dark(#1e1e2e, …)` literals | report 03 |
| §7 P0 | Decide the DataGrid + date-picker strategy | 🔴 **NOT DONE** — and the option set has changed (§5.1, §5.2) | — |
| — | `copyable-text.js` | ✅ **REMOVED** as dead code (`f14aff6`); `wa-copy-button` is the path if copy UX returns | — |
| — | `home/About.tsx` | ✅ **REMOVED** (`757e657`) — drop from the inventory | — |
| — | `src/custom-elements.d.ts` | ✅ **REMOVED** — stale JSX intrinsic tags (`app-status`, `drawer-container`) dropped; typing now comes from each element's `HTMLElementTagNameMap` augmentation | `88a47bd`, `8ea711b` |

**Net progress on the component migration itself: one screen, and it was the hard one.**
The Source tab is the first React surface to be handed to a `keep-*` element that owns
real behaviour rather than presentation, and it proved the bridge end-to-end: props in,
`change` events out, theme observed from the DOM, a new feature (Diff) built in Lit rather
than React. Everything else is unchanged — 68 `.tsx` files still import `@mui/material`.
The previous refresh bought *foundation quality*; this one bought *proof*. Phases 1–3 are
still the right next move.

---

## 1. Executive summary

- **130 React `.tsx` files**; **68** import `@mui/material`, **44** import
  `@mui/icons-material`, **18** use `react-icons`, **19** use Formik, **77** touch
  `react-redux`. Counted across all of `src`, MUI is imported in **82 files**:
  **175** `@mui/material` references, **99** `@mui/icons-material`, **5** `@mui/x-data-grid`.
- **26 TypeScript Lit elements** in `src/components/keep-elements/`, on a shared
  `KeepElement` base, of which **25** are wrapped for React via `@lit/react`'s
  `createComponent` in `KeepElements.tsx`. Most wrap a `wa-*` element internally. Every
  one has a unit test. (The 26th, `keep-schema-status`, is deliberately internal —
  `keep-nsf-card` renders it inside its own template, so no React wrapper is needed.)
- **Raw `wa-*` tags live almost entirely inside the Lit layer, not in React.** Across
  `src` there are **17 files** with raw `wa-*` markup, and exactly **one is a `.tsx`**
  (`scopes/ScopeLists.tsx`, a `<wa-drawer>`). Everything else is inside `keep-*` element
  templates, which is where it belongs. Counts: 28 `<wa-icon>`, 8 `<wa-button>`,
  7 `<wa-input>`, 5 `<wa-option>`, 5 `<wa-dropdown-item>`, 2 each of `wa-switch`,
  `wa-dropdown`, `wa-drawer`, `wa-checkbox`, `wa-card`, `wa-callout`, and 1 each of
  `wa-tree`, `wa-tree-item`, `wa-tooltip`, `wa-select`, `wa-details`. In total the app
  imports **18 distinct** WebAwesome components.

  > **Correction:** the previous revision reported these as "raw `wa-*` usage in React …
  > 26 files total". Both halves were wrong — it is 17 files, and it is not React.

- **The bulk of the UI still maps cleanly to free WebAwesome components** (buttons,
  inputs, checkbox, switch, select, dialog, drawer, tabs, tooltip, card, dropdown/menu,
  alert→callout, spinner, breadcrumb, tree, divider, avatar, badge, radio, textarea,
  **page**).
- **The hard cases narrowed, and one is now closed.** `<wa-page>` is free (removing
  report 03's licensing gate), but **WebAwesome ships no data grid and no date picker at
  any tier** — so those two are custom-or-third-party, full stop. **Monaco is done**: the
  element is authored, tested, wired into the Source tab, and has already grown a feature
  (Diff) that the React wrapper never had. Formik (19 files) is unchanged: a state
  library, not a widget.
- **Consistency debt is mostly paid.** What remains: the four-way button duplication, the
  per-component hardcoded colors, and the 38 `IMG_DIR` icon paths — all cheap, and all of
  which block report 03's token work.

---

## 2. Interop & state during migration (the bridge in use today)

### 2.1 `@lit/react` wrapper pattern

`src/components/keep-elements/KeepElements.tsx` is the single interop surface — the only
file in `src/` that imports `@lit/react`. It imports each Lit class and calls
`createComponent({ tagName, elementClass, react: React })`, exporting a PascalCase React
component (`KeepButton`, `KeepCheckbox`, `KeepDrawer`, …).

Key facts as built today:

- **Props → properties:** `createComponent` forwards React props onto the custom element.
  Element classes declare typed reactive properties via `@property({ type: … })`.
  The Source tab is the worked example: `<KeepMonacoEditor language="json"
  value={sourceTabContent} diffMode={selectedOption === 'diff'}
  originalValue={savedSchemaText} />` — three of those are properties the element reacts
  to in `updated()`.
- **Events → React callbacks:** `KeepCheckbox` maps `{ onChange: 'change' }`, and
  `KeepMonacoEditor` does the same. All other elements rely on the `KeepElement.emit()`
  contract plus plain DOM listeners — **2 of the 25 wrappers declare an `events` map**.
  Adding one per emitting element is the remaining polish.
- **Refs work.** `FormsContainer` holds `litsourceRef`/`editorRef` and calls imperative
  methods on the elements. That is the escape hatch that made the Source tab conversion
  possible without rewriting its save/cancel flow.
- **Registration:** each file self-registers via `@customElement('keep-…')` as an import
  side effect. `src/index.tsx` imports `webawesome.css` once; the 18 WA components in use
  are imported explicitly by whichever file renders them.

  > 🚫 **Do not call `setBasePath()`.** Both calls were removed in PR #673 and the
  > reasoning is pinned in a comment at `src/index.tsx:18-27`, guarded by
  > `test/services/icon-library.test.ts`. In WebAwesome 3.x the base path has exactly one
  > consumer — the **autoloader**, which lazily `import()`s `components/<tag>/<tag>.js`
  > from it. This app never autoloads, so the value was never read; the call was inert and
  > therefore never failed loudly, even though it pointed at a *file* (not a directory)
  > under a `webawesome@3.6.0` path that is no longer installed. Icons are a separate
  > setting (`setIconPath()`/kit code) and are now served from
  > `src/services/icon-library.ts` regardless.

- **Typing:** each element file augments `HTMLElementTagNameMap`, so `document.querySelector`
  and `document.createElement` are typed. The old `any`-typed `src/custom-elements.d.ts`
  is gone.
- **Shared helpers cross the bridge too.** `FormsContainer.tsx` imports `isTextualView`
  from `keep-source-header.ts` — the view-mode predicate is defined once, next to the
  element that owns the dropdown, and React consumes it. Prefer this over duplicating
  view logic on the React side.

> ⚠️ **Tag/file naming inversion to fix.** `keep-source.ts` registers the tag
> **`keep-source-tree`**, while `keep-source-header.ts` registers **`keep-source`**.
> The inversion is inherited from the `.js` originals and is documented in a docstring,
> but it will trip anyone grepping by tag. Rename in a standalone commit.

### 2.2 The shared base class

```ts
// src/components/keep-elements/keep-element.ts
export class KeepElement extends LitElement {
  protected emit<T>(type: string, detail?: T, options?: EventInit): CustomEvent<T> {
    const event = new CustomEvent<T>(type, {
      bubbles: true, composed: true, cancelable: false, ...options, detail: detail as T,
    });
    this.dispatchEvent(event);
    return event;
  }
}
```

Intentionally thin. Its second job — a home for shared theme/token wiring so the
per-component dark-mode overrides can be consolidated — is **still not used**. That is the
hook report 03's token work should land on. Note that PR #669 solved a *different* theme
problem (how appearance reaches the DOM, §2.5); the per-component color literals are
untouched.

### 2.3 How Lit components receive Redux state

Unchanged and still correct: Redux state is read in **React containers** and passed
**down as properties**; web components dispatch back via `CustomEvent`s. The elements are
Redux-agnostic — none imports the store. Keep enforcing this: it is what makes report 04's
`StoreController` swap mechanical rather than a rewrite.

### 2.4 Remaining bridge polish

1. Add an explicit `events` map in `KeepElements.tsx` for every element that emits, so
   React consumers get typed `on*` callbacks instead of manual `addEventListener`.
   Currently **2 of 25** wrappers have one (`KeepCheckbox`, `KeepMonacoEditor`).
2. Finish standardising outbound events on `emit()` — `keep-drawer` still takes a
   `closeFn` **property** (`keep-drawer.ts:39`, consumed by
   `database/ScopeFormContainer.tsx:192`) rather than emitting.
3. Fix the `keep-source` / `keep-source-tree` tag inversion (§2.1). Still open, and now
   marginally more confusing: `keep-source-header.ts` has grown into the view-switcher
   *and* the exporter of `isTextualView()`, so it is no longer plausibly "just a header".

### 2.5 How appearance reaches the DOM (new — `services/theme-service.ts`)

A dark-mode toggle has to write **three** independent DOM carriers or the page ends up
half-dark. PR #669 made `src/services/theme-service.ts` the single writer for all three:

| Carrier | Read by |
|---|---|
| `wa-dark` class on `<html>` | every WebAwesome component; also `keep-monaco-editor`, which derives its Monaco theme by observing `<html>`'s `class` attribute |
| `<html>.style.colorScheme` | native form controls, scrollbars, and every `light-dark()` literal in the `keep-*` styles |
| `body.dataset.theme` | the app's own `:host-context(body[data-theme="dark"])` rules |

`applyAppearance()` is idempotent by design, because `keep-monaco-editor`'s
`MutationObserver` fires on every attribute *write*, not only on real changes. The boot
script in `index.html` applies the same three from `localStorage` before React mounts to
avoid a flash; the service keeps them correct for every in-session toggle.

**Consequence for the migration:** any new Lit element that needs to know the theme should
observe `<html>.wa-dark` (or read a `--wa-*` token), never React state. That is what makes
elements usable outside the React tree, and it is a precondition for report 04.

---

## 3. MUI → WebAwesome mapping table

Legend: **Free** = ships in the npm package · **Pro** = requires a Web Awesome Pro license
· **None** = no WebAwesome component exists in any tier · **Custom** = author a Lit
component · **CSS/util** = layout/util, handled in report 03.

Verified against `@awesome.me/webawesome@3.10.0` by listing
`node_modules/@awesome.me/webawesome/dist/components/`. The Pro set — present in the docs,
absent from the npm dist — is exactly: `wa-combobox`, `wa-file-input`,
`wa-toast`/`wa-toast-item`, `wa-sparkline`, the chart family, and the video family.
`page/` **is** in the dist, so `<wa-page>` is free. Nothing matching `date`, `calendar`,
`grid` or `table` is in the dist under any name (only the `format-date`/`known-date`
formatting helpers), which is the evidence behind §5.1 and §5.2.

| MUI (and where) | Target | Tier | Notes |
|---|---|---|---|
| `Button`, `IconButton`, `ButtonBase`, `Link`(as action) | `wa-button` (icon-only = `wa-icon` in `start` slot) | Free | Already wrapped as `keep-button`. `appearance` = accent/outlined/filled; `variant` = brand/neutral/success/danger. |
| `TextField` (text) | `wa-input` | Free | Wrapped as `keep-input-text`. |
| `TextField` (`multiline`) | `wa-textarea` | Free | ✅ confirmed present in 3.10. No `keep-*` wrapper yet — author one. |
| `TextField` (`type=number`) | `wa-number-input` | Free | Stepper built-in. |
| password field / `Visibility` toggle | `wa-input type="password" password-toggle` | Free | Wrapped as `keep-input-password` (custom toggle today; can use the built-in). |
| `Checkbox` | `wa-checkbox` | Free | Wrapped as `keep-checkbox` (one of the two wrappers with an `events` map). |
| `Switch` | `wa-switch` | Free | Wrapped as `keep-switch`. |
| `Select` + `MenuItem` | `wa-select` + `wa-option` | Free | Wrapped-ish via `keep-dropdown`. |
| `Autocomplete` (in `DropdownFormulaEngine`) | `wa-combobox` | **Pro** | Free fallback = existing custom `keep-autocomplete`. **Still Pro at 3.10.** |
| `Menu` + `MenuItem` (action menu) | `wa-dropdown` + `wa-dropdown-item` | Free | Wrapped as `keep-dropdown`. Used in `ActivateMenu`, `QuickConfigForm`, `ScopeForm`, `DetailsSection`, `IconDropdown`, `CardViewOptions`. |
| `Dialog` | `wa-dialog` | Free | Split into `keep-dialog-header/content/actions` + `keep-api-error-dialog`. |
| `Drawer` (in `ConsentFilterContainer`) | `wa-drawer` | Free | Wrapped as `keep-drawer`. |
| `Tabs` + `Tab` | `wa-tab-group` + `wa-tab` + `wa-tab-panel` | Free | Used in `FormsContainer`, `FieldDndContainer`. No `keep-*` wrapper yet. |
| `Tooltip` | `wa-tooltip` | Free | Wrapped as `keep-tooltip`. |
| `Card`/`CardContent`/`CardActionArea`/`CardMedia` | `wa-card` (header/footer/media slots) | Free | Existing `keep-default-card`, `keep-nsf-card`, `SlimDatabaseCard`, `home/sections/Tip`. |
| `Alert` + `AlertTitle` | `wa-callout` | Free | Wrapped as `keep-alert`. |
| `Snackbar` (+ `Slide`) / toaster | `wa-toast` / `wa-toast-item` | **Pro** | Free fallback = keep the existing React toaster or author a Lit toaster. **Still Pro at 3.10.** |
| `CircularProgress` | `wa-spinner` | Free | `DeleteDialog`, `DetailsSection`, `FormsContainer`. |
| `LinearProgress` (loading) | `wa-progress-bar` | Free | `APILoadingProgress`, loaders. |
| `Breadcrumbs` | `wa-breadcrumb` + `wa-breadcrumb-item` | Free | `BreadcrumbRouter`. |
| `Divider` | `wa-divider` | Free | `SideNav`, `DatabaseSearch`, `ListRoles`. |
| `Avatar` | `wa-avatar` | Free | `ListRoles`. |
| `Radio` + `RadioGroup` | `wa-radio` + `wa-radio-group` | Free | Access-mode forms. |
| `Accordion` / `Collapse`+`ExpandMore` disclosure | `wa-details`, or **`wa-accordion` + `wa-accordion-item`** for grouped/exclusive disclosure | Free | `wa-accordion` is **new since 3.6** — a better fit than hand-grouping `wa-details` in `ConsentItem`/`DetailsSection`. |
| `Popper` / `Popover` | `wa-popover` or `wa-popup` | Free | `ProfileMenu`, `ProfileMenuDialog`. |
| `TreeView` / `TreeItem` (`@mui/x-tree-view`) | `wa-tree` + `wa-tree-item` | Free | Good free fit for `FileContentsTree`, `SchemaContentsTree`. Already used raw in 1 file. |
| `SvgIcon` + `@mui/icons-material` + `react-icons` | `wa-icon library="fa"` | Free | 44 + 18 files. **The approach is now settled:** `src/services/icon-library.ts` registers a self-hosted Font Awesome library (11 glyphs bundled from `@fortawesome/fontawesome-free@7.3.1` via `?url`). Use `<wa-icon library="fa" name="…">` and add the glyph to `ICONS`. See §5.5 and report 03 §6.4. |
| **legacy** `<wa-icon src="${IMG_DIR}/…">` | `wa-icon library="fa"` | Free | 🔴 **38 `IMG_DIR` references across 17 files; 9 `<wa-icon src=…>` occurrences.** These hardcode `/admin/img/...`, so they only resolve when the app is mounted at `/admin/` — elsewhere the request falls through to `index.html` and the icon renders empty *silently*. §5.5. |
| `Box`/`Grid`/`Stack`/`Paper`/`Container` | `wa-grid`/`wa-cluster`/`wa-stack`/`wa-flank` + plain `div` | CSS/util | **Deferred to report 03.** `Box` appears 148×. |
| `CssBaseline` / `ThemeProvider` / `@mui/material/styles` | `webawesome.css` + WA theme tokens | CSS/util | **Deferred to report 03.** |
| `useMediaQuery` | native `matchMedia` | n/a | Behaviour, not markup. |
| `Table` family | **Custom Lit table** (semantic `<table>` styled with WA tokens) | **None** | No WA data table in any tier. `AppsTable`, `ConsentsTable`, `AgentsTable`, `FormsTable`, `ViewsTable`, `ColumnDetails`. |
| `List` family | **Custom Lit list** (`wa-stack` + slots) | **None** | Nav lists: `SideNav`, `MobileSidebar`, `OptionList`, `ListRoles`. |
| `ClickAwayListener`/`Fade`/`Slide`/`Collapse` | built-in WA dismissal + `wa-animation`/CSS | Free/CSS | Dropdown/popover handle outside-click & transitions natively. |
| `InputAdornment` | `wa-input` `start`/`end` slots | Free | Search fields, password toggles. |
| `DatePicker`/`LocalizationProvider` (`@mui/x-date-pickers`) | **No WA equivalent, any tier** | **None** | See §5.2. `AppFilterContainer`, `ConsentFilterContainer`. (`wa-time-input` exists — time only.) |
| `DataGrid` (`@mui/x-data-grid`) | **No WA equivalent, any tier** | **None** | See §5.1 — biggest risk. |
| Monaco `Editor` (`@monaco-editor/react`) | **`keep-monaco-editor`** ✅ authored **and wired** | Custom | See §5.3. `@monaco-editor/react` has **zero imports left in `src`**; the package is now a dead dependency. |
| Formik (`formik`) | **Not a widget** — form-state strategy | Custom | See §5.4. 19 files. |

### 3.1 Newly available since 3.6 (worth a look)

`wa-accordion` / `wa-accordion-item` · `wa-textarea` · `wa-time-input` · `wa-markdown` ·
`wa-scroller` · `wa-split-panel` · `wa-skeleton` (loading placeholders — a nicer answer
than the `shimmerGradient` in `getTheme()`) · `wa-tag` · `wa-slider` · `wa-color-picker` ·
`wa-comparison` · `wa-zoomable-frame` · `wa-copy-button` · **`wa-page`** (see report 03).

---

## 4. Component inventory (by domain)

Target key: **[wa]** = replace with a `wa-*` (§3) · **[keep]** = an existing `keep-*` wrapper already fits · **[new-lit]** = author a new Lit component · **[stay]** = stay on React/MUI for this phase (hard case / container-heavy) · **[css]** = mostly layout, see report 03. Effort: **S** ≤ half-day · **M** ~1–2 days · **L** multi-day / risk.

### Top-level
| React file | Target | Effort | Notes |
|---|---|---|---|
| `src/App.tsx` | stay → later [css] | M | Router + `ThemeProvider`/`CssBaseline` + Redux bootstrap. Theming moves to report 03; app shell leaves React last (report 04). |
| `src/Views.tsx` | stay | M | Route composition; React Router. |
| `src/Footer.tsx` | new-lit | S | Presentational — easy early conversion. |

### access/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `AccessContext.tsx` | stay | — | React context/state, not UI. |
| `AccessMode.tsx` | stay→wa | M | `useMediaQuery` + composition. |
| `AddModeDialog.tsx` | keep (`keep-dialog-*`) + `wa-input` | M | Dialog + TextField + Formik. |
| `FieldContainer.tsx` | wa (`wa-input`/`wa-select`) | M | |
| `FieldDndContainer.tsx` | wa (`wa-tab-group`) | L | Drag-and-drop + Tabs; DnD needs a plan. |
| `Fields.tsx` | new-lit (list) + `wa-input` | M | List/ListItem + search. |
| `ModeCompare.tsx` (760 LOC) | wa | M | Search + compare UI. |
| `ScriptEditor.tsx` | wa (`wa-details`) + optional `keep-monaco-editor` | M | ⚠️ **Correction:** this file has **never used Monaco** — it edits formulas in a MUI `TextField` with `Collapse`/`ButtonBase`. Putting `keep-monaco-editor` here is an *enhancement*, not a migration; the mechanical conversion is `Collapse` → `wa-details` and `TextField` → `wa-textarea`. |
| `SingleFieldContainer.tsx` | wa (`wa-button`+`wa-icon`) | S | |
| `TabsAccess.tsx` (1,010 LOC) | wa (`wa-tab-group`) + `wa-button` | L | Formik + tabs + add/delete. **Has a test.** |
| `TestForm.tsx` | wa (`wa-input`/`wa-checkbox`) | M | Formik form. |

### applications/ (+ kanban/)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `Applications.tsx` / `ApplicationContext.tsx` | stay | M / — | Page container / context. |
| `AppForm.tsx` | wa (`wa-input`, `wa-button`, dialog) | L | Formik-heavy. |
| `AppItem.tsx` | keep card + wa | M | Formik. |
| `AppStack.tsx` | css/new-lit | M | Formik + layout. |
| `AppSearch.tsx` | wa (`wa-input` + search icon) | S | |
| `AppsTable.tsx` | new-lit (table) | L | MUI `Table` family + Formik. |
| `AppFilterContainer.tsx` | stay (date picker) | L | `@mui/x-date-pickers` — see §5.2. |
| `ConsentsContainer.tsx` | wa | M | |
| `DeleteApplicationDialog.tsx` | keep (`keep-dialog-*`) | S | Confirm dialog. |
| `FormDrawer.tsx` | keep (`keep-drawer`) | M | Formik + drawer. |
| `kanban/AppCard.tsx` | keep card + `wa-button` | M | |
| `kanban/ConsentItem.tsx` | wa (`wa-details` / `wa-accordion`) | M | |
| `kanban/Consents.tsx` | wa | M | |
| `kanban/ConsentsTable.tsx` | new-lit (table) | L | MUI `Table` family. |
| `kanban/Kanban.tsx` | stay | L | Board layout + Formik + DnD. |

### commons/ (cardviews, dropdowns, wrappers)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `cardviews/CardViewOptions.tsx` | wa (`wa-dropdown`) | S | |
| `cardviews/displays/schemas/*` (views + styles) | keep (`keep-default-card`/`keep-nsf-card`) | M each | Several already import `keep-*` wrappers. |
| `cardviews/displays/scopes/*` | keep cards | M each | Mirror of schemas views. |
| `IconDropdown.tsx` | wa (`wa-dropdown`) | S | |
| `Wrappers.tsx` | css | S | → report 03. |
| `ZeroResultsWrapper.tsx` | new-lit / css | S | Empty state. |

### consents/
| `ConsentFilterContainer.tsx` | stay (date picker) | L | `Drawer` → `wa-drawer` is ready, but `@mui/x-date-pickers` blocks the file — §5.2. |

### database/ (+ settings/, views/)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `AddImportDialog.tsx` | keep dialog + wa | M | Formik + dialog. |
| `DatabaseSearch.tsx` | wa (`wa-input`, `wa-divider`, `wa-dropdown`) | M | |
| `FileContentsTree.tsx` / `SchemaContentsTree.tsx` | wa (`wa-tree`/`wa-tree-item`) | M each | `@mui/x-tree-view` → free `wa-tree`. **Good early win** — only 2 files, free target, `wa-tree-item` already used raw elsewhere. |
| `QuickConfigForm.tsx` | wa (`wa-input`/`wa-select`/`wa-dropdown`) | L | Formik + Menu + Paper. |
| `QuickConfigFormContainer.tsx` / `ScopeFormContainer.tsx` | stay | — | Formik containers. |
| `QuickConfigView.tsx` | wa | M | |
| `ScopeForm.tsx` (462 LOC) | wa (`wa-input`/`wa-select`) | L | Formik + Menu. |
| `settings/sections/Access.tsx` | wa (`wa-switch`) | S | |
| `settings/sections/FormSettings.tsx` | wa | M | |
| `settings/SettingContext.tsx` | stay | — | Context. |
| `views/SlimDatabaseCard.tsx` | keep card | S | `wa-card`. |

### dialogs/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `DeleteDialog.tsx` | keep (`keep-dialog-*`) + `wa-spinner` | S | |
| `DropdownFormulaEngine.tsx` | `keep-autocomplete` (free) or `wa-combobox` (Pro) | M | |
| `FormDialogHeader.tsx` | keep (`keep-dialog-header`) | S | |
| `NetworkErrorDialog.tsx` | keep (`keep-api-error-dialog`) | S | |
| `SnackbarToaster.tsx` | stay or `wa-toast` (Pro) | M | See §3. |
| `UnsavedChangesDialog.tsx` | keep (`keep-dialog-*`) | S | **Has a test.** |

### forms/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `ActivateMenu.tsx` | wa (`wa-dropdown`) | S | |
| `ActivateSwitch.tsx` | keep (`keep-switch`) | S | |
| `AgentSearch.tsx` / `FormSearch.tsx` / `ViewSearch.tsx` | wa (`wa-input`+search) | S each | Three near-identical fields — consolidate into one `keep-search`. |
| `AgentsTable.tsx` / `FormsTable.tsx` / `ViewsTable.tsx` | new-lit (table) | L each | MUI `Table` family. |
| `ColumnBar.tsx` | wa/css | M | |
| `ColumnDetails.tsx` | new-lit (table cell) | M | |
| `DetailsSection.tsx` (690 LOC) | wa (`wa-details`/`wa-dropdown`/`wa-spinner`) | M | |
| `EditView.tsx` (621 LOC) | stay | L | **Has a test.** Complex. |
| `FormsContainer.tsx` (806 LOC) | stay → **Source tab ✅ converted** | L | §5.3 — the Source tab now renders `KeepSource` + `KeepMonacoEditor` (line 658) with a Diff mode. **Remaining here:** the MUI `Tabs`/`Tab`/`TabPanel` shell → `wa-tab-group`, and `CircularProgress` → `wa-spinner`. |
| `TabAgents.tsx` / `TabForms.tsx` / `TabViews.tsx` | wa (`wa-tab-panel` content) | M each | |

### groups/ · people/ · peopleSelector/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `groups/Groups.tsx` · `groups/GroupForm.tsx` | stay (DataGrid) | L each | §5.1. |
| `people/People.tsx` | stay | M | Page. |
| `people/PeopleCRUD.tsx` | stay (DataGrid) | L | DataGrid + Formik. |
| `people/PeopleForm.tsx` | wa (`wa-input`, password toggle) | M | Formik. |
| `peopleSelector/GroupMembers.tsx` · `PeopleSelector.tsx` | stay (DataGrid) | L each | §5.1. |

### header/ · sidenav/ · navigation/ · routers/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `header/Header.tsx` | stay→css | M | `useMediaQuery`; shell. |
| `header/MobileHeader.tsx` | wa (`wa-button`+`wa-icon`) | S | |
| `sidenav/SideNav.tsx` | new-lit (nav list) | L | `List`/`ListItemButton` + theme toggle. Note report 03: `wa-page`'s `navigation` slot removes much of this. |
| `sidenav/MobileSidebar.tsx` | **delete** (subsumed by `wa-page`'s auto-drawer) | M | See report 03 §2.2. |
| `sidenav/OptionList.tsx` | new-lit (list) | S | |
| `sidenav/ProfileMenu.tsx` / `ProfileMenuDialog.tsx` | wa (`wa-popover`/`wa-dropdown`) | M each | Popper + ClickAway. |
| `navigation/NavigationGuardContext.tsx` | stay | — | Context. |
| `routers/*` | stay; `wa-breadcrumb` for the breadcrumb | M | React Router — leaves late (report 04). |

### schemas/ · scopes/ · settings/ · home/ · login/ · misc
| React file | Target | Effort | Notes |
|---|---|---|---|
| `schemas/SchemasLists.tsx` · `scopes/ScopeLists.tsx` | keep cards + wa | M each | |
| `settings/SettingsPage.tsx` | wa/css | M | |
| `settings/SettingTitle.tsx` / `SubSettingTitle.tsx` | new-lit / css | S | Easy early wins. |
| `settings/Logs.tsx` | stay/wa | M | Consider `wa-scroller`. |
| `settings/account/AccountPage.tsx` | wa (`wa-switch`) | M | |
| `settings/mail/MailSettingsPage.tsx` | wa (`wa-switch`, `wa-input`) | M | |
| `settings/roles/ListRoles.tsx` | new-lit (list) + `wa-avatar`/`wa-divider` | M | |
| `settings/roles/RolesPage.tsx` | wa | M | |
| `home/Homepage.tsx` / `HomeElement.tsx` | stay→css | M | Shell + `useMediaQuery`. `HomeElement` drives the app-wide theme switch via `theme-service.applyTheme()` (§2.5). |
| ~~`home/About.tsx`~~ | ✅ **deleted** | — | Removed in `757e657`. |
| `home/sections/Section.tsx` / `Tip.tsx` | keep card (`wa-card`) | S | |
| `login/LoginPage.tsx` (659 LOC) | wa (`wa-input`/`wa-button`) | L | Formik + Grid; entry screen. Its theme toggle already delegates to `theme-service.applyAppearance()` (§2.5) — one less thing to untangle. |
| `login/CallbackPage.tsx` | wa | S | |
| `alerts/Notification.tsx` | stay or `wa-toast` (Pro) | M | Snackbar+Slide. |
| `loaders/PageLoading.tsx` · `loading/APILoadingProgress.tsx` · `loading/GenericLoading.tsx` | wa (`wa-spinner`/`wa-progress-bar`/`wa-skeleton`) | S each | Easy early wins. |
| `mail/Mail.tsx` | wa | S | |
| `wrapper/ErrorWrapper.tsx` | stay | S | Error boundary (React-specific API). |
| `flex/index.tsx` | css | S | → report 03. |

### Existing Lit inventory (26 elements — reference)

`keep-alert` · `keep-api-error-dialog` · `keep-app-status` · `keep-autocomplete` ·
`keep-button` · `keep-button-yes` · `keep-button-no` · `keep-button-neutral` ·
`keep-checkbox` · `keep-default-card` · `keep-dialog-actions` · `keep-dialog-content` ·
`keep-dialog-header` · `keep-drawer` · `keep-dropdown` · `keep-input-password` ·
`keep-input-text` · **`keep-monaco-editor`** · `keep-nsf-card` · `keep-schema-status` ·
`keep-source` *(file: `keep-source-header.ts`)* · `keep-source-tree` *(file: `keep-source.ts`)* ·
`keep-switch` · `keep-textform` · `keep-textform-array` · `keep-tooltip`.

Plus the non-element base class `keep-element.ts` and the bridge `KeepElements.tsx`
(28 files in `src/components/keep-elements/`).

`keep-monaco-editor` (582 LOC) is the newest and by some distance the most capable — it is
the only element that owns an external engine, its own worker bundles, a theme observer and
a second (diff) rendering mode. It is also the only element **consumed by a converted
screen** rather than by another element or a React shell: `FormsContainer.tsx`'s Source tab.

`KeepElements.tsx` exports **25** React wrappers. `keep-schema-status` has none by design —
it is rendered from inside `keep-nsf-card`'s template and never crosses the bridge.

---

## 5. Hard cases — no free WebAwesome equivalent

### 5.1 MUI X **DataGrid** (`@mui/x-data-grid`) — HIGHEST RISK

**Files (5, unchanged):** `groups/Groups.tsx`, `groups/GroupForm.tsx`,
`people/PeopleCRUD.tsx`, `peopleSelector/GroupMembers.tsx`,
`peopleSelector/PeopleSelector.tsx`. Uses `DataGrid`, `GridCellParams`, `GridApi` —
sorting, selection, cell rendering, pagination.

> **Correction (2026-07-27):** the previous revision listed *"(A) Buy WebAwesome Pro Data
> Grid"* as the best-fit option. **That option does not exist.** WebAwesome 3.10 ships no
> data grid in either tier — the Pro set is `wa-combobox`, `wa-file-input`, `wa-toast`,
> `wa-sparkline`, charts, and video. Licensing Pro would buy nothing here. The real
> options are three, not four:

- **(A) Third-party web-component grid** — AG Grid (framework-agnostic build) or RevoGrid
  (native web component). Adds a dependency but keeps things off React and is the only
  option with feature parity out of the box. **Now the leading candidate.**
- **(B) Custom Lit grid** — viable only because these five usages are moderate (selection
  + custom cells + pagination), but grids are notoriously easy to under-estimate. Costed
  honestly this is **L+**.
- **(C) KEEP on MUI DataGrid longest** — pragmatic; these five screens stay React until a
  grid decision lands. **Still the recommended interim**, and the reason `@mui/material`
  will outlive most other MUI usage.

**Risk:** this decision gates the people/groups domain and is now the single largest
blocker to dropping `react`/`react-dom` (report 04). Decide early even though you migrate
it late — and note that (A) and (B) have very different dependency/CSP implications.

### 5.2 MUI X **Date Pickers** (`@mui/x-date-pickers`)

**Files (2, unchanged):** `applications/AppFilterContainer.tsx`,
`consents/ConsentFilterContainer.tsx` (`LocalizationProvider` + `AdapterDayjs`). The
project already depends on `dayjs`.

> **Correction:** WebAwesome has no date picker **in any tier** — not Pro-gated, simply
> absent. (3.10 adds `wa-time-input` and the `known-date`/`format-date` formatting
> helpers, but no calendar/date-picker widget.)

**Recommendation unchanged and now unambiguous: `wa-input type="date"`** (native browser
picker) formatted with `dayjs`. For two filter screens that is sufficient. Effort **M**,
low risk. Reach for a custom Lit date picker only if the native control's UX is rejected.

### 5.3 **Monaco editor** — ✅ SOLVED (element authored, tested, and wired)

**This section is closed as a migration blocker.** `keep-monaco-editor.ts` (582 LOC) is
authored, covered by two test suites, and consumed in production code by the Source tab.

What it does:

- Bundles `monaco-editor` as **ESM** (plus `editor.worker`, `json.worker`, `ts.worker` via
  Vite's `?worker` imports) instead of the AMD loader.
- Theme is generated from live WebAwesome tokens — `src/services/editor-theme.ts`
  (`buildEditorTheme`, `EDITOR_TOKENS`), `wa-color.ts`, `wa-typography.ts` — so the editor
  re-colors with the design system instead of the two hardcoded `json-light`/`json-dark`
  JSON themes. It re-derives on every `class` mutation of `<html>` (§2.5), caching the last
  result so the idempotent writes from `theme-service` cost nothing.
- Formats with `prettier/standalone`, **dynamically imported** so the three prettier
  chunks (babel 316.53 kB, estree 210.43 kB, standalone 81.05 kB) load on demand.
- Supports a **diff mode** (`diffMode` / `originalValue` properties, `createDiffEditor`).
  Note the ordering constraint PR #673 had to fix: dispose the widget **before** the models
  it holds, or Monaco's `DiffEditorWidget` throws "TextModel got disposed before
  DiffEditorWidget model got reset". Any future element that owns Monaco models inherits
  this rule.
- Exported as `KeepMonacoEditor` with `events: { onChange: 'change' }`.

**How the Source tab uses it** (`FormsContainer.tsx` ~line 647–665):

| View | Rendered by | Notes |
|---|---|---|
| Tree | `keep-source-tree` (inside `KeepSource`) | JSON tree editor, unchanged |
| Text | `KeepMonacoEditor` | `language="json"`, `value={sourceTabContent}` |
| **Diff** | `KeepMonacoEditor` with `diffMode` | `originalValue={savedSchemaText}` — saved schema on the left, edits on the right |

Text and Diff are the two **textual** views and share one Monaco buffer, so switching
between them preserves in-flight edits. That predicate lives in the element file, not the
container: `keep-source-header.ts` exports `TEXTUAL_VIEWS` and `isTextualView()`, and
`FormsContainer` imports the latter to decide whether to mount the editor at all.

**Remaining tail (none of it blocking):**

1. 🔴 **Make the Monaco import dynamic.** `keep-monaco-editor.ts:11` is still
   `import * as monaco from 'monaco-editor'` at module scope. The test problem it used to
   cause was solved differently — a `vi.mock('monaco-editor')` fake inside
   `keep-monaco-editor.test.ts`, plus a `document.queryCommandSupported` polyfill in
   `test/setupTests.ts` — so what is left is purely payload: the entry chunk is
   **6,322.51 kB / 1,703.85 kB gzip**, and moving the import into `firstUpdated()` is the
   single largest available reduction. **S.**
2. 🟡 **Drop the dead dependencies.** `@monaco-editor/react` (^4.8.0-rc.3) and
   `@monaco-editor/loader` (^1.7.0) are still in `dependencies` with **zero imports in
   `src`** — the only textual match is a comment inside `keep-monaco-editor.ts`. Delete
   both, and the already-disabled `disabledpostinstall` copy step with them (report 00
   P2-9). **S.**
3. 🟡 `access/ScriptEditor.tsx` — **not** a Monaco migration; see the note in §4. If you
   want syntax highlighting for formulas, that is a new feature, and `keep-monaco-editor`
   is now the obvious vehicle for it.

~~Move `prettier` to `dependencies`~~ — ✅ done in PR #673.

### 5.4 **Formik** (19 files) — unchanged

Formik is a **React-only state library**, not a widget. WebAwesome form controls are
form-associated custom elements with native Constraint Validation (`required`, `pattern`,
`setCustomValidity()`, `:state(valid|invalid)`), so once controls are `wa-*`, most of
Formik's plumbing moves to a native form + a light validator (`yup` is already installed
and used in 7 files).

**Recommendation unchanged:** treat each Formik form as a container that stays React until
its controls are all `wa-*`, then convert the form to a Lit element using native
submission + `yup`. Do **not** port Formik into Lit. `useFormik` appears in 8 files,
`FormikProps` typing in 11.

> **Testing note:** the `attachInternals` stub in `test/setupTests.ts` is installed
> unconditionally precisely because jsdom's own `ElementInternals` lacks `setValidity`,
> which WA form-associated elements call. Any Formik→native conversion inherits that
> stub — no extra test plumbing needed.

### 5.5 Secondary gaps

- **MUI plain `Table`** (6 files) and **`List`** (nav, 4 files): no `wa-*` in any tier.
  Author one shared `keep-data-table` and one `keep-nav-list` rather than per-screen
  tables.
- **Snackbar/Toast**: `wa-toast` is Pro; keep the React toaster or author a small Lit
  toaster.
- **`Autocomplete`**: `wa-combobox` is Pro; free path is the existing `keep-autocomplete`.
- **Icons — the approach is settled, the sweep is not.** `src/services/icon-library.ts`
  registers a self-hosted Font Awesome library under the explicit name `fa` (not
  `default`, so it cannot affect how WebAwesome's own components resolve their internal
  icons). Eleven glyphs are bundled from `@fortawesome/fontawesome-free@7.3.1` through
  Vite `?url` imports; an unknown name logs a warning rather than rendering an empty
  glyph. This deliberately avoids two failure modes: WebAwesome's default CDN resolver
  (`ka-f.fontawesome.com`, an external runtime dependency a deployment CSP is likely to
  block) and absolute `/admin/...` paths.

  **Remaining debt, measured at `e17010c`:**

  | What | Count | Why it matters |
  |---|---:|---|
  | `IMG_DIR` references | **38** across 17 files | Hardcodes `/admin/img/...`; resolves only when the app is mounted at `/admin/` |
  | `<wa-icon src=…>` occurrences | **9** | 8 live templates (`keep-textform-array` ×4, `keep-nsf-card` ×2, `keep-api-error-dialog` ×1, `keep-button`'s dynamic `src` ×1) plus 1 in a doc comment |

  The failure mode is the reason to care: off `/admin/`, the request falls through to the
  SPA's `index.html`, `wa-icon` receives HTML instead of SVG, and the icon **silently**
  disappears — the button keeps its box and its click handler, so nothing looks broken.
  Convert the remaining call sites to `library="fa"` and add each glyph to `ICONS`.
  See report 03 §6.4 for the wider `wa-icon` sweep across React.

---

## 6. Consistency issues — status

The debt catalogue from the original report, re-scored:

1. ✅ **Types.** All 26 elements are TypeScript with decorators. The SWC config
   (`tsDecorators: true` + `useDefineForClassFields: false`) is mirrored in
   `vite.config.mts` and `vitest.config.ts` — **keep these in sync**; divergence
   reintroduces Lit's class-field-shadowing bug silently.
2. 🔴 **Button duplication — still open.** `keep-button` wraps `wa-button`, but
   `keep-button-yes`/`-no`/`-neutral` are plain `<button>`s with hardcoded hex
   (`#0F5FDC`, `#0B4AAE`, `#96BCF8`). Collapse into a single `keep-button` with
   `variant`/`appearance`, update `KeepElements.tsx`, and migrate the consumers:
   **49 usages of the three legacy tags across 21 files** (`<KeepButtonYes>` ×24,
   `<KeepButtonNeutral>` ×23, `<KeepButtonNo>` ×2), against 19 `<KeepButton>` usages.
   Note `FormsContainer`'s newly converted Source tab still reaches for
   `KeepButtonNeutral`/`KeepButtonYes` in its two confirm dialogs — converted screens keep
   feeding this debt until it is paid. Doing this **before** report 03's tokenization
   avoids tokenizing three components that should not exist. Effort **M**.
3. ✅ **Repeated CSS imports.** `webawesome.css` is imported exactly once
   (`src/index.tsx`); components import only the specific `wa-*` element modules they
   render.
4. ✅ **Event contract.** `KeepElement.emit()` gives one composed, bubbling `CustomEvent`
   pattern. 🟡 Residual: `keep-drawer` still takes a `closeFn` **property**; only 2 of the
   25 wrappers declare an `events` map in `KeepElements.tsx`.
5. 🔴 **Ad-hoc dark-mode overrides — still open.** *Delivery* of the theme is now clean
   (`services/theme-service.ts`, §2.5) and **6** element files pick it up via
   `:host-context(body[data-theme="dark"])` (`keep-alert`, `keep-source`,
   `keep-default-card`, `keep-input-text`, `keep-input-password`, `keep-switch`).
   But the **values** are still hardcoded
   per component: `keep-button.ts` writes `#f4e9ff` into `--wa-color-brand-50`,
   `--wa-color-brand-border-loud` and `--wa-color-brand-fill-loud` (plus two
   `!important`s), and there are **100 `light-dark()` literals** across
   `src/components/keep-elements/`, **12** of them in `keep-source-header.ts` alone
   (`#D7EBFD`/`#3a3a5a`, `#1e1e2e`, plus bare `#ED0000`/`#007E0D` for cancel/save).
   `KeepElement` was built as the hook for a shared token layer and **still nothing uses
   it**. **This is report 03's landing site** — do it there, not per element.
   ⚠️ Direction of travel: PR #669 *consolidated* the Source tab's colors — moving them
   out of inline `style=` attributes into the element's `static styles` — which is the
   right move, but it also added a new hardcoded pair for the diff hint. Feature work is
   outrunning the token layer, which is an argument for pulling report 03's P3 forward.

   > 🐛 **New finding — that `keep-button` override is dead code.** Its selector is
   > `:host([data-theme='dark']) wa-button[appearance='outlined']::part(base)`, i.e. it
   > requires `data-theme` on the **`keep-button` element itself**. Nothing sets it —
   > `theme-service` writes `body.dataset.theme`, and no consumer passes the attribute
   > down. It is the only `:host([data-theme` selector in the tree; the other 6 elements
   > correctly use `:host-context(body[data-theme="dark"])`. So the rule never matches:
   > either fix the selector or delete the block. Confirm which before tokenizing it,
   > otherwise report 03 will faithfully tokenize a style that has never rendered.
6. ✅ **Registration.** One tag per file, self-registering; 25 of 26 re-exported through
   `KeepElements.tsx` (`keep-schema-status` is internal to `keep-nsf-card` by design).
   🟡 Residual: the `keep-source` / `keep-source-tree` file/tag inversion (§2.1).
7. ✅ **Shared base class.** `KeepElement` exists. Its theme-wiring role is unused (see 5).

---

## 7. Migration ordering (phased)

Principle unchanged: **leaves before containers, controls before forms, data-heavy views
last.**

### Phase 0 — Foundation — ✅ ~90 % COMPLETE
- [x] TS + decorators + shared base class; per-element `HTMLElementTagNameMap` typing.
- [x] Single global `webawesome.css` import.
- [x] Standardised event contract (`emit()`).
- [x] Rename to the `keep-*` namespace.
- [x] Unit tests for every element.
- [ ] **Collapse `keep-button*` into one component** (§6.2). — **M**
- [ ] **Decide the DataGrid strategy** (§5.1) and the **date-picker approach** (§5.2).
      Now cheaper to decide: §5.2 has one obvious answer, and §5.1 is down to three.

### Phase 0.5 — Pay off the Monaco commit — ✅ MOSTLY DONE
- [x] Polyfill `document.queryCommandSupported` in `test/setupTests.ts` (PR #668).
- [x] Test `keep-monaco-editor` — a fake-Monaco behaviour suite (PR #668) plus a real-Monaco
      lifecycle suite (PR #673), which caught a diff-editor dispose-ordering bug.
- [x] Move `prettier` to `dependencies`, and make its import dynamic (PR #673).
- [ ] **Make the Monaco import dynamic** (§5.3.1) — the only item left, and now purely a
      bundle-size play: entry chunk **6,322.51 kB / 1,703.85 kB gzip**. **S**
- [ ] Drop the dead `@monaco-editor/react` + `@monaco-editor/loader` dependencies and the
      `disabledpostinstall` script (§5.3.2). **S**

### Phase 1 — Presentational leaves & feedback (low risk, high volume)
- [ ] Loaders/spinners/progress → `wa-spinner`/`wa-progress-bar`/`wa-skeleton`.
- [ ] Headings/empty states/`Footer`/`Section`/`Tip` → small Lit elements + `wa-card`.
- [ ] `wa-divider`, `wa-avatar`, `wa-badge`; continue the `wa-icon` sweep (report 03 §6.4).
- [ ] **Finish the icon library migration** (§5.5): 38 `IMG_DIR` references and 9
      `<wa-icon src=…>` occurrences → `library="fa"`. Cheap, mechanical, and it removes a
      class of *silent* rendering failure. **S–M**

### Phase 2 — Form controls (the reusable core)
- [ ] Add wrappers for `wa-textarea`, `wa-number-input`, `wa-radio-group`.
- [ ] Consolidate `AgentSearch`/`FormSearch`/`ViewSearch` into one `keep-search`.
- [ ] Convert individual switch/input usages in settings pages.

### Phase 3 — Overlays & disclosure
- [ ] Dialogs → `keep-dialog-*` (`DeleteDialog`, `UnsavedChangesDialog`, `AddModeDialog`,
      `AddImportDialog`, `DeleteApplicationDialog`).
- [ ] `wa-drawer` (`FormDrawer`, `ConsentFilterContainer`'s drawer).
- [ ] `wa-dropdown`/`wa-popover` menus (`ActivateMenu`, `IconDropdown`, `CardViewOptions`,
      `ProfileMenu`).
- [ ] `wa-details` / **`wa-accordion`** disclosures (`ConsentItem`, `DetailsSection`).
- [ ] `wa-tab-group` (`FieldDndContainer`, `TabAgents/Forms/Views`, later `FormsContainer`).

### Phase 4 — Cards, trees, lists
- [ ] Card views (schemas/scopes displays) onto `keep-default-card`/`keep-nsf-card`.
- [ ] **Trees → `wa-tree`/`wa-tree-item`** (`FileContentsTree`, `SchemaContentsTree`) —
      free, good fit, only 2 files. **Promote this: it is the cheapest MUI X removal.**
- [ ] Author a shared `keep-nav-list` → `SideNav`, `OptionList`, `ListRoles`
      (`MobileSidebar` disappears with `wa-page` — report 03).

### Phase 5 — Forms (containers, after their controls exist)
- [ ] Convert Formik forms to native form + `yup`: `TestForm`, `PeopleForm`, `AppForm`,
      `ScopeForm`, `QuickConfigForm`, access forms. **(§5.4)**
- [ ] Author a shared `keep-data-table`; migrate `AppsTable`/`ConsentsTable`/
      `AgentsTable`/`FormsTable`/`ViewsTable`.
- [ ] `login/LoginPage` (entry screen; do once controls are proven).

### Phase 6 — Hard/data-heavy views (last)
- [x] **Wire `keep-monaco-editor` → `FormsContainer`'s Source tab** (PR #669) — done
      early and out of order, which turned out to be the right call: it validated the
      bridge on the hardest widget in the app before committing to Phases 1–5.
- [ ] Drop `@monaco-editor/*` (now dead, not blocked). **(§5.3)**
- [ ] `FormsContainer`'s remaining MUI: `Tabs`/`Tab` → `wa-tab-group`,
      `CircularProgress` → `wa-spinner`.
- [ ] Native `wa-input type="date"` → `AppFilterContainer`, `ConsentFilterContainer`. **(§5.2)**
- [ ] DataGrid screens per the chosen strategy → `Groups`, `GroupForm`, `PeopleCRUD`,
      `GroupMembers`, `PeopleSelector`. **(§5.1)**
- [ ] App shell, routers, `ThemeProvider`/`CssBaseline` removal — final sequencing in
      **report 04**.

**Dependency notes:** Phase 5 depends on Phase 2 (controls) + Phase 3 (dialogs/drawers).
Phase 6 is independent of the rest but gated by the Phase 0 strategy decisions. Layout and
token conversions run in parallel throughout per **report 03** — with one new ordering
constraint: **do §6.2 (button consolidation) before report 03's P3 tokenization.**
