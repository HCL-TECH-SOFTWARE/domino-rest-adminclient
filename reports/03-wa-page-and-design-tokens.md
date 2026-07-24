# Report 03 — App Layout on `wa-page` + WebAwesome Design Tokens (removing Material Design)

**Scope:** Rebase the application shell (header / side navigation / main content / footer / dialogs) on WebAwesome's `wa-page` and drive all color, spacing, typography, radius, shadow, and focus styling from WebAwesome **design tokens**, retiring the MUI `ThemeProvider`/`createTheme`/`CssBaseline` theme, the `getTheme()` JS color object, and the hardcoded hex values in the Linaria stylesheets.

**Status:** Design/plan only — **no source code was changed**.

**Companion reports (cross-reference, do not duplicate):**
- `reports/02-react-to-lit-webawesome.md` — component-level React→Lit/WebAwesome migration (form controls, dialogs, cards, tables). Non-layout components that read the MUI theme must migrate there **before** the theme provider can be deleted.
- `reports/04-*` (remove-react) — end-state where the shell is authored directly in Lit/HTML rather than JSX-hosted custom elements.

---

## 0. Executive summary & key findings

| # | Finding | Impact |
|---|---------|--------|
| 1 | **`<wa-page>` is a Web Awesome _Pro_ component.** The repo depends on `@awesome.me/webawesome@^3.6.0` (free tier). `page.js` is not in the free distribution. | Either acquire WA Pro, or ship a **free-tier CSS-grid fallback shell** (provided in §2.4) that mimics `wa-page` using WA tokens + layout utilities + `wa-drawer`. This is a go/no-go decision for the phase. |
| 2 | **The app shell is _not_ built on MUI `AppBar`/`Toolbar`/`Drawer`.** Header, side nav, right panel and footer are hand-rolled **Linaria `styled` + flexbox** (`HomeElement.tsx`, `Header.tsx`, `SideNav.tsx`, `Views.tsx`, `CommonStyles.tsx`). MUI `AppBar`/`Toolbar` appears in exactly one non-shell spot (`AppsTable.tsx`). | Favorable: the shell can be swapped to `wa-page` without untangling MUI layout primitives. The bulk of MUI in the shell is `ThemeProvider`/`CssBaseline` + icons, not structure. |
| 3 | **The brand/primary color is defined in at least four places with four different purples:** `KEEP_ADMIN_BASE_COLOR = #5F1EBE` (`config.dev.ts`), `--wa-color-brand-* = #7e57c2` (`styles.css`), `--wa-color-brand-50 = #7c5fd9` (`lit-overrides.css`, full ramp), dark-mode `#8B6CE0` (`dark-mode.css`). The toggle button hardcodes `#5F1FBF`, the sidenav gradient starts `#5E1EBE`. | Consolidate to **one** WebAwesome brand scale. This migration is the natural forcing function. |
| 4 | **`dark-mode.css` overrides `--wa-color-brand-600 / -500 / -700`** — Shoelace-era **3-digit** tint names. WebAwesome 3.x uses **2-digit** tints (`--wa-color-brand-05 … -95`). These three lines are effectively **dead code**. | Delete on migration; fold dark brand into the token theme (§3). |
| 5 | **WebAwesome token scaffolding already partly exists.** `lit-overrides.css` defines a complete `--wa-color-brand-{05..95}` ramp and `webawesome.css` is imported globally in `index.tsx`. | The token system is already live; the work is _extending_ it to the shell + Linaria, not bootstrapping it. |
| 6 | **CSP in `vite.config.mts` sets `style-src-attr 'none'`.** `wa-page` (and several WA components) mutate **inline element styles via JS** (`--header-height`, `--banner-height`, `--subheader-height`, nav-drawer state). | `style-src-attr 'none'` will block those inline style mutations in enforcing mode. Migration to `wa-page` requires loosening `style-src-attr` (see §5). Also: `base-path` points at `ka-f.webawesome.com` while CSP allow-lists `cdn.jsdelivr.net` — a host mismatch to reconcile. |
| 7 | **Two icon systems:** `@mui/icons-material` (47 files) + `react-icons` (18 files). | Standardize on `<wa-icon>` (Font Awesome) + a registered custom library for Keep brand SVGs (§6.4). Large but mechanical. |

