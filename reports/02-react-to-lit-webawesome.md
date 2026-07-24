# Report 02 — React → Lit / WebAwesome Migration

**Scope:** Map every React component under `src/components/**` (plus top-level `App.tsx`, `Views.tsx`, `Footer.tsx`) to a migration target: an existing hand-written `lit-*` component, a real WebAwesome `wa-*` component, a **new** Lit component to author, or **KEEP** (leave on React/MUI for now). No source code was changed to produce this report.

**Companion reports (cross-reference):**
- `reports/03-wa-page-and-design-tokens.md` — layout primitives (`Box`/`Grid`/`Stack` → `wa-*` CSS utilities), theming, design tokens, dark mode, CSP. All "layout only" and "token/theme" concerns are deferred there.
- `reports/04-remove-react.md` — final sequencing of the React removal (the "react-ectomy"). This report keeps the component-level detail; report 04 owns the end-state ordering and Redux-removal plan.

**WebAwesome version:** `@awesome.me/webawesome` `^3.6.0` (already a dependency). Every `wa-*` name used below was verified against the bundled `webawesome` skill component list. **Pro-only** components are flagged explicitly — the project currently has no Pro entitlement wired up, so Pro targets are *proposals contingent on a license*, not free drop-ins.

---

## 1. Executive summary

- **~84 React `.tsx` files**, **70** import `@mui/material`, **47** import `@mui/icons-material`, **18** use Formik, **85** touch `react-redux`.
- **27 hand-written Lit components** already exist in `src/components/lit-elements/*.js` (plain JS), wrapped for React via `@lit/react`'s `createComponent` in `LitElements.tsx`. Most already wrap a `wa-*` element internally. Plus one standalone web component: `src/components/webcomponents/copyable-text.js`.
- **The bulk of the UI maps cleanly to free WebAwesome components** (buttons, inputs, checkbox, switch, select, dialog, drawer, tabs, tooltip, card, dropdown/menu, alert→callout, spinner, breadcrumb, tree, divider, avatar, badge, radio).
- **Four hard cases have no free `wa-*` equivalent** and drive nearly all the risk: **MUI X DataGrid** (5 files), **MUI X Date Pickers** (2 files), **Monaco editor** (1 file), and **Formik** (18 files — a state library, not a widget). MUI **plain `Table`** and **`List`** families also have no direct free `wa-*` and need custom Lit or KEEP.
- **Consistency debt:** existing lit-elements are untyped `.js`, duplicate the same button four ways (`lit-button`, `lit-button-yes/no/neutral`), and re-import `webawesome.css` per component. Recommendation: author all future/converted components in **TypeScript with `lit` decorators**, on a shared base class + token file, with a single registration entry point.

---

## 2. Interop & state during migration (the bridge in use today)

### 2.1 `@lit/react` wrapper pattern
`src/components/lit-elements/LitElements.tsx` is the single interop surface. It imports each Lit class and calls `createComponent({ tagName, elementClass, react: React })`, exporting a PascalCase React component (`LitButton`, `LitCheckbox`, `LitDrawer`, …). React code imports these wrappers and uses them as ordinary JSX elements. This is the **canonical bridge** and should remain the only place Lit classes are adapted to React.

Key facts observed:
- **Props → attributes/properties:** `createComponent` forwards React props onto the custom element as properties. Lit classes declare `static properties = { … }` (e.g. `lit-button` has `variant`, `disabled`, `outline`, `pill`, `src`).
- **Events → React callbacks:** only `LitCheckbox` currently declares an `events` map (`{ onChange: 'change' }`). Other components rely on plain DOM listeners or slotted children. `lit-drawer` wires `@wa-after-hide` to a `closeFn` *property* passed from React rather than an event — an inconsistency worth standardizing.
- **Registration:** each Lit file calls `customElements.define('lit-…', Class)` as a side effect of import. `src/index.tsx` separately registers WebAwesome and sets the asset base path via `setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/…')` and imports `webawesome.css` + `src/styles/lit-overrides.css`.
- **Raw custom elements:** `src/custom-elements.d.ts` declares a few untyped intrinsic tags (`app-status`, `copyable-text`, `drawer-container`) for direct JSX use without a wrapper.

