# Report 03 — App Layout on `wa-page` + WebAwesome Design Tokens (removing Material Design)

**Scope:** Rebase the application shell (header / side navigation / main content / footer / dialogs) on WebAwesome's `wa-page` and drive all color, spacing, typography, radius, shadow, and focus styling from WebAwesome **design tokens**, retiring the MUI `ThemeProvider`/`createTheme`/`CssBaseline` theme, the `getTheme()` JS color object, and the hardcoded hex values in the Linaria stylesheets.

> **Refreshed 2026-07-27** against branch `new_code` @ `e17010c` (previous refresh:
> `7594672`). Originally written 2026-07-24 against `@awesome.me/webawesome@3.6.0`; the
> dependency is now **3.10.0**.
>
> ### ✅ The blocking gate is gone
> **`<wa-page>` is a FREE component.** Verified directly:
> `node_modules/@awesome.me/webawesome/dist/components/page/page.js` ships in the npm
> package, and the Pro-only set documented in the bundled skill
> (`dist/skills/webawesome/references/choosing-components.md`, "A note on Pro") is exactly
> `wa-combobox`, `wa-file-input`, `wa-toast`/`wa-toast-item`, `wa-sparkline`, the chart
> family and the video family — `wa-page` is not among them.
>
> **Consequence:** the WA Pro licensing go/no-go that gated this whole phase is
> **resolved — no license needed**, and the free-tier CSS-grid fallback in §2.4 is no
> longer the recommended path. It is retained only as an escape hatch.
>
> Standing caveat for the rest of the migration: WebAwesome ships **no data grid and no
> date picker in any tier** — `dist/components/` (66 entries) contains `format-date` and
> `known-date` only. `@mui/x-data-grid` (5 references) has no WA replacement to migrate
> *to*; plan for a non-WA grid or a hand-rolled table, and do not budget that work as
> part of the token migration.
>
> ### ✅ The "CSP blocker" was a misreading — withdrawn
> Earlier revisions of this report (and report 00 P0-2) treated the
> `'disabledContent-Security-Policy'` key in `vite.config.mts:29` as a shipped regression
> and made "re-enable CSP" a prerequisite for `wa-page`. **That framing was wrong.** That
> object configures the **Vite dev server only**; the **production CSP is served from
> `config.json`, outside this repository.** There is nothing to fix in this repo, and CSP
> is *not* a blocker or a prerequisite for adopting `wa-page`. §5 is rewritten
> accordingly: it is now a spec of what the production policy in `config.json` will need,
> to be handed to whoever owns that file. Report 00 has withdrawn P0-2 on the same basis.
>
> ### 🟢 Theming grew a spine (#669, #670)
> `src/services/theme-service.ts` is **new** and is now the single writer for the three
> DOM carriers of appearance; both runtime togglers call it (§3.7). The WA-token readers
> (`wa-color.ts`, `wa-typography.ts`, `editor-theme.ts`) gained **29 unit tests** in #670,
> making "read WA design tokens from JS" a working, tested precedent rather than a
> proposal (§3.6).

**Status:** Design/plan for the **shell**: no layout code has changed — `<wa-page>` is
still **not used anywhere** in `src/`. The **theming substrate** has moved, though: see
§3.6 and §3.7.

**Companion reports (cross-reference, do not duplicate):**
- `reports/02-react-to-lit-webawesome.md` — component-level React→Lit/WebAwesome migration. Non-layout components that read the MUI theme must migrate there **before** the theme provider can be deleted.
- `reports/04-remove-react.md` — end-state where the shell is authored directly in Lit/HTML rather than JSX-hosted custom elements.

---

## 0. Executive summary & key findings

