# Report 02 — React → Lit / WebAwesome Migration

**Scope:** Map every React component under `src/components/**` (plus top-level `App.tsx`, `Views.tsx`, `Footer.tsx`) to a migration target: an existing hand-written `keep-*` component, a real WebAwesome `wa-*` component, a **new** Lit component to author, or **KEEP** (leave on React/MUI for now).

> **Refreshed 2026-07-28** against branch `new_code` @ `fcab645`. Previous refreshes:
> `e17010c` and `7594672` (both 2026-07-27); originally written 2026-07-24, when the Lit
> layer was 27 untyped `.js` files under `lit-elements/`.
>
> **Phase 0 (Foundation) is COMPLETE.** All elements are TypeScript with decorators on a
> shared base class, renamed `lit-*` → `keep-*`, each with a unit test — and the last
> outstanding Phase-0 item, collapsing the four button components, **landed in #701**.
>
> **Three MUI subsystems have now been replaced by `keep-*` elements**, not just one:
> the Monaco editor (#669), the **MUI X tree view** → `keep-tree` (#704/#723), and the
> **MUI X date picker** → `keep-input-date` (#703/#739). `@mui/x-date-pickers` and
> `@mui/x-tree-view` are gone from `package.json`; `@mui/x-data-grid` is the only MUI X
> package left, in 5 files.
>
> **The `wa-page` shell landed** (#707/#767). `AppShell.tsx` replaces `HomeElement`'s flex
> scaffolding and `RightPanel`'s `calc()` arithmetic; the duplicated `MobileSidebar` is
> deleted rather than ported. Report 03 owns the detail.
>
> **Two mapping facts** (re-verified against the installed `@awesome.me/webawesome@3.10.0`):
> - ✅ **`<wa-page>` is FREE**, not Pro — and it is now in production use, which settles
>   the question empirically as well as by inspection.
> - 🔴 **There is no WebAwesome data grid in _any_ tier.** The date-picker half of this
>   gap was closed by authoring `keep-input-date` on `wa-input[type=date]`; the DataGrid
>   half is the one blocking decision left (§5.1, **#702**).
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

### 0.1 New this refresh (`e17010c` → `fcab645`, 80 commits)

| §  | Item | Status | Where |
|----|------|:---:|---|
| §6.2 | **Collapse the four `keep-button*` components into one** | ✅ **DONE** — the last open Phase-0 item. `keep-button-yes`/`-no`/`-neutral` were plain `<button>`s with hardcoded hex; they are gone, and `keep-button` gained the variants. −3 test files | #701 |
| §5.2 | **Date picker** — replace `@mui/x-date-pickers` | ✅ **DONE** — `keep-input-date` on `wa-input[type=date]`. The package **and `dayjs`'s only real consumer** are gone; §5.2 is now a *done* section | #703/#739 |
| §5.5 | **Tree view** — replace `@mui/x-tree-view` | ✅ **DONE** — `keep-tree` on `<wa-tree selection="leaf">`, 11 tests. This was flagged as "the cheapest MUI X removal in the program" and it was | #704/#723 |
| §5.3 | Make the **Monaco** import dynamic | ✅ **DONE** — `keep-monaco-editor.ts` now `import()`s `monaco-editor`, its three workers and the editor CSS lazily. Entry chunk **6,322.51 kB → 2,111.11 kB** (−66.6 %); `editor.api2` is a 3,626.93 kB chunk fetched on first use | #693/#729 |
| §5.5 | Icons off absolute asset paths | ✅ **DONE, verified** — `IMG_DIR` is down to **1** textual match, a doc comment in `icon-library.ts`. Every icon resolves through the self-hosted `library="fa"` | #700, #725, #730 |
| §6.5 | Move ad-hoc dark-mode overrides to a token layer | ✅ **DONE for the element layer** — #708 replaced 93 `light-dark()` literals across 11 elements with `var(--wa-color-*)`, and deleted the `:host-context` dark overrides that existed because `color-scheme` does not inherit reliably through a shadow boundary (custom properties do). What remains inside `keep-*` is the deliberate editor-palette carve-out. The **Linaria/CSS** side is report 03's | #708, report 03 |
| §2.5 | Centralise the theme carriers | ✅ **DONE** — `theme-service.ts` remains the single writer for `wa-dark`, `colorScheme` and `body.dataset.theme`, and #708 removed the *reason* components used to care: no component now reads a theme value at all | #669, #708 |
| — | **App shell on `wa-page`** | ✅ **DONE** — `AppShell.tsx` maps the app's regions onto `wa-page` slots. `HomeElement`'s `AppContainer`, `RightPanel`'s `calc(100% - 241px|50px)` and the duplicated `MobileSidebar` are deleted, not ported | #707/#751/#767 |
| §5.1 | Decide the DataGrid strategy | 🔴 **STILL OPEN** — now the *only* blocking component decision in this report. 5 files, `@mui/x-data-grid@9.10.1` | **#702** |

### 0.2 Where raw `wa-*` markup lives — a claim that got better

The previous refresh reported "17 files with raw `wa-*` markup, exactly one a `.tsx`
(`scopes/ScopeLists.tsx`, a `<wa-drawer>`)". Re-measured on this commit, **no `.tsx` file
contains raw `wa-*` markup at all**: all five `.tsx` matches are prose inside comments,
including the `ScopeLists.tsx` one, which now renders `KeepDrawer`. Every real `wa-*` tag
in the tree is inside a `keep-*` element template, plus the single `WaPage` React wrapper
that `AppShell.tsx` imports from `dist/react/page/`.

That is the boundary this report has been arguing for since the first revision, and it now
holds without exception. It matters for report 04: when the React layer goes, nothing has
to be un-picked from JSX.

### 0.3 Carried forward from earlier refreshes

| §  | Item | Status | Where |
|----|------|:---:|---|
| §6.1 | Author elements in TypeScript with `lit` decorators | ✅ **DONE** — all 25 elements, `@customElement`/`@property`/`@state`/`@query` | PRs #652–#659 |
| §6.7 | Shared base class | ✅ **DONE** — `KeepElement` (`keep-element.ts`) with a typed, composed `emit()` | `88a47bd` |
| §6.4 | Consistent event contract | ✅ **DONE** — `emit()` dispatches `bubbles: true, composed: true`; `KeepElements.tsx` maps `events` for `KeepCheckbox` and `KeepMonacoEditor` | `88a47bd` |
| §6.3 | Single global `webawesome.css` import | ✅ **DONE** — exactly one import, in `src/index.tsx`; components import only the `wa-*` element modules they render | PRs #652–#659 |
| §6.6 | Predictable registration | ✅ **DONE** — one file per tag, self-registering via `@customElement`; 24 of the 25 re-exported through `KeepElements.tsx` (`keep-schema-status` is internal by design) |  |
| §6.x | Naming | ✅ **DONE** — `lit-elements/` → `keep-elements/`, `lit-*` → `keep-*`, `LitElements.tsx` → `KeepElements.tsx`, `lit-overrides.css` → `keep-overrides.css` | `8ea711b`, PR #666 |
| — | Test coverage for the element layer | ✅ **DONE** — 29 suites under `test/components/keep-elements/` (25 elements + the base class + a Monaco lifecycle suite + two cross-cutting suites), `test/test-utils/lit.ts` (`mountLit`/`cleanupLit`); shadow-DOM assertions work. The directory sits at **84.5 % line coverage** against an **80 %** gate | report 01 §B2 |
| §6.2 | Collapse `lit-button*` into one component | ✅ **DONE** (#701) — `keep-button-yes`/`-no`/`-neutral` deleted; `keep-button` carries the variants | — |
| §6.5 | Move ad-hoc dark-mode overrides to a token layer | ✅ **DONE for `keep-*`** (#708) — the `#f4e9ff` `::part` override is gone with the buttons it belonged to; 93 `light-dark()` literals became `var(--wa-color-*)`. The residue outside the element layer is report 03's | report 03 |
| §7 P0 | Decide the DataGrid + date-picker strategy | 🟡 **half done** — date picker solved by `keep-input-date` (#703). DataGrid still open (**#702**) | §5.1 |
| — | `copyable-text.js` | ✅ **REMOVED** as dead code (`f14aff6`); `wa-copy-button` is the path if copy UX returns | — |
| — | `home/About.tsx` | ✅ **REMOVED** (`757e657`) — drop from the inventory | — |
| — | `src/custom-elements.d.ts` | ✅ **REMOVED** — stale JSX intrinsic tags (`app-status`, `drawer-container`) dropped; typing now comes from each element's `HTMLElementTagNameMap` augmentation | `88a47bd`, `8ea711b` |

**Net progress: the element layer stopped being a demo and started deleting dependencies.**
The previous refresh could point at one converted screen. This one can point at three MUI
subsystems removed outright — `@monaco-editor/react`, `@mui/x-tree-view`,
`@mui/x-date-pickers` — plus the app shell moved onto `wa-page` and the whole styling
substrate tokenized. What has *not* moved is the bulk: **60 `.tsx` files still import
`@mui/material`** (was 68), and that number will only fall through Phases 1–5. The
foundation is finished; the volume work is next.

---

## 1. Executive summary

- **125 React `.tsx` files** (was 130); **60** import `@mui/material`, **41** import
  `@mui/icons-material`, **18** use `react-icons`, **19** use Formik, **70** touch
  `react-redux`. Counted across all of `src`, MUI is imported in **75 files**:
  **149** `@mui/material` references, **87** `@mui/icons-material`, **5** `@mui/x-data-grid`.
- **25 TypeScript Lit elements** in `src/components/keep-elements/` (26 modules — the
  extra is the `KeepElement` base), **24** wrapped for React via `@lit/react`'s
  `createComponent` in `KeepElements.tsx`. Most wrap a `wa-*` element internally. Every
  one has a unit test.
- **No raw `wa-*` markup remains in React.** Every `wa-*` tag in `src` is inside a `keep-*`
  element template; the only WebAwesome component React touches directly is the `WaPage`
  wrapper in `AppShell.tsx`, imported from `dist/react/page/`. Tag counts across the Lit
  layer: 32 `<wa-icon>`, 9 `<wa-input>`, 8 `<wa-button>`, 5 each `<wa-option>` and
  `<wa-dropdown-item>`, 4 `<wa-tree>`, 3 `<wa-tree-item>`, 2 each `wa-switch`,
  `wa-dropdown`, `wa-drawer`, `wa-checkbox`, `wa-card`, `wa-callout`, 1 each `wa-tooltip`,
  `wa-select`, `wa-details`. The app imports **18 distinct** WA components from
  `dist/components/` plus `page` from `dist/react/` — **19** in total.

  > **Correction, second time:** the revision before last said "raw `wa-*` usage in React
  > … 26 files". The last revision corrected that to "17 files, one a `.tsx`". Both
  > over-counted: the `.tsx` match was a comment then too. The honest figure has always
  > been **zero**.

- **The bulk of the UI still maps cleanly to free WebAwesome components** (buttons,
  inputs, checkbox, switch, select, dialog, drawer, tabs, tooltip, card, dropdown/menu,
  alert→callout, spinner, breadcrumb, tree, divider, avatar, badge, radio, textarea,
  **page**).
- **The hard cases are down to one.** `<wa-page>` is free *and now in production use*.
  **Monaco is done** (authored, tested, wired, dynamically imported, and it grew a Diff
  view the React wrapper never had). The **date picker** was solved by authoring
  `keep-input-date` on `wa-input[type=date]` rather than buying or importing anything, and
  the **tree view** by `keep-tree` on `<wa-tree>`. That leaves **MUI X DataGrid** (5 files)
  as the single blocking component decision — **#702**. Formik (19 files) is unchanged: a
  state library, not a widget, and its own issue (**#717**).
- **Consistency debt is paid.** The four-way button duplication (#701), the per-element
  hardcoded colours (#708) and the `IMG_DIR` icon paths (#700/#730) are all closed. What
  is left in this area is not consistency but *volume*: 60 `.tsx` files importing
  `@mui/material`, and 3 icon systems still to converge (**#718**).

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
| **legacy** `<wa-icon src="${IMG_DIR}/…">` | `wa-icon library="fa"` | Free | ✅ **DONE** (#700). No `IMG_DIR` reference remains and the constant is deleted. The two surviving `<wa-icon src=…>` sites in `keep-nsf-card` are `data:` URIs from `app-icons.ts`, which are inline and carry no mount-point dependency. §5.5. |
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

### Existing Lit inventory (25 elements — reference)

`keep-alert` · `keep-api-error-dialog` · `keep-app-status` · `keep-autocomplete` ·
`keep-button` · `keep-checkbox` · `keep-default-card` · `keep-dialog-actions` ·
`keep-dialog-content` · `keep-dialog-header` · `keep-drawer` · `keep-dropdown` ·
**`keep-input-date`** · `keep-input-password` · `keep-input-text` ·
**`keep-monaco-editor`** · `keep-nsf-card` · `keep-schema-status` ·
`keep-source` *(file: `keep-source-header.ts`)* · `keep-source-tree` *(file: `keep-source.ts`)* ·
`keep-switch` · `keep-textform` · `keep-textform-array` · `keep-tooltip` · **`keep-tree`**.

Changed since the last refresh: −`keep-button-yes`/`-no`/`-neutral` (#701),
+`keep-input-date` (#703), +`keep-tree` (#704).

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

**Risk:** this decision gates the people/groups domain and is now — with the tree view and
date picker both solved — **the single largest blocker to dropping `react`/`react-dom`**
(report 04). It is also the last reason `@mui/x-*` exists in `package.json` at all. Decide
early even though you migrate it late; (A) and (B) have very different dependency and CSP
implications. Tracked as **#702**.

### 5.2 MUI X **Date Pickers** (`@mui/x-date-pickers`) — ✅ SOLVED

**This section is closed.** #703/#739 authored `keep-input-date` on
`wa-input[type="date"]` — the recommendation this report made, implemented as written —
and `@mui/x-date-pickers` is **gone from `package.json`**. Both consumers
(`applications/AppFilterContainer.tsx`, `consents/ConsentFilterContainer.tsx`) now use the
element through the React bridge. Five tests in `keep-input-date.test.ts`.

Two notes worth carrying forward:

- **WebAwesome still has no date picker in any tier** — this was solved by *authoring*, not
  by finding one. 3.10 ships `wa-time-input` and `known-date`/`format-date` helpers, but no
  calendar widget. If a richer picker is ever needed, that is a custom Lit build.
- **`dayjs` is now dead weight.** It existed for `AdapterDayjs`; the only remaining textual
  match in `src` is a comment in `keep-input-date.ts` explaining what it replaced. See
  report 00 P2-8.

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

1. ✅ **Made the Monaco import dynamic** (#693/#729). `keep-monaco-editor.ts` now
   `import()`s `monaco-editor`, its three workers and the editor CSS lazily. Entry chunk
   **6,322.51 kB → 2,111.11 kB / 594.20 kB gzip**; `editor.api2` is a 3,626.93 kB chunk
   fetched on first use. This was flagged as "the single largest available reduction" and
   it was.
2. ✅ **Dropped the dead dependencies** (#675) — `@monaco-editor/react`,
   `@monaco-editor/loader` and the `disabledpostinstall` copy step.
3. 🟡 `access/ScriptEditor.tsx` — **not** a Monaco migration; see the note in §4. If you
   want syntax highlighting for formulas, that is a new feature, and `keep-monaco-editor`
   is now the obvious vehicle for it. **The only item left in this tail.**

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

  **Closed by #700.** `IMG_DIR` is deleted; every image is `import`ed from the module that
  renders it, so Vite emits it into `admin/assets/` beside the bundle and the URL follows
  the base the bundle itself loaded from.

  The failure mode was the reason to care, and it is worth recording because nothing about
  it looked like a failure: off `/admin/`, the request fell through to the SPA's
  `index.html` and the browser received **`200 text/html`** where an image was expected.
  Measured against a dev server before the fix:

  | URL | Status | Content-Type |
  |---|---|---|
  | `/admin/img/KeepNewIcon.png` | 200 | `text/html` ← the bug |
  | `/src/assets/KeepNewIcon.png` | 200 | `image/png` ← after |

  #700 also turned up the inverse of the same bug in CSS: `.login-castle-bg` used
  `url('/img/castlebg.jpg')`, which resolved under `vite dev` but **not** under the
  packaged `/admin` mount — so the login background silently did not paint in production,
  while the `IMG_DIR` constant that would have been right there was dead code with no
  importer. Both are gone; `test/services/icon-library.test.ts` now scans stylesheets as
  well as `.tsx`, which is the gap that hid it.
  See report 03 §6.4 for the wider `wa-icon` sweep across React.

---

## 6. Consistency issues — status

The debt catalogue from the original report, re-scored:

1. ✅ **Types.** All 25 elements are TypeScript with decorators. The SWC config
   (`tsDecorators: true` + `useDefineForClassFields: false`) is mirrored in
   `vite.config.mts` and `vitest.config.ts` — **keep these in sync**; divergence
   reintroduces Lit's class-field-shadowing bug silently. Moving to standard decorators +
   `accessor`, which removes that coupling, is **#747**.
2. ✅ **Button duplication — CLOSED (#701).** `keep-button-yes`/`-no`/`-neutral` — plain
   `<button>`s with hardcoded `#0F5FDC`/`#0B4AAE`/`#96BCF8` — are deleted. Their 49 usages
   across 21 files were migrated onto `keep-button`'s variants, and three test files went
   with them. Doing this *before* #708 was the right ordering: three components that should
   not exist never got tokenized.
3. ✅ **Repeated CSS imports.** `webawesome.css` is imported exactly once
   (`src/index.tsx`), followed by `keep-theme.css` and `keep-overrides.css` in that order —
   the order matters, since `keep-theme.css` overrides WA's own brand ramp. Components
   import only the specific `wa-*` element modules they render.
4. ✅ **Event contract.** `KeepElement.emit()` gives one composed, bubbling `CustomEvent`
   pattern. 🟡 Residual, unchanged: `keep-drawer` still takes a `closeFn` **property**; only
   2 of the 25 wrappers declare an `events` map in `KeepElements.tsx`.
5. ✅ **Ad-hoc dark-mode overrides — CLOSED for the element layer (#708).** 93
   `light-dark()` literals across 11 elements became `var(--wa-color-*)` reading the
   semantic tokens pinned in `keep-theme.css`. The `:host-context(body[data-theme="dark"])`
   overrides in 6 files were **deleted rather than ported**, and the dead `keep-button`
   `:host([data-theme='dark'])` block went with the component in #701 — so the bug this
   section flagged resolved itself.

   Two things are worth carrying forward from how it was done:

   > **The `:host-context` workarounds existed for a real reason, and the fix removed the
   > reason.** They were there because `color-scheme` does not inherit reliably across a
   > shadow boundary, so a bare `light-dark()` inside a shadow root could resolve to the
   > wrong branch. Custom properties *do* inherit, so once the values became `var(--wa-*)`
   > the workaround had nothing left to do. #708 verified this rather than assuming it:
   > with the overrides removed, `keep-tree` still computes `#e0e0e0` and
   > `keep-default-card` `#252535`/`#ffffff` in dark mode — the exact values the deleted
   > `!important` rules used to force.

   > **A deliberate carve-out remains.** `keep-source.ts`, `keep-source-header.ts` and
   > `keep-autocomplete.ts` keep 9 `light-dark()` literals on purpose: they are VS Code's
   > syntax-highlighting palette and two editor-chrome highlights, not UI chrome.
   > `theme-selectors.test.ts` asserts both halves — no `light-dark()` outside the
   > carve-out, and the carve-out still present — so neither can drift silently.

   > 🐛 **But an *undeliberate* one survived, and it is a live defect.** Four element files
   > still read **three-digit Shoelace-era colour steps that WA 3.10 does not define**, with
   > no fallback: `keep-input-text.ts:31-32`, `keep-input-password.ts:20-21` and six
   > danger/success rules in `keep-source.ts:279-304` (plus `keep-overrides.css:26-27`).
   > Because `var(--undefined)` with no fallback is invalid at computed-value time, the
   > declaration is dropped — so **`wa-input:state(user-invalid)::part(base)`'s red border
   > never paints**. This is the other half of the bug #744 fixed: that PR corrected the
   > dead *selector*, and `validity-states.test.ts` can only assert selectors and state
   > transitions because `css: false` hides colour. Report 03 finding 11b, **#765**.
6. ✅ **Registration.** One tag per file, self-registering; **24 of the 25** re-exported
   through `KeepElements.tsx` (`keep-schema-status` is internal to `keep-nsf-card` by
   design). 🟡 Residual: the `keep-source` / `keep-source-tree` file/tag inversion —
   `keep-source-header.ts` is the file that registers `keep-source-tree` (§2.1).
7. ✅ **Shared base class.** `KeepElement` exists, and its theme-wiring role is now moot:
   after #708 **no element reads a theme value at all** — they read tokens, and the
   cascade does the rest.

---

## 7. Migration ordering (phased)

Principle unchanged: **leaves before containers, controls before forms, data-heavy views
last.**

### Phase 0 — Foundation — ✅ COMPLETE
- [x] TS + decorators + shared base class; per-element `HTMLElementTagNameMap` typing.
- [x] Single global `webawesome.css` import.
- [x] Standardised event contract (`emit()`).
- [x] Rename to the `keep-*` namespace.
- [x] Unit tests for every element.
- [x] **Collapse `keep-button*` into one component** (§6.2) — #701.
- [x] **Decide the date-picker approach** (§5.2) — #703, authored as `keep-input-date`.
- [ ] **Decide the DataGrid strategy** (§5.1) — the one item that did not close. **#702**

### Phase 0.5 — Pay off the Monaco commit — ✅ COMPLETE
- [x] Polyfill `document.queryCommandSupported` in `test/setupTests.ts` (PR #668).
- [x] Test `keep-monaco-editor` — a fake-Monaco behaviour suite (PR #668) plus a real-Monaco
      lifecycle suite (PR #673), which caught a diff-editor dispose-ordering bug.
- [x] Move `prettier` to `dependencies`, and make its import dynamic (PR #673).
- [x] **Make the Monaco import dynamic** (§5.3.1) — #693/#729. Entry chunk
      **6,322.51 kB → 2,111.11 kB / 594.20 kB gzip**.
- [x] Drop the dead `@monaco-editor/react` + `@monaco-editor/loader` dependencies and the
      `disabledpostinstall` script (§5.3.2) — #675.

### Phase 1 — Presentational leaves & feedback (low risk, high volume)
- [ ] Loaders/spinners/progress → `wa-spinner`/`wa-progress-bar`/`wa-skeleton`.
- [ ] Headings/empty states/`Footer`/`Section`/`Tip` → small Lit elements + `wa-card`.
- [ ] `wa-divider`, `wa-avatar`, `wa-badge`; continue the `wa-icon` sweep (report 03 §6.4).
- [x] **Finish the icon library migration** (§5.5) — ✅ #700. `IMG_DIR` deleted; every
      image is an `import`. The remaining `<wa-icon src=…>` pair is `data:` URIs, which
      are inline and unaffected. Removed a class of *silent* rendering failure.

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
- [x] **Trees → `wa-tree`/`wa-tree-item`** — ✅ #704/#723. `keep-tree` takes a
      `KeepTreeNode[]` and emits `item-select` for leaves only; `@mui/x-tree-view` deleted.
      It was promoted as "the cheapest MUI X removal" and it was: 2 files, 11 tests.
- [ ] Author a shared `keep-nav-list` → `SideNav`, `OptionList`, `ListRoles`.
      ✅ `MobileSidebar` has already disappeared with `wa-page` (#707), as predicted.

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
- [x] Drop `@monaco-editor/*` — ✅ #675.
- [ ] `FormsContainer`'s remaining MUI: `Tabs`/`Tab` → `wa-tab-group`,
      `CircularProgress` → `wa-spinner`.
- [x] Native `wa-input type="date"` → `AppFilterContainer`, `ConsentFilterContainer` —
      ✅ #703/#739, via `keep-input-date`. **(§5.2)**
- [ ] DataGrid screens per the chosen strategy → `Groups`, `GroupForm`, `PeopleCRUD`,
      `GroupMembers`, `PeopleSelector`. **(§5.1, #702)**
- [x] App shell on `wa-page` — ✅ #707/#767 (`AppShell.tsx`).
- [ ] Routers and the `ThemeProvider`/`CssBaseline` that `AppShell.tsx` still mounts —
      final sequencing in **report 04** (**#709**, **#716**).

**Dependency notes:** Phase 5 depends on Phase 2 (controls) + Phase 3 (dialogs/drawers).
Phase 6 is independent of the rest but gated by the one remaining Phase 0 decision (#702).
Layout and token conversions run in parallel throughout per **report 03** — whose token
work is now largely delivered, so the ordering constraint that governed the last two
refreshes ("collapse the buttons before tokenizing") has been discharged.

**Where to start now.** Phase 0 is closed except #702, and Phase 0.5 is closed outright.
The highest-value next moves are, in order:

1. **Decide #702 (DataGrid).** It gates 5 screens, the whole people/groups domain, the last
   `@mui/x-*` package, and report 04's ability to drop React. Decide it even though the
   migration lands late.
2. **Phase 1 + Phase 3** in parallel — both are volume work over presentational leaves and
   overlays, both low-risk, and both now benefit from a token layer that already resolves
   correctly inside shadow roots.
3. **#718 (icons)** — three icon systems (`@mui/icons-material` 40 files, `react-icons` 18,
   the 216 KB base64 `app-icons.ts`) are still the largest single source of MUI imports.
   Converging them on `wa-icon` removes a dependency *and* entry-chunk weight.
