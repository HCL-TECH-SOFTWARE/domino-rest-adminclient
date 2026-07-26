# Report 02 — React → Lit / WebAwesome Migration

**Scope:** Map every React component under `src/components/**` (plus top-level `App.tsx`, `Views.tsx`, `Footer.tsx`) to a migration target: an existing hand-written `keep-*` component, a real WebAwesome `wa-*` component, a **new** Lit component to author, or **KEEP** (leave on React/MUI for now).

> **Refreshed 2026-07-27** against branch `new_code` @ `7594672`. Originally written
> 2026-07-24, when the Lit layer was 27 untyped `.js` files under `lit-elements/`.
>
> **Phase 0 (Foundation) is essentially COMPLETE.** All elements are TypeScript with
> decorators on a shared base class, renamed `lit-*` → `keep-*`, each with a unit test.
> One Phase-0 item — collapsing the four button components — is **not** done.
>
> **Two mapping corrections** after re-verifying against the installed
> `@awesome.me/webawesome@3.10.0` (was 3.6.0):
> - ✅ **`<wa-page>` is FREE**, not Pro. Report 03's biggest go/no-go gate is resolved.
> - 🔴 **There is no WebAwesome data grid or date picker in _any_ tier.** "Buy WA Pro
>   Data Grid" was never a real option; §5.1 is corrected below.

**Companion reports (cross-reference):**
- `reports/03-wa-page-and-design-tokens.md` — layout primitives → `wa-*` CSS utilities, theming, design tokens, dark mode, CSP. All "layout only" and "token/theme" concerns are deferred there.
- `reports/04-remove-react.md` — final sequencing of the React removal. This report keeps the component-level detail; report 04 owns end-state ordering and the Redux-removal plan.

**WebAwesome version:** `@awesome.me/webawesome@^3.10.0` (3.10.0 installed). Every `wa-*` name below was re-verified against `node_modules/@awesome.me/webawesome/dist/components/` and the Pro list in the bundled skill's `references/choosing-components.md`.

---

## 0. What changed since 2026-07-24

| §  | Item | Status | Where |
|----|------|:---:|---|
| §6.1 | Author elements in TypeScript with `lit` decorators | ✅ **DONE** — all 26 elements, `@customElement`/`@property`/`@state`/`@query` | PRs #652–#659 |
| §6.7 | Shared base class | ✅ **DONE** — `KeepElement` (`keep-element.ts`) with a typed, composed `emit()` | `88a47bd` |
| §6.4 | Consistent event contract | ✅ **DONE** — `emit()` dispatches `bubbles: true, composed: true`; `KeepElements.tsx` maps `events` for `KeepCheckbox` and `KeepMonacoEditor` | `88a47bd` |
| §6.3 | Single global `webawesome.css` import | ✅ **DONE** — exactly one import, in `src/index.tsx`; components import only the `wa-*` element modules they render | PRs #652–#659 |
| §6.6 | Predictable registration | ✅ **DONE** — one file per tag, self-registering via `@customElement`, all re-exported through `KeepElements.tsx` |  |
| §6.x | Naming | ✅ **DONE** — `lit-elements/` → `keep-elements/`, `lit-*` → `keep-*`, `LitElements.tsx` → `KeepElements.tsx`, `lit-overrides.css` → `keep-overrides.css` | `8ea711b`, PR #666 |
| — | Test coverage for the element layer | ✅ **DONE** — 26 suites, `test/test-utils/lit.ts` (`mountLit`/`cleanupLit`); shadow-DOM assertions work | report 01 §B2 |
| §5.3 | `lit-monaco` wrapper | 🟡 **AUTHORED, NOT WIRED** — `keep-monaco-editor.ts` (538 lines) exists and is exported as `KeepMonacoEditor`, but `FormsContainer.tsx` still imports `@monaco-editor/react`. It also ships **no test** and breaks the suite — see report 01 §0 | `7594672` |
| §6.2 | Collapse `lit-button*` into one component | 🔴 **NOT DONE** — `keep-button` (wraps `wa-button`) still coexists with `keep-button-yes`/`-no`/`-neutral`, which are plain `<button>`s with hardcoded hex | — |
| §6.5 | Move ad-hoc dark-mode overrides to a token layer | 🔴 **NOT DONE** — e.g. `keep-button.ts` still carries a `#f4e9ff` `::part` override; `keep-source*.ts` use `light-dark(#1e1e2e, …)` literals | report 03 |
| §7 P0 | Decide the DataGrid + date-picker strategy | 🔴 **NOT DONE** — and the option set has changed (§5.1, §5.2) | — |
| — | `copyable-text.js` | ✅ **REMOVED** as dead code (`f14aff6`); `wa-copy-button` is the path if copy UX returns | — |
| — | `home/About.tsx` | ✅ **REMOVED** (`757e657`) — drop from the inventory | — |
| — | `src/custom-elements.d.ts` | ✅ **REMOVED** — stale JSX intrinsic tags (`app-status`, `drawer-container`) dropped; typing now comes from each element's `HTMLElementTagNameMap` augmentation | `88a47bd`, `8ea711b` |