| # | Finding | Status | Impact |
|---|---------|:---:|--------|
| 1 | ~~`<wa-page>` is a Web Awesome **Pro** component~~ → **`<wa-page>` is FREE at 3.10.0** | ✅ **RESOLVED** | The §2.3 skeleton is directly usable. Drop the licensing decision from the critical path; treat §2.4 as a fallback only. |
| 1b | **No `wa-page` in the tree yet.** `<wa-page>` occurrences in `src/`: **0**. | 🔴 open | The shell work in §2 has not started. Everything in §2 is still a plan, not a description. |
| 2 | **The app shell is _not_ built on MUI `AppBar`/`Toolbar`/`Drawer`.** Header, side nav, right panel and footer are hand-rolled **Linaria `styled` + flexbox** (`HomeElement.tsx`, `Header.tsx`, `SideNav.tsx`, `Views.tsx`, `CommonStyles.tsx`). | 🟢 unchanged | Favorable: the shell can be swapped to `wa-page` without untangling MUI layout primitives. The bulk of MUI in the shell is `ThemeProvider`/`CssBaseline` + icons, not structure. |
| 3 | **The brand/primary color is still defined in four places with four different purples:** `KEEP_ADMIN_BASE_COLOR = #5F1EBE` (`config.dev.ts:24`), `--wa-color-brand-* = #7e57c2` (`styles.css:1932-1952`), `--wa-color-brand-50 = #7c5fd9` (`keep-overrides.css:251`, full ramp), dark-mode `#8B6CE0` (`dark-mode.css:9`). | 🔴 open | Consolidate to **one** WA brand scale. Unchanged since the original report except that `lit-overrides.css` is now `keep-overrides.css`. |
| 4 | **`dark-mode.css:9-11` still overrides `--wa-color-brand-600 / -500 / -700`** — Shoelace-era **3-digit** tint names. WebAwesome 3.x uses **2-digit** tints (`--wa-color-brand-05 … -95`). Dead code. | 🔴 open | Delete on migration; fold dark brand into the token theme (§3). |
| 5 | **WebAwesome token scaffolding exists and has grown.** `keep-overrides.css` defines the full `--wa-color-brand-{05..95}` ramp, brand aliases, **`--wa-font-size-scale: 0.85`**, and a `@media (prefers-color-scheme: dark)` brand override. | 🟢 improved | The token system is live; the work is *extending* it to the shell + Linaria, not bootstrapping it. |
| 6 | ~~**CSP is not being sent at all** — a regression that blocks `wa-page`~~ → **the finding was wrong.** `vite.config.mts:29`'s `'disabledContent-Security-Policy'` key configures the **Vite dev server only**; the production CSP comes from **`config.json`, outside this repo**. | ➖ **WITHDRAWN** | Nothing to fix in-repo, and **CSP is not a prerequisite for `wa-page`**. §5 rewritten as a requirements note for whoever owns `config.json`. |
| 6b | ~~`setBasePath` points at **webawesome@3.6.0** while **3.10.0** is installed~~ | ✅ **RESOLVED** (#673) | Both calls **deleted**. `src/index.tsx` now carries a comment explaining why there is none: in WA 3.x the base path feeds only the autoloader, and this app imports its **18** WA components explicitly. Guarded by source scans in `test/services/icon-library.test.ts`. |
| 7 | **The icon situation is _four_ systems.** Three legacy: `@mui/icons-material` (45 files) + `react-icons` (18 files) + **`src/styles/app-icons.ts`** (a 216 KB registry of **86** base64 SVG data URIs, imported by **19** modules), plus **8** `<wa-icon src=…>` markup sites over 13 hand-copied SVGs (a repo-wide grep reports 9 — the ninth is inside `icon-library.ts`'s own header comment). The fourth, **`src/services/icon-library.ts`** (#669), is the intended destination. | 🟡 **improving** | §6.4 rewritten. `icon-library.ts` registers a self-hosted `<wa-icon library="fa">` from `@fortawesome/fontawesome-free` SVGs bundled by Vite (11 glyphs, 11 unit tests) and logs a warning on an unknown name instead of rendering an empty glyph. **That is the template the other three converge on** — the icon plan is no longer speculative. |
| 7b | **Dead weight in `src/styles/`:** `icons.json` (144 KB, 36 entries) and `text-manipulation.css` (6 lines) are imported by **nothing**; two `@fontsource-variable` packages (`quicksand`, `crimson-pro`) are declared dependencies that **no source file imports**. | 🔴 open | Pure deletion (P0.5). `@fortawesome/fontawesome-free` is **no longer** in this list — `icon-library.ts` imports it. |
| 8 | **The WA-token readers are now tested.** `src/services/wa-color.ts` resolves any `--wa-*` color token to concrete sRGB hex (probe element → computed `color` → 1×1 canvas readback); `wa-typography.ts` does the same for font tokens; `editor-theme.ts` maps 16 Monaco color ids onto WA semantic tokens. **29 unit tests** across the three landed in #670. | ✅ **proven** | This is a *working, tested precedent* for "read WA design tokens from JS", not a proposal. Reuse it anywhere JS needs a concrete value (charts, canvas, `<meta name="theme-color">`, third-party widgets) rather than re-reading `getPropertyValue()`, which returns unevaluated `var()`/`color-mix()` chains. §3.6. |
| 9 | **NEW: `src/services/theme-service.ts` is the single writer for appearance.** One module sets all three DOM carriers — `.wa-dark` on `<html>`, `documentElement.style.colorScheme`, `body.dataset.theme` — and **both** runtime togglers call it (`HomeElement.tsx:120`, `LoginPage.tsx:178`). 10 unit tests. | ✅ **done** | Closes the "make the *runtime* toggle set `.wa-dark` too" item that this report has carried since the original. `.wa-dark` is now safe to treat as the canonical dark-mode hook (§3.5). §3.7. |

**Rough surface area (re-measured at `e17010c`):** 69 files import `@mui/material`, 45
import `@mui/icons-material`, 18 import `react-icons`, 69 use `@linaria/react` with
**198 `styled.` usages**, **22** files read `getTheme()` (down from 31), `Box` appears
**148×**. Three `CssBaseline` mounts (`App.tsx`, `HomeElement.tsx`, `LoginPage.tsx`) and
two `ThemeProvider`s (`App.tsx`, `HomeElement.tsx`). On the WebAwesome side: **110**
`--wa-*` custom-property references in `src/`, `webawesome.css` imported exactly **once**
(`src/index.tsx:14`), and **0** `<wa-page>`.

---

## 1. Current layout audit

### 1.1 App shell anatomy (as built today — unchanged)

```
index.html  ── #root  +  pre-React inline <script> that reads localStorage['theme'],
   │                       sets documentElement.style.colorScheme, toggles .wa-dark,
   │                       and sets body[data-theme]        ← already WA-aware
   ▼
index.tsx   ── imports index.css, styles.css, dark-mode.css, webawesome.css (×1),
   │           keep-overrides.css
   │           (no setBasePath — deleted in #673; a comment explains why)
   │           <Provider store>  →  <App/>
   ▼
App.tsx     ── <ThemeProvider theme={createTheme(...)}> <CssBaseline/>
   │             <Router basename="/admin/ui">  authenticated ? HomeElement : LoginPage
   ▼
HomeElement.tsx  ── ***the real shell***  (SECOND, nested ThemeProvider + CssBaseline)
   ├─ <Header/>            (mobile only; desktop logo bar lives in Header too)
   └─ <AppContainer>       Linaria styled.main  { display:flex; overflow-x:hidden }
        ├─ <Notification/>
        ├─ <SideNav/>       Linaria styled.aside, 242px ↔ 57px, gradient background
        ├─ <MobileSidebar/> (mobile)
        ├─ <RightPanel>     Linaria styled.div  width:calc(100% - 241px|50px); padding:0 40px
        │     ├─ .toggle-button  (absolute, hardcoded #5F1FBF)   ← collapse/expand rail
        │     └─ <MainElement = Views/>
        │            └─ <ViewContainer> (Linaria styled.main, height:calc(100vh-23px))
        │                 ├─ PageRouters (breadcrumb/top nav)
        │                 ├─ <Routes> … Homepage / Schemas / Apps / Scopes / AccessMode
        │                 └─ <QuickConfigFormContainer/>  (wa-drawer-based quick config)
        └─ <Footer/>        copyright + build version
```

> **✅ Note — this risk is now closed.** `index.html` toggles `.wa-dark` on `<html>`
> alongside `body[data-theme]` and `colorScheme` at first paint, and since #669 the
> *runtime* toggles do the same through one module: `services/theme-service.ts`
> (`HomeElement.tsx:120` via `applyTheme(themeMode)`, `LoginPage.tsx:178` via
> `applyAppearance(...)`). The "reconcile `body[data-theme]` vs. WA's `.wa-dark`"
> cross-cutting risk is therefore handled at both boot and runtime — see §3.7.

Key regions and where they are styled:

| Region | Component / file | How it is styled today |
|--------|------------------|------------------------|
| Top bar / logo | `components/header/Header.tsx` | Linaria `styled.header`; `height:51px`, `background: getTheme(theme).bodyColor`, logo cell `242/57px`. `z-index:3`; `position:fixed` under 768px. |
| Mobile header | `components/header/MobileHeader.tsx` | Linaria; hardcoded `background:white`, MUI `MenuIcon`/`ChevronLeft`. |
| Side navigation | `components/sidenav/SideNav.tsx` + `styles/CommonStyles.tsx#SideNavContainer` | Linaria `styled.aside` 242px; `background-image: getTheme().sidenav.background` (purple→blue gradient); MUI `List`/`ListItemButton`/`ListItemIcon`/`ListItemText`/`Divider`; MUI icons; `KeepTooltip`. Collapse via `:has(.close)` width transition to 57px. `drawerWidth = 242` in `sidenav/style.ts`. |
| Main content | `Views.tsx#ViewContainer` + `HomeElement.tsx#RightPanel` | Linaria; `height:calc(100vh - 23px)`, `overflow-y:auto`, `padding:0 40px`, `background: getTheme().bodyColor`. |
| Mobile nav drawer | `components/sidenav/MobileSidebar.tsx` | Custom; RightPanel blurs when `open`. |
| Quick-config drawer | `components/database/QuickConfigFormContainer.tsx` | Already a WebAwesome/Lit drawer (`wa-drawer`, styled in `dark-mode.css` via `::part`). |
| Dialogs | `components/dialogs/*`, `CommonStyles.tsx` (`CommonDialog` = MUI `Dialog`) + native `<dialog>` | MUI `Dialog`/`Paper` themed via `dark-mode.css` `.MuiDialog-*` `light-dark()` `!important` rules. |
| Footer | `Footer.tsx` + `styles.css .footer-container` | Plain div. |
| Notifications/toasts | `components/alerts/Notification.tsx`, `dialogs/SnackbarToaster.tsx` | MUI Snackbar + a Lit toast (`keep-alert`). |

### 1.2 Where the theme / colors / spacing come from

1. **MUI theme** — `src/theme.ts` `createTheme({...})`: `palette`, one
   `typography.caption` override, and `components.styleOverrides` for `MuiTooltip,
   MuiBadge, MuiDialogTitle, MuiButton, MuiPaper, MuiListItemIcon, MuiCircularProgress,
   MuiBreadcrumbs, MuiInputBase, MuiTab, MuiFormLabel, MuiSwitch`. Instantiated **twice**
   (`App.tsx`, `HomeElement.tsx`), each with its own `<CssBaseline/>`; `LoginPage.tsx`
   mounts a third `CssBaseline`.
2. **`getTheme()` JS color object** — `src/store/styles/action.ts` returns a nested object
   for `dark | hcl | default`. Read by **22 files** (was 31), mostly inside Linaria
   template literals (`background: ${p => getTheme(p.theme).secondary}`).
3. **Hardcoded hex in Linaria** — `CommonStyles.tsx` (**still 936 LOC**; **44** of the
   repo's **198** `styled.` blocks, plus 10 `styled(MuiComponent)` wrappers) and the
   per-component `styled` blocks in the other 68 files bake in
   `#0F5FDC`, `#F01648`, `#5E1EBE`, `#8B6CE0`, `#3874cb`,
   `KEEP_ADMIN_BASE_COLOR`, radii (`3px/5px/10px`), spacing (`6px 16px`, `padding:0 40px`),
   font sizes (`12/14/16/…/26px`), weights (`300/500/700`). **Plus** the `keep-button-yes/
   no/neutral` elements, which are plain `<button>`s with hardcoded `#0F5FDC`/`#0B4AAE`/
   `#96BCF8` (report 02 §6.2).
4. **Global CSS custom properties** — `styles.css` (2,040 lines) `:root` defines app-local
   tokens with `light-dark()` **and** a stray legacy WA brand override block at
   L1932–1952 (`--wa-color-brand-80/50 = #7e57c2`, `--wa-color-brand-fill-loud`, …).
5. **WebAwesome token overrides** — `keep-overrides.css` (274 lines) defines the full
   `--wa-color-brand-{05..95}` ramp (base `#7c5fd9`), `--wa-color-brand`/`-on` aliases,
   `--wa-font-size-scale: 0.85`, and a `prefers-color-scheme: dark` brand override.
   `dark-mode.css` (468 lines, 54 `.Mui*` rules) sets the **invalid**
   `--wa-color-brand-600/500/700`.
6. **Dark mode** — CSS `light-dark()` + `body[data-theme="dark"]` + the `.Mui*` override
   sheet. The flash-prevention script in `index.html` sets all three carriers at boot and
   **`services/theme-service.ts` sets the same three at runtime** (§3.7). Note the boot
   script is asymmetric — it writes `body.dataset.theme` only on the dark branch — which is
   harmless on a fresh load but means `theme-service` is the only place that *clears* it.
7. **WA design tokens read from JavaScript** — `services/wa-color.ts`,
   `wa-typography.ts` and `editor-theme.ts` resolve `--wa-*` tokens to concrete values for
   Monaco, which cannot consume CSS custom properties. Tested (§3.6).

**Material Design is baked in at:** the two `ThemeProvider`+`CssBaseline` pairs (Roboto,
MD elevation, MD ripple/typography defaults, MD `Dialog`/`Paper`/`Tab`/`Switch`/
`Breadcrumbs` chrome), `theme.ts`'s component overrides, `@mui/icons-material` glyphs, and
the `.Mui*` dark-mode sheet.

---

## 2. Target `wa-page` shell

### 2.1 `wa-page` slot anatomy

`wa-page` scaffolds a full layout from named slots; empty slots render nothing. Slots:
`banner`, `header`, `subheader`, `navigation-header`, `navigation` (a.k.a. `menu`),
`navigation-footer`, `main-header`, (default = main content), `main-footer`, `aside`,
`footer`, plus `navigation-toggle` / `skip-to-content`. `banner`, `header`, `subheader`,
`menu`, and `aside` are **sticky** by default. The `navigation` slot **auto-collapses into
a drawer** below `mobile-breakpoint` (default `768px`); a `[data-toggle-nav]` button (or
the default hamburger in `header`) toggles it. `view="desktop"|"mobile"` is reflected on
the host for responsive CSS. Region widths: `--menu-width`, `--main-width`,
`--aside-width`; measured heights are exposed as `--header-height`, `--banner-height`,
`--subheader-height`.

> ⚠️ **`wa-page` expects to own the viewport** — including the navigation. Do not nest it
> inside another layout container, and let it own the nav rather than wrapping `SideNav`
> in bespoke positioning.

### 2.2 Region mapping — this app → `wa-page`

| Today | `wa-page` slot | Notes |
|-------|----------------|-------|
| `Header.tsx` logo bar + `SnackbarToaster` | `header` | Global top bar. Put the nav hamburger here (default) or use `data-toggle-nav`. |
| `PageRouters` breadcrumb / page title | `subheader` | Sticky breadcrumb row — exactly what `subheader` is for. |
| `SideNav.tsx` (routes list) | `navigation` (`menu`) | Auto-drawer on mobile ⇒ **delete** `MobileSidebar.tsx`, the `open` state, `RightPanel` width math, and the `.toggle-button`. Keep the gradient via `::part(menu)`. |
| Sidenav logo + "HCL Domino REST API" title | `navigation-header` | Column-stacked by default. |
| Sidenav theme toggle + `ProfileMenu` | `navigation-footer` | Pinned to the bottom of the nav. The toggle keeps dispatching `switchTheme`; the DOM writes stay in `HomeElement`'s `applyTheme(themeMode)` effect (§3.7) — do not re-implement them in the slot. |
| `Views.tsx` `<Routes>` main content | default slot | React Router `<Routes>` mounts here. |
| `QuickConfigFormContainer` (`wa-drawer`) | default slot (or `aside`) | Keep as an overlay drawer; or promote to `aside` if it should dock. |
| `Footer.tsx` | `footer` | Always below the viewport (page becomes scrollable). |
| MUI `Dialog` / native `<dialog>` | `::part(dialog-wrapper)` | `wa-page` provides a `dialog-wrapper` region for modal-like elements. |

Set `mobile-breakpoint="768"` to preserve the current breakpoint and `--menu-width: 242px`
(open). For the collapsed 57px rail, keep an app-level `data-collapsed` attribute and
switch `--menu-width` between `242px`/`57px` — the collapse rail is an app feature
`wa-page` does not model natively, and is **separate** from the mobile drawer.

### 2.3 Copy-pasteable `wa-page` skeleton — ✅ now the recommended path

`index.html` — zero out html/body margins (required by `wa-page`) and add the `wa-cloak`
FOUC guard. Keep the existing theme script; it already sets `.wa-dark`:

```html
<!doctype html>
<html lang="en" class="wa-cloak">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HCL Domino REST API</title>
    <style>
      html, body { min-height: 100%; padding: 0; margin: 0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      /* pre-React theme flash guard — today's index.html (it lives in <body> because it
         touches document.body), with the light branch made symmetric so it mirrors
         services/theme-service.ts#applyAppearance exactly */
      (function () {
        var dark = localStorage.getItem('theme') === 'dark';
        document.documentElement.classList.toggle('wa-dark', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        document.body.dataset.theme = dark ? 'dark' : 'light';
      })();
    </script>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

The shell in JSX (**React 19 renders custom elements natively** — no `@lit/react` wrapper
needed for `wa-page`; `slot=` on plain React elements projects children into the right
region):

```tsx
// AppShell.tsx  (replaces HomeElement's AppContainer/RightPanel/toggle machinery)
import '@awesome.me/webawesome/dist/components/page/page.js';   // FREE at 3.10
import Header from './components/header/Header';
import SideNav from './components/sidenav/SideNav';
import Footer from './Footer';
import Views from './Views';

export default function AppShell() {
  return (
    <wa-page mobile-breakpoint="768" view="desktop">
      <header slot="header" className="wa-split">
        <img className="keep-icon" src="/admin/img/KeepNewIcon.png" alt="HCL Domino REST API" />
        <SnackbarToaster />
      </header>

      <div slot="subheader"><PageRouters /></div>

      <div slot="navigation-header" className="wa-stack wa-align-items-center">
        <img className="keep-icon side-nav-logo-img" src="/admin/img/KeepNewIcon.png" alt="" />
        <span className="wa-heading-s">HCL Domino REST API</span>
      </div>

      <nav slot="navigation"><SideNav /></nav>

      <div slot="navigation-footer" className="wa-stack">
        <ThemeToggle />
        <ProfileMenu />
      </div>

      <Views />                 {/* default slot */}

      <footer slot="footer"><Footer /></footer>
    </wa-page>
  );
}
```

App-level CSS to reproduce today's look with tokens (§3 for values):

```css
wa-page { --menu-width: 242px; --main-width: 1fr; }
wa-page[data-collapsed] { --menu-width: 57px; }
wa-page::part(menu) {
  background-image: var(--keep-sidenav-gradient);
  border-inline-end: var(--wa-border-width-s) solid var(--wa-color-surface-border);
}
wa-page::part(header)    { background: var(--wa-color-surface-default); }
wa-page::part(subheader) { background: var(--wa-color-surface-raised); }
wa-page[view="mobile"]   { --menu-width: auto; }
wa-page[view="desktop"] [data-toggle-nav] { display: none; }
```

**How React content mounts inside `wa-page` — transitional vs. end-state:**
- **Transitional (this phase):** `wa-page` is rendered in JSX; each existing React subtree
  (`SideNav`, `Views`, `Footer`, breadcrumb) is dropped into a `slot`. React continues to
  own everything inside each slot — Redux, Router, MUI-based inner components all keep
  working. Only the *outer* flex scaffolding (`AppContainer`, `RightPanel`,
  `SideNavContainer`, the mobile header/sidebar duplication, the collapse toggle) is
  deleted. `wa-page` uses light-DOM slotting, so React's reconciler and event system are
  unaffected.
- **End-state (report 04):** the shell is authored as static HTML/Lit; React (if retained)
  mounts only into the default slot's content router.

### 2.4 Free-tier CSS-grid fallback — ⚠️ no longer needed

> Retained only as an escape hatch if `wa-page` proves unworkable (e.g. a sticky-behaviour
> conflict, or a production CSP that cannot relax `style-src-attr` — §5.1 item 1).
> **`wa-page` is free — prefer §2.3.** Choosing this path means re-implementing sticky
> logic, the skip link, and the auto height vars by hand for no licensing benefit. Note it
> does **not** dodge the inline-style question entirely: WA form controls and `::part`
> sizing still write inline styles.

```tsx
// AppShell.free.tsx
export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="app-header wa-split">…logo… <SnackbarToaster/></header>
      <div className="app-subheader"><PageRouters/></div>
      <aside className="app-nav wa-desktop-only"><SideNav/></aside>
      <wa-drawer class="wa-mobile-only" placement="start"
                 open={navOpen} onWa-hide={() => setNavOpen(false)}>
        <SideNav/>
      </wa-drawer>
      <main className="app-main"><Views/></main>
      <footer className="app-footer"><Footer/></footer>
    </div>
  );
}
```

```css
.app-shell {
  display: grid;
  grid-template-columns: var(--keep-menu-width, 242px) 1fr;
  grid-template-rows: auto auto 1fr auto;
  grid-template-areas: "header header" "nav subheader" "nav main" "footer footer";
  min-block-size: 100dvh;
}
.app-header    { grid-area: header;    position: sticky; top: 0; background: var(--wa-color-surface-default); }
.app-subheader { grid-area: subheader; position: sticky; background: var(--wa-color-surface-raised); }
.app-nav       { grid-area: nav; background-image: var(--keep-sidenav-gradient);
                 border-inline-end: var(--wa-border-width-s) solid var(--wa-color-surface-border); }
.app-main      { grid-area: main; overflow-y: auto; padding-inline: var(--wa-space-xl); }
.app-footer    { grid-area: footer; }
@media (max-width: 768px) {
  .app-shell { grid-template-columns: 1fr; grid-template-areas: "header" "subheader" "main" "footer"; }
}
```

---

## 3. Design-token mapping (MUI / `getTheme()` / Linaria constants → WebAwesome tokens)

WebAwesome tokens are CSS custom properties prefixed `--wa-`. Semantic colors follow
`--wa-color-{group}-{role}-{attention}` where group ∈ `brand|neutral|success|warning|danger`,
role ∈ `fill|border|on`, attention ∈ `quiet|normal|loud`. Scales follow
`--wa-color-{hue|group}-{05..95}` (two digits). Foundational:
`--wa-color-surface-{raised|default|lowered|border}`, `--wa-color-text-{normal|quiet|link}`,
`--wa-color-focus`, `--wa-color-overlay-{modal|inline}`.

### 3.1 Color

| Current value / source | Role | WebAwesome token |
|------------------------|------|------------------|
| `#5F1EBE` `KEEP_ADMIN_BASE_COLOR` / `#7c5fd9` (`keep-overrides.css`) / `#7e57c2` (`styles.css`) — **consolidate** | Brand / primary | `--wa-color-brand-50` (base) + full `-05..-95` ramp; used via `--wa-color-brand-fill-loud`, `-border-loud`, `-on-loud` |
| Dark brand `#8B6CE0` (`dark-mode.css`) | Brand (dark) | `.wa-dark { --wa-color-brand-50: #8B6CE0; }` (replaces the invalid `-600/-500/-700`) |
| `#3C91FF` `HCL_BASE_COLOR` | Alt brand (hcl skin) | brand ramp in a `.wa-brand-hcl` scope, or `--wa-color-blue-*` |
| `#383838` `textColorPrimary` | Body text | `--wa-color-text-normal` |
| `#757575 / #9e9e9e` secondary text | Muted text | `--wa-color-text-quiet` |
| `#f5f5f5` `bodyColor` | Page background | `--wa-color-surface-default` |
| `white` `secondary`/paper | Raised surface (cards, header, dialogs) | `--wa-color-surface-raised` |
| well/inset backgrounds | Lowered surface | `--wa-color-surface-lowered` |
| `#e6e8f1 / #CFCFCF` borders (light) / `#3a3a4a` (dark) | Border / divider | `--wa-color-surface-border`, `--wa-color-neutral-border-normal` |
| `#0fa068` active indicator, `#82DC73` in-use dot | Success | `--wa-color-success-fill-loud` / `--wa-color-success-60` |
| `#dc1434 / #F01648 / #e53935 / #D6466F` | Danger / delete | `--wa-color-danger-fill-loud` / `--wa-color-danger-60` |
| (none explicit) | Warning | `--wa-color-warning-fill-loud` |
| `#0F5FDC` save / primary-action blue (**also** `keep-button-yes`) | Info-ish action | `--wa-color-blue-50` **or** reuse `--wa-color-brand-*` (WA has no `info` group) |
| MUI focus outline | Focus ring | `--wa-color-focus` (+ `--wa-focus-ring`) |
| sidenav gradient `linear-gradient(180deg,#5E1EBE,#3B91FF,#8CC7F9)` | Nav background | one app var `--keep-sidenav-gradient` built from `--wa-color-brand-40`→`--wa-color-blue-60`→`--wa-color-blue-80` |

### 3.2 Spacing (`--wa-space-*`, rem-based; px at 16px root)

| Current px | Token | | Current px | Token |
|---|---|---|---|---|
| 2px | `--wa-space-3xs` | | 16px (`theme.spacing(2)`, common padding) | `--wa-space-m` |
| 4px | `--wa-space-2xs` | | 24px | `--wa-space-l` |
| 8px (`theme.spacing(1)`) | `--wa-space-xs` | | 32px | `--wa-space-xl` |
| 10–12px | `--wa-space-s` | | 40px (`RightPanel padding:0 40px`) | `--wa-space-2xl` |

Use `wa-gap-*` utility classes on flex/grid containers instead of ad-hoc `margin`/`gap`.

### 3.3 Typography (`--wa-font-*`)

| Current | WebAwesome token | Note |
|---|---|---|
| MUI default (Roboto/Helvetica) | `--wa-font-family-body` (`ui-sans-serif, system-ui`) | System stack; drops the Roboto dependency. |
| 12px / 14px / 16px | `--wa-font-size-xs` / `-s` / `-m` | |
| 18/20/22 → 24/26 | `--wa-font-size-l` / `-xl` / `-2xl` | Non-linear scale — pick nearest; headings can use `wa-heading-*` classes. |
| weight 300 / 400 / 500 / 700 | `--wa-font-weight-light` / `-normal` / `-semibold` / `-bold` | **Note:** WA `--wa-font-weight-bold` = **600**, not 700. Override if the heavier weight must be preserved. |
| line-heights | `--wa-line-height-condensed` / `-normal` / `-expanded` | |

> ⚠️ **`keep-overrides.css` already sets `--wa-font-size-scale: 0.85`**, shrinking every
> WA component's type by 15 % to match the prior Shoelace sizing. Any px→token mapping
> above must be validated *with that scale applied*, or converted sizes will render ~15 %
> smaller than the Linaria literals they replace. Decide early whether to keep the scale
> or re-map sizes at 1.0.
>
> ⚠️ **Two `@fontsource-variable` packages (`quicksand`, `crimson-pro`) are declared
> dependencies but imported nowhere.** Either wire them into `--wa-font-family-*` — they
> would be bundled from `node_modules`, so `font-src 'self'` covers them and the
> `fonts.gstatic.com` entry sketched in §5 stays unnecessary — or drop them (P0.5).

### 3.4 Border radius / shadows / focus

| Current | Token |
|---|---|
| `3px` | `--wa-border-radius-s` |
| `5–6px` | `--wa-border-radius-m` |
| `10px` (cards, panels — very common) | `--wa-border-radius-l` (12px) — closest; or set `--wa-border-radius-l: 10px` |
| `50%` avatars / `9999px` pills | `--wa-border-radius-circle` / `-pill` |
| MUI elevation 1–2 / `box-shadow: 2px 2px 5px lightgray` | `--wa-shadow-s` |
| MUI elevation 4–8 (menus, dialogs) | `--wa-shadow-m` / `--wa-shadow-l` |
| MUI focus outline | `--wa-focus-ring` (+ `--wa-focus-ring-offset`) |

### 3.5 Registering the brand color / custom theme

Consolidate all four purple definitions into a single scoped theme sheet, replacing the
brand blocks currently scattered across `styles.css` (L1932–1952), `keep-overrides.css`
(L244–260), `dark-mode.css` (L9–11) and `config.dev.ts` (L24):

```css
/* src/styles/keep-theme.css  — single source of truth for the brand */
:root {
  --wa-color-brand-95: #f1edfa; --wa-color-brand-90: #e0d7f5;
  --wa-color-brand-80: #c3b3ec; --wa-color-brand-70: #a48ee3;
  --wa-color-brand-60: #8a6fdc; --wa-color-brand-50: #7c5fd9; /* base */
  --wa-color-brand-40: #684db3; --wa-color-brand-30: #523d8c;
  --wa-color-brand-20: #3c2d66; --wa-color-brand-10: #261d40; --wa-color-brand-05: #140e20;

  --keep-sidenav-gradient: linear-gradient(180deg,
     var(--wa-color-brand-40) 10.94%, var(--wa-color-blue-60) 57.29%, var(--wa-color-blue-80) 100%);
}
:root.wa-dark { --wa-color-brand-50: #8B6CE0; --wa-color-brand-60: #9B7EE8; --wa-color-brand-40: #7B5CD0; }
```

Prefer WA's own class hook (`.wa-dark` on `<html>`) over the MUI `data-theme` attribute, so
WA components and app CSS switch together. **This is now cheap to do:** `.wa-dark` is set
at boot by `index.html` *and* at runtime by `services/theme-service.ts` (§3.7), so it is
already the one carrier guaranteed correct in every state. Note the current
`keep-overrides.css` uses `@media (prefers-color-scheme: dark)` (L271) for its dark brand
override, which ignores the in-app theme toggle — consolidate on `.wa-dark` so the manual
switch wins over the OS preference.

### 3.6 Reading tokens from JavaScript — ✅ solved and tested

`src/services/wa-color.ts` already solves the "read a `--wa-*` token in JS" problem
correctly, and the reasoning is worth not re-deriving:

> WA tokens are not hex — they are `var()` chains bottoming out in `color-mix(in oklab, …)`
> or relative color syntax, and `getPropertyValue()` returns that expression
> *unevaluated*. `resolveWaColors()` therefore (1) applies `color: var(<token>)` to a
> hidden probe element and reads the computed `color` longhand, forcing evaluation, then
> (2) paints the result into a 1×1 canvas and reads back sRGB bytes, letting the browser
> do every color-space conversion. Opaque → `#rrggbb`, translucent → `#rrggbbaa`.

`wa-typography.ts` (`resolveWaTypography()`) does the equivalent for font size and family.
`editor-theme.ts` is the consumer that motivated both: it maps **16 Monaco color ids** onto
WA semantic tokens (`EDITOR_COLOR_TOKENS`) — surface, text, brand, neutral, success and
danger fills — and `buildEditorTheme()` folds the resolved values into a Monaco theme,
falling back to a hardcoded light/dark palette for anything that did not resolve. It is
deliberately Monaco-free at runtime so it can be unit-tested in a DOM-only environment.

**All three are now covered by unit tests (#670): 12 for `editor-theme`, 7 for `wa-color`,
10 for `wa-typography` — 29 in total**, including the canvas-unavailable and
unparseable-color paths, the translucent-alpha handling, and probe-element cleanup.

**Why this matters beyond Monaco:** it is a *shipped, tested precedent* that WA design
tokens can be the single source of truth even for consumers that cannot read CSS custom
properties at all. Anywhere else this migration hits the same wall — a canvas widget, a
chart library, `<meta name="theme-color">`, a third-party embed — the answer is to call
these services, not to re-read `getPropertyValue()` by hand and not to re-introduce a JS
color object like `getTheme()`. The trio is the replacement pattern for `getTheme()`, for
the cases where §4's "just emit `var(--wa-*)`" is not available.

### 3.7 One writer for appearance — `services/theme-service.ts` (✅ new in #669)

Appearance is carried by **three** independent bits of DOM state, each with a different
consumer:

| Carrier | Read by |
|---|---|
| `.wa-dark` on `<html>` | WebAwesome components; `keep-monaco-editor`, which derives its Monaco theme from this class via a `MutationObserver` on `<html>`'s `class` |
| `documentElement.style.colorScheme` | native form controls, scrollbars, CSS `light-dark()` |
| `body.dataset.theme` | the app's own `:host-context(body[data-theme="dark"])` rules in the `keep-*` elements, plus `body[data-theme="dark"]` rules in `styles.css`/`dark-mode.css` |

Miss one and the page goes half-dark. `theme-service.ts` exists so that cannot happen: it
exports `toAppearance(themeMode)` (maps the persisted `'dark'`/`'default'` to
`'light' | 'dark'`), `applyAppearance(appearance)` (writes all three, idempotently — which
matters because `MutationObserver` fires on every write, not only on real changes), and the
`applyTheme(themeMode)` convenience wrapper.

Both runtime togglers go through it — `HomeElement.tsx:120` (`useEffect` on Redux
`themeMode`) and `LoginPage.tsx:178` (`useEffect` on local `isDark`, since Redux is not
available pre-login). 10 unit tests. The boot script in `index.html` duplicates the same
three writes to avoid a flash.

**Implications for this report:**

- The long-standing cross-cutting risk "make the runtime toggle set `.wa-dark` too" is
  **closed**. `.wa-dark` can now be adopted as *the* dark-mode hook (§3.5) without a
  transition period where the manual toggle and WA disagree.
- When `body[data-theme]` is eventually retired in favour of `.wa-dark` alone (P3), there
  is exactly **one** function to edit, plus the boot script.
- The boot script's light branch does not write `body.dataset.theme` (it only removes
  `.wa-dark`). Make it symmetric when touching `index.html` for `wa-page` (§2.3) so the
  boot and runtime paths are literally the same three writes.

---

## 4. Linaria migration (replace hardcoded values with WA tokens)

**Goal:** every Linaria `styled` block references `var(--wa-*)` instead of literals or
`getTheme()`, so components inherit the token system and dark mode "just works" through
token flips (no per-component `light-dark()`).

Strategy, in order:

1. **Kill the `getTheme(props.theme)` interpolations first.** **22 files** (down from 31)
   pass `theme={themeMode}` into Linaria only to look colors up at render. Replace each
   `${p => getTheme(p.theme).X}` with the corresponding `var(--wa-color-*)`. Because
   tokens already resolve per color-scheme, the `theme` prop, the `themeMode` Redux read,
   and most `getTheme()` calls can then be deleted:
   ```diff
   - border-right: 1px solid ${(p) => getTheme(p.theme).sidenav.border};
   - background-image: ${(p) => getTheme(p.theme).sidenav.background};
   + border-inline-end: var(--wa-border-width-s) solid var(--wa-color-surface-border);
   + background-image: var(--keep-sidenav-gradient);
   ```
2. **Replace literal hex/px in `CommonStyles.tsx`** (still **936 LOC**, 44 `styled.`
   blocks — the highest fan-out in the repo) per §3.
   `KEEP_ADMIN_BASE_COLOR` → `var(--wa-color-brand-fill-loud)`; `#0F5FDC` →
   `var(--wa-color-blue-50)`; `#F01648` → `var(--wa-color-danger-fill-loud)`;
   `border-radius: 10px` → `var(--wa-border-radius-l)`; `padding: 6px 16px` →
   `var(--wa-space-2xs) var(--wa-space-m)`.
3. **Tokenize the `keep-*` elements at the same time.** Report 02 §6.5 left per-component
   hardcoded colors in place deliberately, waiting for this layer: `keep-button.ts`'s
   `#f4e9ff` `::part` override, the `light-dark(#1e1e2e, …)` literals in the source
   elements, and the plain-`<button>` colors in `keep-button-yes/no/neutral`.
   **Do report 02 §6.2 (collapse the four buttons) *before* this step** so three of those
   components never need tokenizing.
4. **Prefer WA layout utilities over bespoke flex.** Replace hand-rolled `display:flex`
   wrappers with `wa-stack` / `wa-cluster` / `wa-split` / `wa-flank` / `wa-grid` where the
   Linaria block only did flexbox + gap. This deletes rules outright rather than
   re-tokenizing them.
5. **Retire the `styles.css :root` app tokens** in favor of `--wa-*`, or redefine them *as*
   aliases during transition (`--base-color: var(--wa-color-brand-fill-loud)`), so
   existing class-based CSS keeps working while call sites migrate.
6. **Leave `styled(MuiComponent)` blocks** (`CommonDialog = styled(Dialog)`, …) for
   **report 02** — those disappear when the underlying MUI component is replaced;
   re-tokenizing them now is throwaway work. There are **10** such wrappers in
   `CommonStyles.tsx` alone.
7. **Where a token genuinely has to reach JavaScript**, call `resolveWaColors()` /
   `resolveWaTypography()` (§3.6) instead of reviving a `getTheme()`-shaped color object.
   The Monaco theme is the proof this works.

Linaria stays as the authoring tool — it just emits `var(--wa-*)` references. No build
change is required (`@wyw-in-js/vite` extracts to a bundled stylesheet, served from
`'self'`). **Scale check:** 198 `styled.` blocks across 69 files, currently referencing
`--wa-*` in only 110 places repo-wide — most of that surface is still literals.

---

## 5. Content-Security-Policy — ➖ not a blocker; requirements for `config.json`

> ### Correction
> Earlier revisions of this report (and report 00 P0-2, since **withdrawn**) called the
> `'disabledContent-Security-Policy'` key at `vite.config.mts:29` a shipped regression, and
> made "re-enable CSP" a **prerequisite for adopting `wa-page`**. **Both claims were
> wrong.**
>
> - That object is the Vite **dev-server** header map. It affects `localhost` only. It is
>   not built, not shipped, and not what any browser sees in production.
> - The **production CSP is served from `config.json`, outside this repository.** Nothing
>   in this repo controls it.
> - Therefore: **there is nothing to fix in-repo, and CSP does not gate `wa-page`.** Adopt
>   `wa-page` on its own schedule (P2); do not couple it to a CSP change.
>
> What *is* still true is that `wa-page` has real CSP requirements. This section is now a
> **requirements note to hand to whoever owns `config.json`**, not a work item for this
> repo.

The dev-server string in `vite.config.mts` is the best available sketch of the intended
policy, so it is reproduced here as the starting point for the production conversation —
**not** as something to "restore":

```
style-src-attr 'none';
style-src-elem 'self' https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/ 'unsafe-hashes' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
font-src   'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
script-src 'self' 'unsafe-inline' data: gap: … https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
connect-src 'self' data: *;
worker-src 'self' blob:;
```

### 5.1 What the production CSP in `config.json` will need

1. **`style-src-attr` must not be `'none'` once `wa-page` ships.** `wa-page` sets inline
   element styles from JS (`--header-height`, `--banner-height`, `--subheader-height`,
   nav-drawer state); WA form controls and `::part` sizing also write inline styles. If the
   production policy sets `style-src-attr 'none'`, `wa-page` will lay out wrongly.
   **Requirement for `config.json`:** `style-src-attr 'unsafe-inline'` (or an enumerated
   hash set), *before* `wa-page` reaches production. Note the `sha256-47DEQ…` in the sketch
   above is the hash of the **empty string** — it authorizes only empty `<style>`/style
   attributes and carries no useful permission.
2. **No CDN hosts are needed for WebAwesome any more.** The `setBasePath` call to
   `ka-f.webawesome.com` is **gone** (#673) and icons are self-hosted: `services/
   icon-library.ts` registers `<wa-icon library="fa">` against Font Awesome SVGs bundled
   from the `@fortawesome/fontawesome-free` dependency, precisely so the deployment CSP
   does not have to allow a third-party origin. **Requirement:** the
   `cdn.jsdelivr.net` / `ka-f.*` entries in `style-src-elem`, `font-src` and `script-src`
   can be **dropped** — WA assets are all `'self'`. Confirm no `<wa-icon>` still resolves
   through WA's default CDN resolver (see §6.4 — 8 `<wa-icon src=…>` markup sites remain,
   all same-origin or `data:`).
3. **`connect-src`.** The remaining `<wa-icon src="${IMG_DIR}/shoelace/*.svg">` sites fetch
   same-origin SVGs; one uses a `data:` URI. `'self' data:` suffices — the `*` in the
   sketch is far wider than the app needs.
4. **`worker-src 'self' blob:` is load-bearing.** `keep-monaco-editor.ts` instantiates
   Monaco's `editor`/`json`/`ts` workers via Vite's `?worker` imports, which produce blob or
   same-origin worker URLs. **Requirement:** keep this directive in production, or Monaco
   (Source tab, Diff view) breaks.
5. **`script-src 'unsafe-inline'` is currently required** by the pre-render theme
   `<script>` in `index.html` (§2.3, §3.7). If production wants to drop `'unsafe-inline'`,
   that script needs a nonce or hash — a build concern for whoever generates
   `config.json`'s policy, and the one place where a repo change *would* be needed.
6. **Linaria/WA bundled stylesheets** are injected as `'self'` `<style>`/`<link>`, covered
   by `style-src-elem 'self'`. No action.

**Repo-side action: none.** Do not rename the `'disabledContent-Security-Policy'` key —
doing so changes nothing in production and imposes a wide-open policy on `localhost`.

---

## 6. Removing Material Design — sequence

Ordering matters: the theme provider cannot be deleted until nothing reads the MUI theme.

1. **(Report 02, prerequisite) Migrate non-layout MUI components off the theme.** Every
   component relying on MUI palette/`styleOverrides` (`Dialog`, `Paper`, `Tab`,
   `Breadcrumbs`, `Switch`, `Badge`, `Button` text-variants, inputs) must move to WA
   equivalents or plain tokenized elements. Track by grepping `@mui/material` imports
   (**69 files** → 0 in the shell path).
2. **Stand up the shell** (§2.3): introduce `AppShell` on `wa-page`, route existing
   subtrees into slots, delete `AppContainer`, `RightPanel`, `SideNavContainer`,
   `MobileSidebar`, the `MobileHeader` duplication, the `open` collapse state +
   `.toggle-button` (`HomeElement.tsx:68,149,157`), and `drawerWidth`
   (`sidenav/style.ts:7`). **This step no longer waits on CSP** — see §5; hand the
   `style-src-attr` requirement to the `config.json` owner in parallel.
3. **Tokenize Linaria + the `keep-*` elements, retire `getTheme()`** (§4), collapsing the
   four brand definitions into `keep-theme.css` (§3.5) and deleting the invalid
   `--wa-color-brand-600/500/700`.
4. **Swap icons** (§6.4).
5. **Delete the theme layer:** remove both `<ThemeProvider>`s and all **three**
   `<CssBaseline/>` mounts (`App.tsx`, `HomeElement.tsx`, `LoginPage.tsx`), delete
   `theme.ts`, and drop the `.Mui*` dark-mode rules as their components disappear.
6. **Drop MUI dependencies** (`@mui/material`, `@mui/icons-material`, `@mui/x-*`,
   `@emotion/*`) once imports reach zero. (`@mui/lab` is already gone.)

### 6.4 Icon system — four systems, but one of them is now the answer

The original plan was "replace `@mui/icons-material` (47) and `react-icons` (18) with
`<wa-icon>`". Since then a **third** system was found, and #669 added a **fourth** — this
last one deliberately, as the target pattern. Current inventory:

| System | Size | Consumers | Notes |
|---|---|---|---|
| **`src/services/icon-library.ts`** ✅ | 11 glyphs, bundled by Vite | `<wa-icon library="fa" name="…">` | **The target pattern (#669).** `registerIconLibrary('fa', …)` resolving to SVG URLs imported from the `@fortawesome/fontawesome-free` dependency with `?url`. Avoids both hardcoded `/admin/...` paths (which break under any other mount point) and WA's default `ka-f.fontawesome.com` CDN resolver. Unknown names log a warning instead of silently rendering an empty glyph. 11 unit tests. |
| `@mui/icons-material` | dep | **45 files** | Material Symbols glyphs. |
| `react-icons` | dep | **18 files** | Mixed icon sets. |
| **`src/styles/app-icons.ts`** | **216 KB**, **86** icons | **19 modules** (`QuickConfigForm`, `AddImportDialog`, `ScopeForm`, `ScopeFormContainer`, `EditView`, `DetailsSection`, `IconDropdown`, `SlimDatabaseCard`, the four `cardviews` displays, `AppItem`/`AppForm`/`AppCard`, `keep-nsf-card.ts`, `store/databases/action.ts`, …) | A `Record<string, string>` of **base64-encoded SVG data URIs**, keyed by name (`archeology`, `binoculars`, `cocktail`, …). Guarded by `checkIcon()` in `styles/scripts.ts`. |
| `public/img/shoelace/*.svg` | **13 files** | referenced by URL from the **8** remaining `<wa-icon src=…>` markup sites | Hand-copied Font Awesome Free SVGs (attribution comments intact). Exactly the case `icon-library.ts` was written to replace. |
| `src/styles/icons.json` | **144 KB**, 36 entries | **0 imports** | Dead file. |
| `src/styles/text-manipulation.css` | 6 lines | **0 imports** | Dead file. |
| `@fontsource-variable/quicksand`, `…/crimson-pro` | deps | **0 imports** | Declared but unused (§3.3). |

> **Corrected:** `@fortawesome/fontawesome-free@7.3.1` is **no longer** an unused
> dependency — `icon-library.ts` imports 11 SVGs from it. Earlier revisions of this report
> listed it as dead weight; that is now false.

**Revised approach:**

1. **Delete the dead weight first** — `src/styles/icons.json` (144 KB) and
   `src/styles/text-manipulation.css`, neither of which has an importer; drop the two
   `@fontsource-variable` packages unless §3.3 wires them into `--wa-font-family-*`. **S**,
   zero risk.
2. **Finish the migration `icon-library.ts` started.** The **8** remaining
   `<wa-icon src=…>` markup sites — `keep-textform-array.ts` ×4 (L207, 217, 230, 247),
   `keep-nsf-card.ts` ×2 (L125 is a `data:` URI from `app-icons`, L136 an `IMG_DIR` path),
   `keep-api-error-dialog.ts` L43, and the `src` passthrough in `keep-button.ts` L50 —
   carry exactly the bug that module's header documents: `${IMG_DIR}/shoelace/*.svg` only
   resolves when the app is mounted at `/admin/`. Convert them to `library="fa"` names,
   adding each glyph to `ICONS`. **S**, mechanical, and it retires
   `public/img/shoelace/` (13 files).
3. **Decide `app-icons.ts`'s fate.** 216 KB of base64 in a TS module is inlined into the
   entry chunk (report 00 P2-3: **6,322.51 kB / 1,703.85 kB gzip**). Two viable ends:
   - **(a) Register it as a second WA custom icon library**, alongside `fa`, so the same
     86 glyphs are addressable as `<wa-icon library="keep" name="cocktail">` — the same
     `registerIconLibrary` shape as `icon-library.ts`, with the SVGs moved to static assets
     and fetched (cacheable, out of the JS bundle). **Preferred:** the precedent already
     exists and is tested.
   - **(b) Keep it inline** if the icons must work offline with zero requests — but then
     code-split it, since only 19 modules need it.
4. **Then** replace `@mui/icons-material` + `react-icons` with `<wa-icon library="fa">`.
   Build a `mui-icon → fa-name` map and codemod the shell + high-traffic files first:
   `name="house"`, `"gear"`, `"bolt"` (Quick Config's `FlashOnIcon`),
   `"chevron-left/right"` (collapse rail), `"sun"/"moon"` (theme toggle), `"bars"` (mobile
   menu). Each new glyph costs one import line plus one `ICONS` entry. Confirm each needed
   glyph exists in the **free** FA tier; the remainder go into the `keep` library from
   step 3.
5. Sequence the codemod **per component**, inside its report-02 pass, so a view loses its
   MUI icons at the same time it loses its MUI chrome.

---

## 7. Phased plan (effort S/M/L + risks)

| Phase | Work | Effort | Status | Primary risks |
|-------|------|--------|:---:|---------------|
| **P0. Decisions & spike** | ~~WA Pro vs. free-fallback go/no-go~~ ✅ **resolved — `wa-page` is free**. Remaining: pick the brand base hex; decide the `--wa-font-size-scale` question (§3.3); decide the icon strategy (§6.4); spike `wa-page` with dummy slots. | **S** | 🟡 partly done | Font-scale decision has knock-on effects on every px→token mapping. |
| **P0.5 Housekeeping** | Delete `src/styles/icons.json` and `src/styles/text-manipulation.css` (0 importers each); drop the two `@fontsource-variable/*` packages or wire them into `--wa-font-family-*`. ~~Resolve `@fortawesome/fontawesome-free`~~ ✅ **done** — `services/icon-library.ts` uses it. | **S** | 🟡 partly done | None — pure removal. |
| **P1. Token foundation** | Add `keep-theme.css` single-source brand ramp (light + `.wa-dark`); alias legacy `--*` app tokens to `--wa-*`; delete the invalid `--wa-color-brand-600/500/700` (`dark-mode.css:9-11`); consolidate `prefers-color-scheme` (`keep-overrides.css:271`) onto `.wa-dark`. | **S–M** | 🔴 open | Divergent purples change subtly; dark-mode regressions. **De-risked:** `.wa-dark` is now reliably set at boot *and* runtime (§3.7), so it is safe to key on. |
| **P2. Shell swap** | Build `AppShell` on `wa-page`; map regions to slots; delete `AppContainer`/`RightPanel`/mobile duplication/collapse toggle/`drawerWidth`. **CSP is no longer part of this phase** (§5) — instead, send the `style-src-attr` requirement to the owner of `config.json` so the production policy is ready before this ships. | **M** | 🔴 open | 768px breakpoints and sticky behavior; the 57px collapse rail is not native to `wa-page`; QuickConfig drawer placement. |
| **P3. Linaria + element tokenization** | Replace `getTheme()` interpolations and literals with `var(--wa-*)` across 22 `getTheme` files and the 198 `styled.` blocks in 69 Linaria files; tokenize the `keep-*` elements (report 02 §6.5); adopt `wa-stack/cluster/split/grid`; retire the `theme` prop plumbing. Where a value genuinely must reach JS, call `wa-color.ts`/`wa-typography.ts` (§3.6) rather than reviving a JS color object. | **L** | 🔴 open | Visual drift; missed hardcoded hex; the `--wa-font-size-scale: 0.85` interaction. **Do report 02 §6.2 first.** |
| **P4. Icon migration** | §6.4 steps 2–4: convert the 8 `<wa-icon src=…>` markup sites to `library="fa"`; `app-icons` (86 glyphs) → a second WA custom library; `<wa-icon>` codemod across the **55** distinct MUI/react-icons files (45 + 18 with **8** overlapping). | **M–L** | 🔴 open | Missing/renamed FA glyphs; icon sizing/color inheritance; bundle impact if `app-icons` stays inline. **De-risked:** `icon-library.ts` is a working, tested template. |
| **P5. Remove MD** | After report-02 components land: delete both `ThemeProvider`s + all three `CssBaseline` mounts + `theme.ts` + the `.Mui*` sheet; drop MUI + Emotion deps. **`@mui/x-data-grid` has no WA successor** — budget a separate grid decision. | **M** | 🔴 open | Any straggler reading the MUI theme; bundle/test fallout; the data-grid gap. |

### Cross-cutting risks

- **FOUC / FOUCE.** WA components upgrade after first paint. Use `wa-cloak` on `<html>`
  (removed once WA is ready) and pre-set `--header-height`/`--menu-width` on `wa-page` to
  prevent layout shift. Keep the existing pre-render theme `<script>`.
- **Dark mode.** Today = `light-dark()` + `body[data-theme]` (10 uses in `styles.css`, 26
  in `dark-mode.css`, 6 `keep-*` elements via `:host-context`) + a 468-line sheet with 54
  `.Mui*` rules. Target = flip `--wa-color-*` under `.wa-dark`; components re-color
  automatically. Risk: both systems coexist during transition — sequence so each
  component's `.Mui*` override is deleted only when that component is replaced.
  **✅ The "runtime toggle must also set `.wa-dark`" half of this is done** —
  `services/theme-service.ts` writes all three carriers from one place (§3.7), so the
  remaining work is deleting `body[data-theme]` *consumers*, not fixing writers.
- **Responsive breakpoints.** `mobile-breakpoint="768"` must match the hand-written
  `@media (max-width:768px)` rules; audit for others (`1366px` in `CommonStyles`).
- **Collapse rail (57px).** An app feature separate from `wa-page`'s mobile drawer;
  implement via `--menu-width` toggle, not the drawer.
- ~~**CSP** — the most likely hard blocker.~~ ➖ **Withdrawn.** The disabled header in
  `vite.config.mts` is dev-server only and the production policy lives in `config.json`,
  outside this repo (§5). The one real dependency is that `config.json` must not ship
  `style-src-attr 'none'` once `wa-page` is live — a coordination item with the
  `config.json` owner, not a repo blocker. Still worth validating the app under the
  intended production policy before release.
- **Bundle.** The entry chunk is 6,322.51 kB / 1,703.85 kB gzip (down from 6.94 MB /
  1.88 MB — Prettier now lazy-loads). Both `app-icons.ts` (216 KB) and the Monaco import
  chain contribute; the token work should not add to it. Note `icon-library.ts`'s `?url`
  imports emit separate asset files rather than inlined base64 — another reason to prefer
  §6.4 step 3(a).

---

## 8. References

- WebAwesome `wa-page` slots/parts/attributes, layout utilities (`wa-stack/cluster/grid/split/flank/frame`, `wa-gap-*`), tokens, and the Pro-only component list — per the bundled `webawesome` and `webawesome-design` skills shipped inside `@awesome.me/webawesome@3.10.0` (`dist/skills/`). The Pro-only set is enumerated in `dist/skills/webawesome/references/choosing-components.md` under "A note on Pro"; `wa-page` is **not** in it, and there is **no** data grid or date picker in either tier.
- `reports/02-react-to-lit-webawesome.md` — component migration (prerequisite for §6 step 1; §6.2 is a prerequisite for P3).
- `reports/00-code-quality.md` — P0-2 (CSP, **withdrawn** — dev-server only, production policy in `config.json`), P0-9 (WA base path, **done** — both `setBasePath` calls deleted in #673), P2-3 (bundle size).
- `reports/04-remove-react.md` — removing React / the Lit-native shell (end-state for §2.3).
- In-repo sources of truth cited above: `src/services/theme-service.ts`, `wa-color.ts`, `wa-typography.ts`, `editor-theme.ts`, `icon-library.ts`; `test/services/*.test.ts`; `src/styles/keep-overrides.css`, `dark-mode.css`, `styles.css`, `CommonStyles.tsx`; `vite.config.mts:29`.