**Rough surface area:** 72 files import MUI, 47 import `@mui/icons-material`, 18 import `react-icons`, 70 use `@linaria/react`, 31 files read `getTheme()`. `Box` alone appears ~155 times.

---

## 1. Current layout audit

### 1.1 App shell anatomy (as built today)

```
index.html  ── #root  +  pre-React inline <script> that reads localStorage['theme']
   │                       and sets documentElement.style.colorScheme + body[data-theme]
   ▼
index.tsx   ── imports webawesome.css, styles.css, dark-mode.css, lit-overrides.css
   │           setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/...')
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

Key regions and where they are styled:

| Region | Component / file | How it is styled today |
|--------|------------------|------------------------|
| Top bar / logo | `components/header/Header.tsx` (`HeaderContainer`, `AppContainerLogo`) | Linaria `styled.header`; `height:51px`, `background: getTheme(theme).bodyColor`, logo cell `242/57px` with `getTheme().secondary` + `borderColor`. `z-index:3`; `position:fixed` under 768px. |
| Mobile header | `components/header/MobileHeader.tsx` | Linaria; hardcoded `background:white`, MUI `MenuIcon`/`ChevronLeft`. |
| Side navigation | `components/sidenav/SideNav.tsx` + `styles/CommonStyles.tsx#SideNavContainer` | Linaria `styled.aside` 242px; `background-image: getTheme().sidenav.background` (purple→blue gradient); MUI `List`/`ListItemButton`/`ListItemIcon`/`ListItemText`/`Divider`; MUI icons; `LitTooltip`. Collapse via `:has(.close)` width transition to 57px. Width constant `drawerWidth = 242` in `sidenav/style.ts`. |
| Main content | `Views.tsx#ViewContainer` + `HomeElement.tsx#RightPanel` | Linaria; `height:calc(100vh - 23px)`, `overflow-y:auto`, `padding:0 40px`, `background: getTheme().bodyColor`. |
| Mobile nav drawer | `components/sidenav/MobileSidebar.tsx` | Custom; RightPanel blurs when `open`. |
| Quick-config drawer | `components/database/QuickConfigFormContainer.tsx` | Already a WebAwesome/Lit drawer (`wa-drawer`, styled in `dark-mode.css` via `::part`). |
| Dialogs | `components/dialogs/*`, `CommonStyles.tsx` (`CommonDialog` = MUI `Dialog`, `DialogContainer` = MUI `Box`) + native `<dialog>` | MUI `Dialog`/`Paper` themed via `dark-mode.css` `.MuiDialog-*` `light-dark()` `!important` rules. |
| Footer | `Footer.tsx` + `styles.css .footer-container` | Plain div. |
| Notifications/toasts | `components/alerts/Notification.tsx`, `dialogs/SnackbarToaster.tsx` | MUI Snackbar + a Lit toast (`lit-alert`). |

### 1.2 Where the theme / colors / spacing come from