**Net progress on the component migration itself (Phases 1–6): minimal.** The React
surface is essentially unchanged — this period bought *foundation quality*, not converted
screens. That was the right order, and Phases 1–3 can now start on solid ground.

---

## 1. Executive summary

- **130 React `.tsx` files**; **69** import `@mui/material`, **45** import
  `@mui/icons-material`, **18** use `react-icons`, **19** use Formik, **77** touch
  `react-redux`.
- **26 TypeScript Lit elements** in `src/components/keep-elements/`, on a shared
  `KeepElement` base, wrapped for React via `@lit/react`'s `createComponent` in
  `KeepElements.tsx`. Most wrap a `wa-*` element internally. Every one has a unit test.
- **Raw `wa-*` usage in React is still small**: 23 `<wa-icon>`, 7 `<wa-input>`,
  5 `<wa-option>`, 5 `<wa-dropdown-item>`, 4 `<wa-button>`, and 1–2 each of
  `wa-switch`, `wa-dropdown`, `wa-drawer`, `wa-checkbox`, `wa-card`, `wa-callout`,
  `wa-tree`, `wa-tree-item`, `wa-tooltip`, `wa-select`, `wa-details` — 26 files total.
- **The bulk of the UI still maps cleanly to free WebAwesome components** (buttons,
  inputs, checkbox, switch, select, dialog, drawer, tabs, tooltip, card, dropdown/menu,
  alert→callout, spinner, breadcrumb, tree, divider, avatar, badge, radio, textarea,
  **page**).