### 2.2 How Lit components receive Redux state today
Redux state is **read in React containers** and passed **down as props** to the Lit wrapper (the "React container → web component props" pattern). Web components dispatch **back** via DOM `CustomEvent`s (e.g. `lit-checkbox` re-emits a composed `change` event; `lit-drawer` invokes a passed-in `closeFn`). The web components themselves are Redux-agnostic — they never call `useSelector`/`dispatch`. This is the right shape and should be the enforced contract.

### 2.3 Recommended consistent bridge (for the migration)
1. **Keep `LitElements.tsx` as the sole adapter**; add every new Lit tag there with an explicit `events` map so React gets typed `on*` callbacks instead of manual `addEventListener`.
2. **Contract: web components stay stateless w.r.t. Redux.** Containers select state and pass primitives/objects as properties; components emit `CustomEvent`s upward. Do **not** import the store inside Lit elements — that would make the eventual React removal (report 04) harder, not easier.
3. **Standardize event naming**: emit `wa-`-style or plain semantic events (`change`, `input`, `submit`, `close`) consistently; stop mixing "pass a `closeFn` property" with "listen for an event."
4. **Type the boundary:** generate/author `.d.ts` for each custom element (replace the `any`-typed `custom-elements.d.ts`) so both JSX-direct and wrapped usage are type-checked.

---

## 3. MUI → WebAwesome mapping table (verified against the skill)

Legend: **Free** = free `wa-*`; **Pro** = requires WebAwesome Pro license; **Custom** = author a Lit component (no `wa-*` fit); **CSS/util** = layout/util, handled in report 03.