1. **MUI theme** — `src/theme.ts` `createTheme({...})`: `palette` (primary/secondary/background/text), one `typography.caption` override, and `components.styleOverrides` for `MuiTooltip, MuiBadge, MuiDialogTitle, MuiButton, MuiPaper, MuiListItemIcon, MuiCircularProgress, MuiBreadcrumbs, MuiInputBase, MuiTab, MuiFormLabel, MuiSwitch`. Instantiated **twice** (`App.tsx` and `HomeElement.tsx`), each paired with its own `<CssBaseline/>`. `LoginPage.tsx` also mounts `CssBaseline`.
2. **`getTheme()` JS color object** — `src/store/styles/action.ts` returns a nested object (`primary, secondary, textColorPrimary, borderColor, button.{primary,secondary}, bodyColor, dialog, badgeColor, sidenav.{border,background,active,hover,textColor,iconColor,...}, breadcrumb, activeIcon, shimmerGradient, loading`) for `dark | hcl | default`. Read by **31 files**, mostly inside Linaria template literals (e.g. `background: ${p => getTheme(p.theme).secondary}`).
3. **Hardcoded hex in Linaria** — `CommonStyles.tsx` and per-component `styled` blocks bake in `#0F5FDC`, `#F01648`, `#5E1EBE`, `#8B6CE0`, `#3874cb`, `KEEP_ADMIN_BASE_COLOR`, radii (`3px/5px/10px`), spacing (`6px 16px`, `padding:0 40px`), font sizes (`12/14/16/…/26px`), weights (`300/500/700`).
4. **Global CSS custom properties** — `styles.css :root` defines app-local tokens with `light-dark()` (`--text-color-primary`, `--body-color`, `--base-color`, …) **and** a stray legacy WA brand override block (`--wa-color-brand-80/50 = #7e57c2`, `--wa-color-brand-fill-loud/border-loud/on`).
5. **WebAwesome token overrides** — `lit-overrides.css` already defines a full `--wa-color-brand-{05..95}` ramp (base `#7c5fd9`). `dark-mode.css` sets **invalid** `--wa-color-brand-600/500/700`.
6. **Dark mode** — driven by CSS `light-dark()` + `body[data-theme="dark"]`, with ~200 lines of `.Mui*` `!important` overrides in `dark-mode.css`. Pre-React flash-prevention script in `index.html`.

**Material Design is baked in at:** the two `ThemeProvider`+`CssBaseline` pairs (Roboto font, MD elevation, MD ripple/typography defaults, MD `Dialog`/`Paper`/`Tab`/`Switch`/`Breadcrumbs` chrome), the `theme.ts` component overrides, `@mui/icons-material` glyphs (Material Symbols), and the ~200-line `.Mui*` dark-mode sheet.

---

## 2. Target `wa-page` shell

### 2.1 `wa-page` slot anatomy (from the WA docs)

`wa-page` scaffolds a full layout from named slots; empty slots render nothing. Slots: `banner`, `header`, `subheader`, `navigation-header`, `navigation` (a.k.a. `menu`), `navigation-footer`, `main-header`, (default = main content), `main-footer`, `aside`, `footer`, plus `navigation-toggle` / `skip-to-content`. `banner`, `header`, `subheader`, `menu`, and `aside` are **sticky** by default. The `navigation` slot **auto-collapses into a drawer** below `mobile-breakpoint` (default `768px`); a `[data-toggle-nav]` button (or the default hamburger in `header`) toggles it. `view="desktop"|"mobile"` is reflected on the host for responsive CSS. Region widths are set with `--menu-width`, `--main-width`, `--aside-width`; measured heights are exposed as `--header-height`, `--banner-height`, `--subheader-height`.

### 2.2 Region mapping — this app → `wa-page`

| Today | `wa-page` slot | Notes |
|-------|----------------|-------|
| `Header.tsx` logo bar + `SnackbarToaster` | `header` | Global top bar. Put the nav hamburger here (default) or use `data-toggle-nav`. |
| `PageRouters` breadcrumb / page title | `subheader` | Sticky breadcrumb row — exactly what `subheader` is for. |
| `SideNav.tsx` (routes list) | `navigation` (`menu`) | Auto-drawer on mobile ⇒ **delete** `MobileSidebar.tsx`, the `open` state, `RightPanel` width math, and the `.toggle-button`. Keep gradient via `::part(menu)`. |
| Sidenav logo + "HCL Domino REST API" title | `navigation-header` | Column-stacked by default. |
| Sidenav theme toggle + `ProfileMenu` | `navigation-footer` | Column-stacked, pinned to bottom of the nav. |
| `Views.tsx` `<Routes>` main content | default slot | React Router `<Routes>` mounts here. |
| `QuickConfigFormContainer` (`wa-drawer`) | default slot (or `aside`) | Keep as an overlay drawer; or promote to `aside` if it should dock. |
| `Footer.tsx` | `footer` | Always below the viewport (page becomes scrollable). |
| MUI `Dialog` / native `<dialog>` | `::part(dialog-wrapper)` | `wa-page` provides a `dialog-wrapper` region for modal-like elements. |