- **The hard cases narrowed, and one got harder.** `<wa-page>` turned out to be free
  (removing report 03's licensing gate), but **WebAwesome ships no data grid and no date
  picker at any tier** — so those two are custom-or-third-party, full stop. Monaco is
  solved in principle (the element exists) and just needs wiring. Formik (19 files) is
  unchanged: a state library, not a widget.
- **Consistency debt is mostly paid.** What remains: the four-way button duplication and
  the per-component hardcoded colors, both of which are cheap and both of which block
  report 03's token work.

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
- **Events → React callbacks:** `KeepCheckbox` maps `{ onChange: 'change' }`, and
  `KeepMonacoEditor` now does the same. All other elements rely on the `KeepElement.emit()`
  contract plus plain DOM listeners. Adding an `events` map per element is the remaining
  polish.
- **Registration:** each file self-registers via `@customElement('keep-…')` as an import
  side effect. `src/index.tsx` registers WebAwesome and sets the asset base path.
- **Typing:** each element file augments `HTMLElementTagNameMap`, so `document.querySelector`
  and `document.createElement` are typed. The old `any`-typed `src/custom-elements.d.ts`
  is gone.

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
per-component dark-mode overrides can be consolidated — is **not yet used**. That is the
hook report 03's token work should land on.

### 2.3 How Lit components receive Redux state

Unchanged and still correct: Redux state is read in **React containers** and passed
**down as properties**; web components dispatch back via `CustomEvent`s. The elements are
Redux-agnostic — none imports the store. Keep enforcing this: it is what makes report 04's
`StoreController` swap mechanical rather than a rewrite.

### 2.4 Remaining bridge polish

1. Add an explicit `events` map in `KeepElements.tsx` for every element that emits, so
   React consumers get typed `on*` callbacks instead of manual `addEventListener`.
2. Finish standardising outbound events on `emit()` — `keep-drawer` still takes a
   `closeFn` **property** rather than emitting.
3. Fix the `keep-source` / `keep-source-tree` tag inversion (§2.1).

---

## 3. MUI → WebAwesome mapping table

Legend: **Free** = ships in the npm package · **Pro** = requires a Web Awesome Pro license
· **None** = no WebAwesome component exists in any tier · **Custom** = author a Lit
component · **CSS/util** = layout/util, handled in report 03.

Verified against `@awesome.me/webawesome@3.10.0`. The Pro set is exactly:
`wa-combobox`, `wa-file-input`, `wa-toast`/`wa-toast-item`, `wa-sparkline`, the chart
family, and the video family.

| MUI (and where) | Target | Tier | Notes |
|---|---|---|---|
| `Button`, `IconButton`, `ButtonBase`, `Link`(as action) | `wa-button` (icon-only = `wa-icon` in `start` slot) | Free | Already wrapped as `keep-button`. `appearance` = accent/outlined/filled; `variant` = brand/neutral/success/danger. |
| `TextField` (text) | `wa-input` | Free | Wrapped as `keep-input-text`. |
| `TextField` (`multiline`) | `wa-textarea` | Free | ✅ confirmed present in 3.10. No `keep-*` wrapper yet — author one. |
| `TextField` (`type=number`) | `wa-number-input` | Free | Stepper built-in. |
| password field / `Visibility` toggle | `wa-input type="password" password-toggle` | Free | Wrapped as `keep-input-password` (custom toggle today; can use the built-in). |
| `Checkbox` | `wa-checkbox` | Free | Wrapped as `keep-checkbox` (the one element with an `events` map). |
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
| `SvgIcon` + `@mui/icons-material` + `react-icons` | `wa-icon` | Free | 45 + 18 files. **See report 03 §6.4** — a base64 SVG registry (`src/styles/app-icons.ts`) and `@fortawesome/fontawesome-free` have since landed, changing the approach. |
| `Box`/`Grid`/`Stack`/`Paper`/`Container` | `wa-grid`/`wa-cluster`/`wa-stack`/`wa-flank` + plain `div` | CSS/util | **Deferred to report 03.** `Box` appears 148×. |
| `CssBaseline` / `ThemeProvider` / `@mui/material/styles` | `webawesome.css` + WA theme tokens | CSS/util | **Deferred to report 03.** |
| `useMediaQuery` | native `matchMedia` | n/a | Behaviour, not markup. |
| `Table` family | **Custom Lit table** (semantic `<table>` styled with WA tokens) | **None** | No WA data table in any tier. `AppsTable`, `ConsentsTable`, `AgentsTable`, `FormsTable`, `ViewsTable`, `ColumnDetails`. |
| `List` family | **Custom Lit list** (`wa-stack` + slots) | **None** | Nav lists: `SideNav`, `MobileSidebar`, `OptionList`, `ListRoles`. |
| `ClickAwayListener`/`Fade`/`Slide`/`Collapse` | built-in WA dismissal + `wa-animation`/CSS | Free/CSS | Dropdown/popover handle outside-click & transitions natively. |
| `InputAdornment` | `wa-input` `start`/`end` slots | Free | Search fields, password toggles. |
| `DatePicker`/`LocalizationProvider` (`@mui/x-date-pickers`) | **No WA equivalent, any tier** | **None** | See §5.2. `AppFilterContainer`, `ConsentFilterContainer`. (`wa-time-input` exists — time only.) |
| `DataGrid` (`@mui/x-data-grid`) | **No WA equivalent, any tier** | **None** | See §5.1 — biggest risk. |
| Monaco `Editor` (`@monaco-editor/react`) | **`keep-monaco-editor`** ✅ authored | Custom | See §5.3 — needs wiring into `FormsContainer`. |
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
| `ScriptEditor.tsx` | stay (Monaco-adjacent) | L | `wa-details` for expand/collapse; code editing — see §5.3. |
| `SingleFieldContainer.tsx` | wa (`wa-button`+`wa-icon`) | S | |
| `TabsAccess.tsx` (1,007 LOC) | wa (`wa-tab-group`) + `wa-button` | L | Formik + tabs + add/delete. **Has a test.** |
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
| `EditView.tsx` (618 LOC) | stay | L | **Has a test.** Complex. |
| `FormsContainer.tsx` (830 LOC) | stay → **wire `keep-monaco-editor`** | L | §5.3 — the editor swap is now unblocked. Tabs → `wa-tab-group`. |
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
| `home/Homepage.tsx` / `HomeElement.tsx` | stay→css | M | Shell + `useMediaQuery`. |
| ~~`home/About.tsx`~~ | ✅ **deleted** | — | Removed in `757e657`. |
| `home/sections/Section.tsx` / `Tip.tsx` | keep card (`wa-card`) | S | |
| `login/LoginPage.tsx` (657 LOC) | wa (`wa-input`/`wa-button`) | L | Formik + Grid + theme toggle; entry screen. |
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
`keep-input-text` · `keep-monaco-editor` · `keep-nsf-card` · `keep-schema-status` ·
`keep-source` *(file: `keep-source-header.ts`)* · `keep-source-tree` *(file: `keep-source.ts`)* ·
`keep-switch` · `keep-textform` · `keep-textform-array` · `keep-tooltip`.

Plus the non-element base class `keep-element.ts` and the bridge `KeepElements.tsx`.

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

### 5.3 **Monaco editor** — ✅ element authored, ⚠️ not wired

`src/components/keep-elements/keep-monaco-editor.ts` (538 lines) now exists and implements
this section's recommendation, with more besides:

- Bundles `monaco-editor` as **ESM** (plus `editor.worker`, `json.worker`, `ts.worker` via
  Vite's `?worker` imports) instead of the AMD loader.
- Theme is generated from live WebAwesome tokens — `src/services/editor-theme.ts`
  (`buildEditorTheme`, `EDITOR_TOKENS`), `wa-color.ts`, `wa-typography.ts` — so the editor
  re-colors with the design system instead of the two hardcoded `json-light`/`json-dark`
  JSON themes.
- Integrates `prettier/standalone` for formatting.
- Exported as `KeepMonacoEditor` with `events: { onChange: 'change' }`.

**Remaining work, in order:**

1. 🔴 **Fix the fallout it caused.** The top-level `import * as monaco` breaks 4 test
   suites, and the element has no test, breaching the coverage gate — see report 01 §0.
   Make the Monaco import dynamic (inside `firstUpdated()`); that fixes tests *and*
   code-splits ~6 MB out of the entry chunk.
2. 🔴 **Move `prettier` to `dependencies`** — it is imported by shipped code but declared
   as a devDependency (report 00 P0-10).
3. 🟡 **Wire `FormsContainer.tsx`** to `<KeepMonacoEditor>`; move its
   `defineTheme('json-light'/'json-dark')` logic to `editor-theme.ts`;
   `handleEditorDidMount` becomes `firstUpdated`.
4. 🟡 **Then** drop `@monaco-editor/react` + `@monaco-editor/loader` and delete the
   already-disabled `postinstall` copy step (report 00 P2-9).
5. 🟡 Do the same for `access/ScriptEditor.tsx`.

Effort for 1–2: **S**. For 3–5: **M**.

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
- **Icons**: see report 03 §6.4 — the approach changed materially (a base64 SVG registry
  plus `@fortawesome/fontawesome-free` now exist in-tree).

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
   `variant`/`appearance`, update `KeepElements.tsx`, and migrate the ~57 consumers.
   Doing this **before** report 03's tokenization avoids tokenizing three components that
   should not exist. Effort **M**.
3. ✅ **Repeated CSS imports.** `webawesome.css` is imported exactly once
   (`src/index.tsx`); components import only the specific `wa-*` element modules they
   render.
4. ✅ **Event contract.** `KeepElement.emit()` gives one composed, bubbling `CustomEvent`
   pattern. 🟡 Residual: `keep-drawer` still takes a `closeFn` **property**; only 2 of 26
   elements declare an `events` map in `KeepElements.tsx`.
5. 🔴 **Ad-hoc dark-mode overrides — still open.** Per-component hardcoded colors persist
   (`keep-button.ts`'s `#f4e9ff` `::part` override; `light-dark(#1e1e2e, …)` in the source
   elements). `KeepElement` was built as the hook for a shared token layer but nothing
   uses it yet. **This is report 03's landing site** — do it there, not per element.
6. ✅ **Registration.** One tag per file, self-registering, all re-exported through
   `KeepElements.tsx`. 🟡 Residual: the `keep-source` / `keep-source-tree` file/tag
   inversion (§2.1).
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

### Phase 0.5 — Pay off the Monaco commit (do this first) — 🔴 NEW
- [ ] Polyfill `document.queryCommandSupported` in `test/setupTests.ts` (report 01 §0.1). **S**
- [ ] Test `keep-monaco-editor` or justify excluding it (report 01 §0.2). **S–M**
- [ ] Make the Monaco import dynamic; move `prettier` to `dependencies`. **S**

### Phase 1 — Presentational leaves & feedback (low risk, high volume)
- [ ] Loaders/spinners/progress → `wa-spinner`/`wa-progress-bar`/`wa-skeleton`.
- [ ] Headings/empty states/`Footer`/`Section`/`Tip` → small Lit elements + `wa-card`.
- [ ] `wa-divider`, `wa-avatar`, `wa-badge`; begin the `wa-icon` sweep (report 03 §6.4).

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
- [ ] Wire `keep-monaco-editor` → `FormsContainer`, `ScriptEditor`; drop
      `@monaco-editor/*`. **(§5.3)**
- [ ] Native `wa-input type="date"` → `AppFilterContainer`, `ConsentFilterContainer`. **(§5.2)**
- [ ] DataGrid screens per the chosen strategy → `Groups`, `GroupForm`, `PeopleCRUD`,
      `GroupMembers`, `PeopleSelector`. **(§5.1)**
- [ ] App shell, routers, `ThemeProvider`/`CssBaseline` removal — final sequencing in
      **report 04**.

**Dependency notes:** Phase 5 depends on Phase 2 (controls) + Phase 3 (dialogs/drawers).
Phase 6 is independent of the rest but gated by the Phase 0 strategy decisions. Layout and
token conversions run in parallel throughout per **report 03** — with one new ordering
constraint: **do §6.2 (button consolidation) before report 03's P3 tokenization.**