| MUI (and where) | Target | Tier | Notes |
|---|---|---|---|
| `Button`, `IconButton`, `ButtonBase`, `Link`(as action) | `wa-button` (icon-only = `wa-icon` in `start` slot) | Free | Already wrapped as `lit-button`. `appearance` = accent/outlined/filled; `variant` = brand/neutral/success/danger. |
| `TextField` (text) | `wa-input` | Free | `label`, `hint`, `appearance`, `placeholder`, `type`. Wrapped as `lit-input-text`. |
| `TextField` (`multiline`) | `wa-textarea` | Free | No lit wrapper yet — author one. |
| `TextField` (`type=number`) | `wa-number-input` | Free | Stepper built-in. |
| password field / `Visibility` toggle | `wa-input type="password" password-toggle` | Free | Wrapped as `lit-input-password` (custom toggle today; can use built-in). |
| `Checkbox` | `wa-checkbox` | Free | Wrapped as `lit-checkbox` (has event quirks — see §6). |
| `Switch` | `wa-switch` | Free | Wrapped as `lit-switch`. |
| `Select` + `MenuItem` | `wa-select` + `wa-option` | Free | Wrapped-ish via `lit-dropdown`. |
| `Autocomplete` (`@mui/material`, in `DropdownFormulaEngine`) | `wa-combobox` | **Pro** | Free fallback = existing custom `lit-autocomplete`. Flag. |
| `Menu` + `MenuItem` (action menu) | `wa-dropdown` + `wa-dropdown-item` | Free | Wrapped as `lit-dropdown`. Used in `ActivateMenu`, `QuickConfigForm`, `ScopeForm`, `DetailsSection`, `IconDropdown`, `CardViewOptions`. |
| `Dialog` | `wa-dialog` | Free | Lit split into `lit-dialog-header/content/actions` + `lit-api-error-dialog`. |
| `Drawer` (`@mui/material/Drawer`, in `ConsentFilterContainer`) | `wa-drawer` | Free | Wrapped as `lit-drawer`. |
| `Tabs` + `Tab` | `wa-tab-group` + `wa-tab` + `wa-tab-panel` | Free | Used in `FormsContainer`, `FieldDndContainer`. No lit wrapper yet. |
| `Tooltip` | `wa-tooltip` | Free | Wrapped as `lit-tooltip`. |
| `Card`/`CardContent`/`CardActionArea`/`CardMedia` | `wa-card` (header/footer/media slots) | Free | Existing `lit-default-card`, `lit-nsf-card`, `SlimDatabaseCard`, `home/sections/Tip`. |
| `Alert` + `AlertTitle` | `wa-callout` | Free | Wrapped as `lit-alert`. |
| `Snackbar` (+ `Slide`) / toaster | `wa-toast` / `wa-toast-item` | **Pro** | Free fallback = keep custom `Notification`/`SnackbarToaster` (React) or author a Lit toaster. Flag. |
| `CircularProgress` | `wa-spinner` | Free | `DeleteDialog`, `DetailsSection`, `FormsContainer`. |
| `LinearProgress` (loading) | `wa-progress-bar` | Free | `APILoadingProgress`, loaders. |
| `Breadcrumbs` | `wa-breadcrumb` + `wa-breadcrumb-item` | Free | `BreadcrumbRouter`. |
| `Divider` | `wa-divider` | Free | `SideNav`, `DatabaseSearch`, `ListRoles`. |
| `Avatar` | `wa-avatar` | Free | `ListRoles`. |
| `Radio` + `RadioGroup` | `wa-radio` + `wa-radio-group` | Free | Access-mode forms. |
| `Rating` | `wa-rating` | Free | (Not currently used.) |
| `Accordion` / `Collapse`+`ExpandMore` disclosure | `wa-details` | Free | `ConsentItem`, `DetailsSection`, `ScriptEditor` expand/collapse. |
| `Popper` / `Popover` | `wa-popover` or `wa-popup` | Free | `ProfileMenu`, `ProfileMenuDialog`. |
| `TreeView` / `TreeItem` (`@mui/x-tree-view`) | `wa-tree` + `wa-tree-item` | Free | Good free fit for `FileContentsTree`, `SchemaContentsTree`. |
| `SvgIcon` + `@mui/icons-material` + `react-icons` | `wa-icon` (Font Awesome) | Free | Large but mechanical icon migration; 47 files use MUI icons, 18 use react-icons. Verify each glyph has an FA equivalent. |
| `Box`/`Grid`/`Stack`/`Paper`/`Container` | `wa-grid`/`wa-cluster`/`wa-stack`/`wa-flank` + plain `div` | CSS/util | **Deferred to report 03.** |
| `CssBaseline` / `ThemeProvider` / `@mui/material/styles` | `webawesome.css` + WA theme tokens | CSS/util | **Deferred to report 03.** |
| `useMediaQuery` | native `matchMedia` (keep JS) | n/a | Not a component; behavior, not markup. |
| `Table`/`TableRow`/`TableCell`/`TableHead`/`TableBody`/`TableContainer`/`TablePagination`/`TableFooter` | **Custom Lit table** (semantic `<table>` styled with WA tokens) | Custom | No free `wa-*` data table. `AppsTable`, `ConsentsTable`, `AgentsTable`, `FormsTable`, `ViewsTable`, `ColumnDetails`. |
| `List`/`ListItem`/`ListItemButton`/`ListItemText`/`ListItemIcon`/`ListItemAvatar` | **Custom Lit list** (`wa-stack` + slots) | Custom | No direct `wa-*`. Nav lists: `SideNav`, `MobileSidebar`, `OptionList`, `ListRoles`. |
| `ClickAwayListener`/`Fade`/`Slide`/`Collapse` | built-in WA dismissal + `wa-animation`/CSS | Free/CSS | Dropdown/popover handle outside-click & transitions natively. |
| `InputAdornment` | `wa-input` `start`/`end` slots | Free | Search fields, password toggles. |
| `DatePicker`/`LocalizationProvider` (`@mui/x-date-pickers`) | **No free equivalent** | Pro/Custom | See §5. `AppFilterContainer`, `ConsentFilterContainer`. |
| `DataGrid` (`@mui/x-data-grid`) | **No free equivalent** | Pro/Custom | See §5 — biggest risk. |
| Monaco `Editor` (`@monaco-editor/react`) | **No WA editor** | Custom | See §5. `FormsContainer`. |
| Formik (`formik`) | **Not a widget** — form-state strategy | Custom | See §5. 18 files. |

---

## 4. Component inventory (by domain)

Target key: **[wa]** = replace with a `wa-*` (see §3) · **[lit]** = an existing `lit-*` wrapper already fits · **[new-lit]** = author a new Lit component · **[keep]** = stay on React/MUI for this phase (hard case / container-heavy) · **[css]** = mostly layout, see report 03. Effort: **S** ≤ half-day · **M** ~1–2 days · **L** multi-day / risk.

### Top-level
| React file | Target | Effort | Notes |
|---|---|---|---|
| `src/App.tsx` | keep → later [css] | M | Router + `ThemeProvider`/`CssBaseline` + Redux bootstrap. Theming moves to report 03; app shell is one of the last to leave React (report 04). |
| `src/Views.tsx` | keep | M | Route composition; React Router. Keep until late. |
| `src/Footer.tsx` | new-lit | S | Presentational — easy early Lit conversion. |