Set `mobile-breakpoint="768"` to preserve the current breakpoint. Set `--menu-width: 242px` (open). For the collapsed 57px rail, keep an app-level `data-collapsed` attribute and switch `--menu-width` between `242px`/`57px` (the collapse rail is an app feature `wa-page` does not model natively — it is separate from the mobile drawer).

### 2.3 Copy-pasteable `wa-page` skeleton (Pro path)

`index.html` — zero out html/body margins (required by `wa-page`) and add `wa-cloak` FOUC guard:

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
    <script>
      /* pre-React theme flash guard (unchanged intent) */
      (function () {
        var dark = localStorage.getItem('theme') === 'dark';
        document.documentElement.classList.toggle('wa-dark', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

The shell in JSX (**React 19 renders custom elements natively** — no `@lit/react` wrapper needed for `wa-page`; `slot=` on plain React elements projects children into the right region):

```tsx
// AppShell.tsx  (replaces HomeElement's AppContainer/RightPanel/toggle machinery)
import '@awesome.me/webawesome/dist/components/page/page.js'; // Pro
import Header from './components/header/Header';
import SideNav from './components/sidenav/SideNav';
import Footer from './Footer';
import Views from './Views';

export default function AppShell() {
  return (
    <wa-page mobile-breakpoint="768" view="desktop">
      {/* HEADER */}
      <header slot="header" className="wa-split">
        <img className="keep-icon" src="/admin/img/KeepNewIcon.png" alt="HCL Domino REST API" />
        <SnackbarToaster />
      </header>

      {/* BREADCRUMB / PAGE TITLE */}
      <div slot="subheader"><PageRouters /></div>

      {/* NAVIGATION (auto-drawer on mobile) */}
      <div slot="navigation-header" className="wa-stack wa-align-items-center">
        <img className="keep-icon side-nav-logo-img" src="/admin/img/KeepNewIcon.png" alt="" />
        <span className="wa-heading-s">HCL Domino REST API</span>
      </div>

      <nav slot="navigation"><SideNav /></nav>

      <div slot="navigation-footer" className="wa-stack">
        <ThemeToggle />
        <ProfileMenu />
      </div>

      {/* MAIN CONTENT */}
      <Views />                 {/* default slot */}

      {/* FOOTER */}
      <footer slot="footer"><Footer /></footer>
    </wa-page>
  );
}
```

App-level CSS to reproduce today's look with tokens (see §3 for the token values):

```css
/* sidenav keeps its gradient + collapse rail */
wa-page { --menu-width: 242px; --main-width: 1fr; }
wa-page[data-collapsed] { --menu-width: 57px; }
wa-page::part(menu) {
  background-image: var(--keep-sidenav-gradient);
  border-inline-end: var(--wa-border-width-s) solid var(--wa-color-surface-border);
}
wa-page::part(header)    { background: var(--wa-color-surface-default); }
wa-page::part(subheader) { background: var(--wa-color-surface-raised); }
wa-page[view="mobile"]   { --menu-width: auto; }   /* collapse reserved rail space on mobile */
wa-page[view="desktop"] [data-toggle-nav] { display: none; }
```

**How React content mounts inside `wa-page` — transitional vs. end-state:**
- **Transitional (this phase):** `wa-page` is rendered in JSX; each existing React subtree (`SideNav`, `Views`, `Footer`, breadcrumb) is dropped into a `slot`. React continues to own everything inside each slot — Redux, Router, MUI-based inner components all keep working. Only the _outer_ flex scaffolding (`AppContainer`, `RightPanel`, `SideNavContainer`, the mobile header/sidebar duplication, the collapse toggle) is deleted. `wa-page` uses light-DOM slotting, so React's reconciler and event system are unaffected.
- **End-state (report 04):** the shell is authored as static HTML/Lit; React (if retained) mounts only into the default slot's content router.

### 2.4 Free-tier fallback (no WA Pro) — recommended default until Pro is decided

Because `wa-page` is Pro, replicate its shell with a CSS grid + WA layout utilities + `wa-drawer` for mobile. This uses only free tokens/utilities and keeps the exact same slot mental model:

```tsx
// AppShell.free.tsx
export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="app-header wa-split">…logo… <SnackbarToaster/></header>
      <div className="app-subheader"><PageRouters/></div>

      {/* desktop rail */}
      <aside className="app-nav wa-desktop-only"><SideNav/></aside>

      {/* mobile drawer */}
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

Trade-off: you re-implement `wa-page`'s sticky logic, skip-link, and auto height vars yourself, but you stay on the free tier and inherit the full token system. This is the pragmatic default; swap in real `<wa-page>` (§2.3) if/when Pro is licensed — the slot mapping is identical.

---

## 3. Design-token mapping (MUI / `getTheme()` / Linaria constants → WebAwesome tokens)

WebAwesome tokens are CSS custom properties prefixed `--wa-`. Semantic colors follow `--wa-color-{group}-{role}-{attention}` where group ∈ `brand|neutral|success|warning|danger`, role ∈ `fill|border|on`, attention ∈ `quiet|normal|loud`. Scales follow `--wa-color-{hue|group}-{05..95}` (two digits). Foundational: `--wa-color-surface-{raised|default|lowered|border}`, `--wa-color-text-{normal|quiet|link}`, `--wa-color-focus`, `--wa-color-overlay-{modal|inline}`.

### 3.1 Color

| Current value / source | Role | WebAwesome token |
|------------------------|------|------------------|
| `#5F1EBE` `KEEP_ADMIN_BASE_COLOR` / `#7c5fd9` (`lit-overrides`) / `#7e57c2` (`styles.css`) — **consolidate** | Brand / primary | `--wa-color-brand-50` (base) + full `-05..-95` ramp; used via `--wa-color-brand-fill-loud`, `--wa-color-brand-border-loud`, `--wa-color-brand-on-loud` |
| Dark brand `#8B6CE0` (`dark-mode.css`) | Brand (dark) | `.wa-dark { --wa-color-brand-50: #8B6CE0; }` (replaces invalid `--wa-color-brand-600/500/700`) |
| `#3C91FF` `HCL_BASE_COLOR` | Alt brand (hcl skin) | brand ramp in a `.wa-brand-hcl` scope, or `--wa-color-blue-*` |
| `#383838` `textColorPrimary` | Body text | `--wa-color-text-normal` |
| `#757575 / #9e9e9e` secondary text | Muted text | `--wa-color-text-quiet` |
| `#f5f5f5` `bodyColor` | Page background | `--wa-color-surface-default` (dark `#181825`) |
| `white` `secondary`/paper | Raised surface (cards, header, dialogs) | `--wa-color-surface-raised` (dark `#252535`) |
| well/inset backgrounds | Lowered surface | `--wa-color-surface-lowered` |
| `#e6e8f1 / #CFCFCF` borders (light) / `#3a3a4a` (dark) | Border / divider | `--wa-color-surface-border`, `--wa-color-neutral-border-normal` |
| `#0fa068` active indicator, `#82DC73` in-use dot | Success | `--wa-color-success-fill-loud` / `--wa-color-success-60` |
| `#dc1434 / #F01648 / #e53935 / #D6466F` | Danger / delete | `--wa-color-danger-fill-loud` / `--wa-color-danger-60` |
| (none explicit) | Warning | `--wa-color-warning-fill-loud` |
| `#0F5FDC` save / primary-action blue | Info-ish action | `--wa-color-blue-50` **or** reuse `--wa-color-brand-*` (WA has no `info` group) |
| MUI focus outline | Focus ring | `--wa-color-focus` (+ `--wa-focus-ring`) |
| sidenav gradient `linear-gradient(180deg,#5E1EBE,#3B91FF,#8CC7F9)` | Nav background | keep as one app var `--keep-sidenav-gradient` built from `--wa-color-brand-40`→`--wa-color-blue-60`→`--wa-color-blue-80` |

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
| 18/20/22 → 24/26 | `--wa-font-size-l` (20) / `-xl` (25) / `-2xl` (32) | Non-linear scale — pick nearest; headings can use `wa-heading-*` classes. |
| weight 300 / 400 / 500 / 700 | `--wa-font-weight-light` / `-normal` / `-semibold` (500) / `-bold` | **Note:** WA `--wa-font-weight-bold` = **600**, not 700. Override to 700 if the heavier weight must be preserved. |
| line-heights | `--wa-line-height-condensed` (1.2) / `-normal` (1.6) / `-expanded` (2) | |

### 3.4 Border radius / shadows / focus

| Current | Token |
|---|---|
| `3px` | `--wa-border-radius-s` (3px) |
| `5–6px` | `--wa-border-radius-m` (6px) |
| `10px` (cards, panels — very common) | `--wa-border-radius-l` (12px) — closest; or set `--wa-border-radius-l: 10px` |
| `50%` avatars / `9999px` pills | `--wa-border-radius-circle` / `-pill` |
| MUI elevation 1–2 / `box-shadow: 2px 2px 5px lightgray` | `--wa-shadow-s` |
| MUI elevation 4–8 (menus, dialogs) | `--wa-shadow-m` / `--wa-shadow-l` |
| MUI focus outline | `--wa-focus-ring` = `solid 3px var(--wa-color-focus)`, offset `--wa-focus-ring-offset` |

### 3.5 Registering the brand color / custom theme

Consolidate all four purple definitions into a single scoped theme sheet (replaces the brand blocks scattered across `styles.css`, `lit-overrides.css`, `dark-mode.css`):

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

For light/dark, prefer WA's own class hooks (`.wa-light` / `.wa-dark` on `<html>`, or the `light-dark()` approach already in use) over the MUI `data-theme` attribute, so WA components and app CSS switch together. Pro users can instead pick a theme+palette in the WA project settings and set `<html class="wa-theme-default wa-palette-default wa-brand-purple">`, then fine-tune `--wa-color-brand-50` to the exact Keep purple.

---

## 4. Linaria migration (replace hardcoded values with WA tokens)

**Goal:** every Linaria `styled` block references `var(--wa-*)` instead of literals or `getTheme()`, so components inherit the token system and dark mode "just works" through token flips (no per-component `light-dark()`).

Strategy, in order:
1. **Kill the `getTheme(props.theme)` interpolations first.** 31 files pass `theme={themeMode}` into Linaria only to look colors up at render. Replace each `${p => getTheme(p.theme).X}` with the corresponding `var(--wa-color-*)` token. Because tokens already resolve per color-scheme, the `theme` prop, the `themeMode` Redux read, and most `getTheme()` calls can then be deleted. Example:
   ```diff
   - border-right: 1px solid ${(p) => getTheme(p.theme).sidenav.border};
   - background-image: ${(p) => getTheme(p.theme).sidenav.background};
   + border-inline-end: var(--wa-border-width-s) solid var(--wa-color-surface-border);
   + background-image: var(--keep-sidenav-gradient);
   ```
2. **Replace literal hex/px in `CommonStyles.tsx`** (the highest-fan-out file) with tokens per §3. `KEEP_ADMIN_BASE_COLOR` → `var(--wa-color-brand-fill-loud)`; `#0F5FDC` → `var(--wa-color-blue-50)`; `#F01648` → `var(--wa-color-danger-fill-loud)`; `border-radius: 10px` → `var(--wa-border-radius-l)`; `padding: 6px 16px` → `var(--wa-space-2xs) var(--wa-space-m)`.
3. **Prefer WA layout utilities over bespoke flex.** Replace hand-rolled `display:flex` wrappers with `wa-stack` / `wa-cluster` / `wa-split` / `wa-flank` / `wa-grid` classes where the Linaria block only did flexbox + gap (many `StackContainer`, `Flex`, `TopContainer`, `Header` blocks qualify). This deletes Linaria rules outright rather than re-tokenizing them.
4. **Retire the `styles.css :root` app tokens** (`--body-color`, `--base-color`, …) in favor of `--wa-*`, or redefine them _as_ aliases of WA tokens during transition (`--base-color: var(--wa-color-brand-fill-loud)`), so existing class-based CSS keeps working while call sites are migrated.
5. **Leave `styled(MuiComponent)` blocks** (`CommonDialog = styled(Dialog)`, `Container = styled(Card)`, `ButtonYes = styled(Button)`) for **report 02** — those disappear when the underlying MUI component is replaced by a WA component; re-tokenizing them now is throwaway work.

Linaria stays as the authoring tool — it just emits `var(--wa-*)` references. No build change is required (`@wyw-in-js/vite` extracts to a bundled stylesheet, served from `'self'`).

---

## 5. Content-Security-Policy impact

CSP is defined as a dev-server header in `vite.config.mts` (production is served by the Keep server; the same policy must be mirrored there). Relevant directives today:

```
style-src-attr 'none';
style-src-elem 'self' https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/ 'unsafe-hashes' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
font-src   'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
script-src 'self' 'unsafe-inline' data: gap: … https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
connect-src 'self' data: *;
```

Callouts for the `wa-page` / token migration:
1. **`style-src-attr 'none'` will break `wa-page` and other WA components.** `wa-page` sets inline element styles from JS (`--header-height`, `--banner-height`, `--subheader-height`, nav-drawer state); WA form controls and `::part` sizing also write inline styles. With `style-src-attr 'none'` these are blocked in enforcing mode. **Action:** relax to `style-src-attr 'unsafe-inline'` (or add the specific hashes) before enabling `wa-page`. The `sha256-47DEQ…` currently listed is the hash of the **empty string** — it authorizes only empty `<style>`/style attributes and should be replaced or dropped.
2. **Host mismatch.** `index.tsx` calls `setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/…')`, but CSP allow-lists `cdn.jsdelivr.net`, not `ka-f.webawesome.com`. Component autoloading, icon assets, and font fetches from `ka-f.webawesome.com` are currently only saved by `connect-src *`. **Action:** add `https://ka-f.webawesome.com` to `style-src-elem`, `font-src`, `script-src` (and `img-src` for icons), **or** switch the base path to the already-allow-listed jsdelivr host, **or** self-host WA assets and keep everything on `'self'` (cleanest — removes CDN dependency and simplifies CSP).
3. **`<wa-icon>` fetches SVGs** from the icon library host at runtime (`fetch`), governed by `connect-src` (`*` today — fine, but tighten to the chosen host in production). Self-hosting the Font Awesome icon set avoids a third-party runtime dependency.
4. Linaria/WA bundled stylesheets are injected as `'self'` `<style>`/`<link>` (covered by `style-src-elem 'self'`); no change needed there. The pre-React theme `<script>` in `index.html` relies on `script-src 'unsafe-inline'` — unchanged.

---

## 6. Removing Material Design — sequence

Ordering matters: the theme provider cannot be deleted until nothing reads the MUI theme.

1. **(Report 02, prerequisite) Migrate non-layout MUI components off the theme.** Every component that relies on MUI palette/`styleOverrides` (`Dialog`, `Paper`, `Tab`, `Breadcrumbs`, `Switch`, `Badge`, `Button` text-variants, inputs) must move to WA equivalents or plain tokenized elements. Track completion by grepping for `@mui/material` imports (72 files → 0 in the shell path).
2. **Stand up the shell** (§2): introduce `AppShell` (Pro `wa-page` or free fallback), route the existing subtrees into slots, delete `AppContainer`, `RightPanel`, `SideNavContainer`, `MobileSidebar`, `MobileHeader` duplication, the `open` collapse state + `.toggle-button`, and the `drawerWidth` constant.
3. **Tokenize Linaria + retire `getTheme()`** (§4), collapsing the four brand definitions into `keep-theme.css` (§3.5) and deleting the invalid `--wa-color-brand-600/500/700` lines.
4. **Swap icons** (§6.4).
5. **Delete the theme layer:** remove both `<ThemeProvider>`+`<CssBaseline>` pairs (`App.tsx`, `HomeElement.tsx`, `LoginPage.tsx`), delete `theme.ts`, and drop the `.Mui*` dark-mode overrides as their components disappear.
6. **Drop MUI dependencies** from `package.json` (`@mui/material`, `@mui/lab`, `@mui/icons-material`, `@mui/x-*`, `@emotion/*`) once imports reach zero.

### 6.4 Icon system

Replace `@mui/icons-material` (47 files) and `react-icons` (18 files) with `<wa-icon>` (Font Awesome by default): `<wa-icon name="house">`, `name="gear"`, `name="bolt"` (Quick Config's `FlashOnIcon`), `name="chevron-left/right"` (collapse rail), `name="sun"/"moon"` (theme toggle), `name="bars"` (mobile menu). Approach:
- Build a small map `mui-icon → fa-name` and codemod the shell + high-traffic files first.
- Register a **custom icon library** for Keep-specific brand SVGs (the `KeepNewIcon`, base64 status dots, delete glyph) so they are addressable as `<wa-icon library="keep" name="…">`.
- Self-host the Font Awesome set to keep CSP on `'self'` (see §5). Confirm needed glyphs exist in the **free** FA tier; a handful may need the custom library.

---

## 7. Phased plan (effort S/M/L + risks)

| Phase | Work | Effort | Primary risks |
|-------|------|--------|---------------|
| **P0. Decisions & spike** | WA Pro vs. free-fallback go/no-go; pick brand base hex; reconcile CSP host; spike `wa-page`/fallback with dummy slots. | **S** | Pro licensing gate; CSP `style-src-attr` breakage discovered late. |
| **P1. Token foundation** | Add `keep-theme.css` single-source brand ramp (light+dark); alias legacy `--*` app tokens to `--wa-*`; delete invalid `--wa-color-brand-600/500/700`. | **S–M** | Divergent purples change subtly; dark-mode regressions. |
| **P2. Shell swap** | Build `AppShell`, map regions to slots, delete `AppContainer`/`RightPanel`/mobile duplication/collapse toggle/`drawerWidth`. | **M** | Responsive breakpoints (768px) and sticky behavior; collapse-rail (57px) not native to `wa-page`; QuickConfig drawer placement. |
| **P3. Linaria tokenization** | Replace `getTheme()` interpolations + literals with `var(--wa-*)`; adopt `wa-stack/cluster/split/grid`; retire `theme` prop plumbing. | **L** | 31 `getTheme()` files + 70 Linaria files; visual drift; missed hardcoded hex. |
| **P4. Icon migration** | `<wa-icon>` + custom Keep library; codemod 65 files. | **M–L** | Missing/renamed FA glyphs; icon sizing/color inheritance. |
| **P5. Remove MD** | After report-02 components land: delete `ThemeProvider`/`CssBaseline`/`theme.ts`/`.Mui*` sheet; drop MUI + Emotion deps. | **M** | Any straggler reading MUI theme; bundle/test fallout. |

### Cross-cutting risks
- **FOUC / FOUCE.** WA components upgrade after first paint. Use the `wa-cloak` utility on `<html>` (removed once WA is ready) and pre-set `--header-height`/`--menu-width` on `wa-page` to prevent layout shift. Keep the existing pre-React theme `<script>` so color-scheme is correct on first paint.
- **Dark mode.** Today = `light-dark()` + `body[data-theme]` + ~200 `.Mui*` `!important` lines. Target = flip `--wa-color-*` tokens under `.wa-dark`; components re-color automatically. Risk: during transition both systems coexist; sequence so each component's `.Mui*` override is deleted only when that component is replaced. Reconcile `body[data-theme]` vs. WA's `.wa-dark`/`color-scheme` so both are set together.
- **Responsive breakpoints.** `wa-page` drawer breakpoint (`mobile-breakpoint="768"`) must match the many hand-written `@media (max-width:768px)` rules; audit for other breakpoints (`1366px` in `CommonStyles`).
- **Collapse rail (57px).** This is an app feature separate from `wa-page`'s mobile drawer; implement via `--menu-width` toggle, not the drawer.
- **CSP** (§5) — the single most likely hard blocker; validate in enforcing mode early.

---

## 8. References
- WebAwesome `wa-page` slots/parts/attributes, layout utilities (`wa-stack/cluster/grid/split/flank/frame`, `wa-gap-*`), and tokens (color/space/typography/borders/shadows/focus) — per the bundled `webawesome` skill docs.
- `reports/02-react-to-lit-webawesome.md` — component migration (prerequisite for §6 step 1).
- `reports/04-*` — removing React / Lit-native shell (end-state for §2.3).
```