### access/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `AccessContext.tsx` | keep | — | React context/state, not UI. |
| `AccessMode.tsx` | keep→wa | M | `useMediaQuery` + composition. |
| `AddModeDialog.tsx` | lit (`lit-dialog-*`) + `wa-input` | M | Dialog + TextField + Formik. |
| `FieldContainer.tsx` | wa (`wa-input`/`wa-select`) | M | MenuItem/TextField/HelpCenter icon. |
| `FieldDndContainer.tsx` | wa (`wa-tab-group`) | L | Drag-and-drop + Tabs; DnD needs a plan. |
| `Fields.tsx` | new-lit (list) + `wa-input` | M | List/ListItem + search. |
| `ModeCompare.tsx` | wa | M | Search + compare UI. |
| `ScriptEditor.tsx` | keep (Monaco-adjacent) | L | Expand/collapse (`wa-details`) but code editing — see §5. |
| `SingleFieldContainer.tsx` | wa (`wa-button`+`wa-icon`) | S | Add/remove field row. |
| `TabsAccess.tsx` | wa (`wa-tab-group`) + `wa-button` | L | Formik + tabs + add/delete. |
| `TestForm.tsx` | wa (`wa-input`/`wa-checkbox`) | M | Formik form. |

### applications/ (+ kanban/)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `Applications.tsx` | keep | M | Page container. |
| `ApplicationContext.tsx` | keep | — | Context. |
| `AppForm.tsx` | wa (`wa-input`, `wa-button`, dialog) | L | Formik-heavy form. |
| `AppItem.tsx` | lit card + wa | M | Formik. |
| `AppStack.tsx` | css/new-lit | M | Formik + layout. |
| `AppSearch.tsx` | wa (`wa-input` + search icon) | S | Search field. |
| `AppsTable.tsx` | new-lit (table) | L | MUI `Table` family + Formik. |
| `AppFilterContainer.tsx` | keep (date picker) | L | `@mui/x-date-pickers` — see §5. |
| `ConsentsContainer.tsx` | wa | M | |
| `DeleteApplicationDialog.tsx` | lit (`lit-dialog-*`) | S | Confirm dialog. |
| `FormDrawer.tsx` | lit (`lit-drawer`) | M | Formik + drawer. |
| `kanban/AppCard.tsx` | lit card + `wa-button` | M | Icons + Formik. |
| `kanban/ConsentItem.tsx` | wa (`wa-details`) | M | Expand/collapse. |
| `kanban/Consents.tsx` | wa | M | Close/expand icons. |
| `kanban/ConsentsTable.tsx` | new-lit (table) | L | MUI `Table` family. |
| `kanban/Kanban.tsx` | keep | L | Board layout + Formik + DnD. |

### commons/ (cardviews, dropdowns, wrappers)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `cardviews/CardViewOptions.tsx` | wa (`wa-dropdown`) | S | View switcher. |
| `cardviews/displays/schemas/*` (5 views + styles) | lit (`lit-default-card`/`lit-nsf-card`) | M each | Alphabetical/Cards/Default/Multi/Stacks views; several already import lit wrappers. |
| `cardviews/displays/scopes/*` (5 views + styles) | lit cards | M each | Mirror of schemas views. |
| `IconDropdown.tsx` | wa (`wa-dropdown`) | S | |
| `Wrappers.tsx` | css | S | Layout wrappers → report 03. |
| `ZeroResultsWrapper.tsx` | new-lit / css | S | Empty-state presentational. |

### consents/
| `ConsentFilterContainer.tsx` | keep (date picker) | L | `@mui/material/Drawer` (→`wa-drawer`) but `@mui/x-date-pickers` blocks it — see §5. |

### database/ (+ settings/, views/)
| React file | Target | Effort | Notes |
|---|---|---|---|
| `AddImportDialog.tsx` | lit dialog + wa | M | Formik + dialog. |
| `DatabaseSearch.tsx` | wa (`wa-input`, `wa-divider`, `wa-dropdown`) | M | Search + filter. |
| `FileContentsTree.tsx` | wa (`wa-tree`/`wa-tree-item`) | M | `@mui/x-tree-view` → free `wa-tree`. |
| `SchemaContentsTree.tsx` | wa (`wa-tree`/`wa-tree-item`) | M | Same. |
| `QuickConfigForm.tsx` | wa (`wa-input`/`wa-select`/`wa-dropdown`) | L | Formik + Menu + Paper. |
| `QuickConfigFormContainer.tsx` | keep | — | Formik container. |
| `QuickConfigView.tsx` | wa | M | |
| `ScopeForm.tsx` | wa (`wa-input`/`wa-select`) | L | Formik + Menu. |
| `ScopeFormContainer.tsx` | keep | — | Formik container. |
| `settings/sections/Access.tsx` | wa (`wa-switch`) | S | |
| `settings/sections/FormSettings.tsx` | wa | M | |
| `settings/SettingContext.tsx` | keep | — | Context. |
| `views/SlimDatabaseCard.tsx` | lit card | S | `wa-card`. |

### dialogs/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `DeleteDialog.tsx` | lit (`lit-dialog-*`) + `wa-spinner` | S | |
| `DropdownFormulaEngine.tsx` | wa-combobox (Pro) or `lit-autocomplete` | M | `@mui/material` Autocomplete. |
| `FormDialogHeader.tsx` | lit (`lit-dialog-header`) | S | |
| `NetworkErrorDialog.tsx` | lit (`lit-api-error-dialog`) | S | |
| `SnackbarToaster.tsx` | keep or `wa-toast`(Pro) | M | Toast — see §3. |
| `UnsavedChangesDialog.tsx` | lit (`lit-dialog-*`) | S | Has a test. |

### forms/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `ActivateMenu.tsx` | wa (`wa-dropdown`) | S | |
| `ActivateSwitch.tsx` | lit (`lit-switch`) | S | |
| `AgentSearch.tsx` / `FormSearch.tsx` / `ViewSearch.tsx` | wa (`wa-input`+search) | S each | Three near-identical search fields — consolidate into one Lit search component. |
| `AgentsTable.tsx` / `FormsTable.tsx` / `ViewsTable.tsx` | new-lit (table) | L each | MUI `Table` family. |
| `ColumnBar.tsx` | wa/css | M | |
| `ColumnDetails.tsx` | new-lit (table cell) | M | |
| `DetailsSection.tsx` | wa (`wa-details`/`wa-dropdown`/`wa-spinner`) | M | |
| `EditView.tsx` | keep | L | Has a test; complex. |
| `FormsContainer.tsx` | keep (Monaco + tabs) | L | Monaco editor — see §5. Tabs → `wa-tab-group`. |
| `TabAgents.tsx` / `TabForms.tsx` / `TabViews.tsx` | wa (`wa-tab-panel` content) | M each | |

### groups/ · people/ · peopleSelector/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `groups/Groups.tsx` | keep (DataGrid) | L | `@mui/x-data-grid` — see §5. |
| `groups/GroupForm.tsx` | keep (DataGrid) | L | DataGrid + Formik. |
| `people/People.tsx` | keep | M | Page. |
| `people/PeopleCRUD.tsx` | keep (DataGrid) | L | DataGrid + Formik. |
| `people/PeopleForm.tsx` | wa (`wa-input`, password toggle) | M | Formik. |
| `peopleSelector/GroupMembers.tsx` | keep (DataGrid) | L | DataGrid. |
| `peopleSelector/PeopleSelector.tsx` | keep (DataGrid) | L | DataGrid. |

### header/ · sidenav/ · navigation/ · routers/
| React file | Target | Effort | Notes |
|---|---|---|---|
| `header/Header.tsx` | keep→css | M | `useMediaQuery`; shell. |
| `header/MobileHeader.tsx` | wa (`wa-button`+`wa-icon`) | S | |
| `sidenav/SideNav.tsx` | new-lit (nav list) | L | `List`/`ListItemButton` + theme toggle. |
| `sidenav/MobileSidebar.tsx` | new-lit (nav list) | M | |
| `sidenav/OptionList.tsx` | new-lit (list) | S | |
| `sidenav/ProfileMenu.tsx` | wa (`wa-popover`/`wa-dropdown`) | M | Popper + ClickAway. |
| `sidenav/ProfileMenuDialog.tsx` | wa (`wa-popover`) | M | |
| `navigation/NavigationGuardContext.tsx` | keep | — | Context. |
| `routers/*` (`BreadcrumbRouter`, `PageRouters`, `ProtectedRoute`) | keep; `wa-breadcrumb` for breadcrumb | M | React Router — leaves late (report 04). |

### schemas/ · scopes/ · settings/ · home/ · login/ · misc
| React file | Target | Effort | Notes |
|---|---|---|---|
| `schemas/SchemasLists.tsx` | lit cards + wa | M | |
| `scopes/ScopeLists.tsx` | lit cards + wa (`wa-button`+icons) | M | |
| `settings/SettingsPage.tsx` | wa/css | M | |
| `settings/SettingTitle.tsx` / `SubSettingTitle.tsx` | new-lit / css | S | Presentational headings — easy early wins. |
| `settings/Logs.tsx` | keep/wa | M | |
| `settings/account/AccountPage.tsx` | wa (`wa-switch`) | M | |
| `settings/mail/MailSettingsPage.tsx` | wa (`wa-switch`, `wa-input`) | M | |
| `settings/roles/ListRoles.tsx` | new-lit (list) + `wa-avatar`/`wa-divider` | M | |
| `settings/roles/RolesPage.tsx` | wa | M | |
| `home/Homepage.tsx` / `HomeElement.tsx` | keep→css | M | Shell + `useMediaQuery`. |
| `home/About.tsx` | new-lit | S | Presentational. |
| `home/sections/Section.tsx` / `Tip.tsx` | lit card (`wa-card`) | S | `Tip` uses full Card API. |
| `login/LoginPage.tsx` | wa (`wa-input`/`wa-button`) | L | Formik + Grid + theme toggle; entry screen. |
| `login/CallbackPage.tsx` | wa | S | |
| `alerts/Notification.tsx` | keep or `wa-toast`(Pro) | M | Snackbar+Slide. |
| `loaders/PageLoading.tsx` · `loading/APILoadingProgress.tsx` · `loading/GenericLoading.tsx` | wa (`wa-spinner`/`wa-progress-bar`) | S each | Easy early wins. |
| `mail/Mail.tsx` | wa | S | |
| `commons/…` empty states / wrappers | new-lit/css | S | |
| `wrapper/ErrorWrapper.tsx` | keep | S | Error boundary (React-specific API). |
| `flex/index.tsx` | css | S | Layout → report 03. |

### Already-migrated (existing Lit inventory — reference)
`lit-button`, `lit-button-yes/no/neutral`, `lit-input-text`, `lit-input-password`, `lit-checkbox`, `lit-switch`, `lit-dropdown`, `lit-autocomplete`, `lit-drawer`, `lit-dialog-header/content/actions`, `lit-api-error-dialog`, `lit-alert`, `lit-tooltip`, `lit-default-card`, `lit-nsf-card`, `lit-source`, `lit-source-header`, `lit-textform`, `lit-textform-array`, `lit-schema-status`, `lit-app-status`. Plus `webcomponents/copyable-text.js` (candidate to fold into `wa-copy-button`).

---

## 5. Hard cases — no free WebAwesome equivalent

These four items carry ~80% of the migration risk. None can be a mechanical swap.

### 5.1 MUI X **DataGrid** (`@mui/x-data-grid`) — HIGHEST RISK
**Files:** `groups/Groups.tsx`, `groups/GroupForm.tsx`, `people/PeopleCRUD.tsx`, `peopleSelector/GroupMembers.tsx`, `peopleSelector/PeopleSelector.tsx`. Uses `DataGrid`, `GridCellParams`, `GridApi` — sorting, selection, cell rendering, pagination.

**Reality:** WebAwesome has **no free data grid** (a Data Grid exists only in Pro, and even that should be evaluated for feature parity). Options, best to worst-fit:
- **(A) Buy WebAwesome Pro Data Grid** — most consistent with the target design system; cost + parity check required (column virtualization, custom cell renderers, selection API).
- **(B) Third-party web-component grid** — e.g. AG Grid (has a framework-agnostic/vanilla build) or RevoGrid (native web component). Adds a dependency but keeps things off React.
- **(C) Custom Lit grid** — only if grid usage is simple (these five are moderate: selection + custom cells + pagination). Likely under-estimates effort.
- **(D) KEEP on MUI DataGrid longest** — pragmatic: these five screens stay React until a grid decision lands. **Recommended interim.**

**Risk:** picking the grid strategy blocks 5 files and gates the people/groups domain. Decide early even though you migrate it late.

### 5.2 MUI X **Date Pickers** (`@mui/x-date-pickers`)
**Files:** `applications/AppFilterContainer.tsx`, `consents/ConsentFilterContainer.tsx` (`LocalizationProvider` + `AdapterDayjs`). Project already depends on `dayjs`.

**Options:** WebAwesome has no free date picker (Pro only). Simplest free path: **`wa-input type="date"`** (native browser picker) formatted with `dayjs`, or a small **custom Lit date-picker**. For two filter screens, native `type="date"` is likely sufficient. Effort **M**, low risk.

### 5.3 **Monaco editor** (`@monaco-editor/react`)
**Files:** `forms/FormsContainer.tsx` (and adjacent `access/ScriptEditor.tsx`). Uses `@monaco-editor/react` + `@monaco-editor/loader`, custom JSON themes, `postinstall` copies `monaco-editor` into `public/`.

**Reality:** WebAwesome has no code editor (its Pro "rich-text editor" is a WYSIWYG, not a code/JSON editor — not a substitute). **Monaco's core is framework-agnostic**; only the `@monaco-editor/react` wrapper is React-specific. **Recommendation:** author a thin **`lit-monaco` web component** that mounts Monaco via `monaco-editor` core + the existing `@monaco-editor/loader`, exposing `value`/`language`/`theme` properties and a `change` event — mirroring the existing bridge contract. Effort **L**, medium risk (theme + model lifecycle), but no functionality loss.

### 5.4 **Formik** (18 files)
**Reality:** Formik is a **React-only state library**, not a widget — there is no `wa-*` for it. WebAwesome form controls are **form-associated custom elements** with native Constraint Validation (`required`, `pattern`, `setCustomValidity()`, `:state(valid|invalid)`), so once controls are `wa-*`, most of Formik's value/validation plumbing can move to **native form + a light validator** (the project already has `yup`, usable standalone).

**Recommendation:** treat each Formik form as a **container that stays React until its controls are all `wa-*`**, then convert the form to a Lit element using native form submission + `yup` validation. Do **not** try to port Formik into Lit. This is the main reason many form-heavy files are marked **keep** for early phases — they convert *after* their leaf controls do.

### 5.5 Secondary gaps (lower risk)
- **MUI plain `Table`** family (6 files) and **`List`** family (nav, 4 files): no free `wa-*`. Author one shared **`lit-data-table`** and one **`lit-list`/`lit-nav-list`** rather than per-screen tables.
- **Snackbar/Toast**: `wa-toast` is Pro; keep the existing React toaster or author a small Lit toaster.
- **`Autocomplete`**: `wa-combobox` is Pro; free path is the existing `lit-autocomplete`.
- **Icons**: `wa-icon` uses Font Awesome; a handful of MUI/`react-icons` glyphs may lack exact FA matches — audit during conversion.

---

## 6. Consistency issues to fix (do this before scaling up)

The existing `lit-elements/*.js` were clearly written incrementally and carry debt that will multiply if copied:

1. **No types.** All 27 components are plain `.js` with `static properties = {…}`. **Author all new/converted components in TypeScript** using `lit` decorators (`@customElement`, `@property`, `@state`, `@query`) and `.d.ts` for the JSX boundary. Migrate existing ones opportunistically.
2. **Button duplication.** `lit-button` plus `lit-button-yes`, `lit-button-no`, `lit-button-neutral` are four components for one concept. Collapse into a **single `lit-button` with a `variant`/`appearance` prop** (WA already supports brand/neutral/success/danger + accent/outlined/filled). Update `LitElements.tsx` exports accordingly.
3. **Repeated CSS imports.** Several components re-import `@awesome.me/webawesome/dist/styles/webawesome.css` (e.g. `lit-checkbox`, `lit-drawer`) though it's already loaded globally in `index.tsx`. Import it **once**; components should only import the specific `wa-*` element module they render.
4. **Inconsistent event/callback contract.** `lit-checkbox` re-emits `change` (with careful `stopPropagation` to avoid double-firing across the shadow boundary); `lit-drawer` instead takes a `closeFn` **property**. Pick **one** pattern — emit `CustomEvent`s, wire them in `LitElements.tsx`'s `events` map — and apply it everywhere.
5. **Ad-hoc dark-mode overrides.** Per-component hardcoded colors (`#1e1e2e`, `light-dark(...)`, `::part()` brand overrides in `lit-button`) should move to a **shared token layer**. Cross-reference report 03 for the design-token/`lit-overrides.css` consolidation.
6. **Registration scattered.** Each file self-registers via `customElements.define`. Keep that, but add a **single barrel/registration module** so bundling and future tree-shaking are predictable, and so `LitElements.tsx` stays the one adapter.
7. **Shared base class.** Introduce a small `KeepLitElement` base (common tokens, theme wiring, `createRenderRoot` conventions) so components don't each re-declare theme plumbing.

---

## 7. Migration ordering (phased)

Principle: **leaves before containers, controls before forms, data-heavy views last.** A form-heavy container converts only *after* its child controls are `wa-*`; DataGrid/Monaco/date-picker screens go last regardless of size.

### Phase 0 — Foundation (enables everything)
- [ ] Establish TS + decorators + shared base class + token file; add `.d.ts` for custom elements. **(§6)**
- [ ] Consolidate `lit-button*` into one component; standardize the event contract in `LitElements.tsx`. **(§6.2, §6.4)**
- [ ] Single global `webawesome.css` import; per-component modules only. **(§6.3)**
- [ ] Decide the **DataGrid strategy** (§5.1) and the **date-picker approach** (§5.2) now, even though those screens migrate late.

### Phase 1 — Presentational leaves & feedback (low risk, high volume)
- [ ] Loaders/spinners/progress → `wa-spinner`/`wa-progress-bar` (`PageLoading`, `APILoadingProgress`, `GenericLoading`).
- [ ] Headings/empty states/`Footer`/`About`/`Section`/`Tip` → new small Lit + `wa-card`.
- [ ] `Divider`, `Avatar`, `Badge`, `wa-icon` icon sweep (mechanical; audit glyphs).

### Phase 2 — Form controls (the reusable core)
- [ ] Finish `wa-input`/`wa-textarea`/`wa-number-input`, `wa-checkbox`, `wa-switch`, `wa-select`+`wa-option`, `wa-radio-group` wrappers.
- [ ] Consolidate the three search fields (`AgentSearch`/`FormSearch`/`ViewSearch`) into one Lit search component.
- [ ] Convert individual switch/input usages in settings pages.

### Phase 3 — Overlays & disclosure
- [ ] Dialogs → `lit-dialog-*` (`DeleteDialog`, `UnsavedChangesDialog`, `AddModeDialog`, `AddImportDialog`, `DeleteApplicationDialog`).
- [ ] `wa-drawer` (`FormDrawer`, `ConsentFilterContainer`'s drawer).
- [ ] `wa-dropdown`/`wa-popover` menus (`ActivateMenu`, `IconDropdown`, `CardViewOptions`, `ProfileMenu`).
- [ ] `wa-details` disclosures (`ConsentItem`, `DetailsSection`).
- [ ] `wa-tab-group` (`FieldDndContainer`, `TabAgents/Forms/Views`, later `FormsContainer` shell).

### Phase 4 — Cards, trees, lists
- [ ] Card views (schemas/scopes displays) onto `lit-default-card`/`lit-nsf-card`.
- [ ] Trees → `wa-tree`/`wa-tree-item` (`FileContentsTree`, `SchemaContentsTree`) — free, good fit.
- [ ] Author shared `lit-nav-list` → `SideNav`, `MobileSidebar`, `OptionList`, `ListRoles`.

### Phase 5 — Forms (containers, after their controls exist)
- [ ] Convert Formik forms to native form + `yup`: `TestForm`, `PeopleForm`, `AppForm`, `ScopeForm`, `QuickConfigForm`, access forms. **(§5.4)**
- [ ] Author shared `lit-data-table`; migrate `AppsTable`/`ConsentsTable`/`AgentsTable`/`FormsTable`/`ViewsTable`.
- [ ] `login/LoginPage` (entry screen; do once controls are proven).

### Phase 6 — Hard/data-heavy views (last)
- [ ] `lit-monaco` wrapper → `FormsContainer`, `ScriptEditor`. **(§5.3)**
- [ ] Date-picker approach → `AppFilterContainer`, `ConsentFilterContainer`. **(§5.2)**
- [ ] DataGrid screens per chosen strategy → `Groups`, `GroupForm`, `PeopleCRUD`, `GroupMembers`, `PeopleSelector`. **(§5.1)**
- [ ] App shell, routers, `ThemeProvider`/`CssBaseline` removal — hand off final sequencing to **report 04**.

**Dependency notes:** Phase 5 depends on Phase 2 (controls) + Phase 3 (dialogs/drawers). Phase 6 is independent of the rest but gated by the Phase 0 strategy decisions. Layout/token conversions run in parallel throughout per **report 03**.
