# Report 03 — App Layout on `wa-page` + WebAwesome Design Tokens (removing Material Design)

**Scope:** Rebase the application shell (header / side navigation / main content / footer / dialogs) on WebAwesome's `wa-page` and drive all color, spacing, typography, radius, shadow, and focus styling from WebAwesome **design tokens**, retiring the MUI `ThemeProvider`/`createTheme`/`CssBaseline` theme, the `getTheme()` JS color object, and the hardcoded hex values in the Linaria stylesheets.

> **Refreshed 2026-07-27** against branch `new_code` @ `7594672`. Originally written
> 2026-07-24 against `@awesome.me/webawesome@3.6.0`; the dependency is now **3.10.0**.
>
> ### ✅ The blocking gate is gone
> **`<wa-page>` is a FREE component.** Verified directly:
> `node_modules/@awesome.me/webawesome/dist/components/page/page.js` ships in the npm
> package, and the Pro-only set documented in the bundled skill
> (`references/choosing-components.md`) is exactly `wa-combobox`, `wa-file-input`,
> `wa-toast`/`wa-toast-item`, `wa-sparkline`, the chart family and the video family —
> `wa-page` is not among them.
>
> **Consequence:** the WA Pro licensing go/no-go that gated this whole phase is
> **resolved — no license needed**, and the free-tier CSS-grid fallback in §2.4 is no
> longer the recommended path. It is retained only as an escape hatch.
>
> ### 🔴 The other blocker got worse
> CSP is no longer merely permissive — **it is switched off**. `vite.config.mts` still
> holds the whole policy, but under the key `'disabledContent-Security-Policy'`, which no
> browser acts on (`9ff04b1`). The `style-src-attr 'none'` conflict described in §5 is
> therefore *latent*: it will reappear the moment CSP is correctly re-enabled, which must
> happen (report 00 P0-2). **Fix CSP and adopt `wa-page` in the same change**, so the
> policy is written once against the real requirements.

**Status:** Design/plan. No shell or theme code has changed since the original report.

**Companion reports (cross-reference, do not duplicate):**
- `reports/02-react-to-lit-webawesome.md` — component-level React→Lit/WebAwesome migration. Non-layout components that read the MUI theme must migrate there **before** the theme provider can be deleted.
- `reports/04-remove-react.md` — end-state where the shell is authored directly in Lit/HTML rather than JSX-hosted custom elements.

---

## 0. Executive summary & key findings

| # | Finding | Status | Impact |
|---|---------|:---:|--------|
| 1 | ~~`<wa-page>` is a Web Awesome **Pro** component~~ → **`<wa-page>` is FREE at 3.10.0** | ✅ **RESOLVED** | The §2.3 skeleton is directly usable. Drop the licensing decision from the critical path; treat §2.4 as a fallback only. |
| 2 | **The app shell is _not_ built on MUI `AppBar`/`Toolbar`/`Drawer`.** Header, side nav, right panel and footer are hand-rolled **Linaria `styled` + flexbox** (`HomeElement.tsx`, `Header.tsx`, `SideNav.tsx`, `Views.tsx`, `CommonStyles.tsx`). | 🟢 unchanged | Favorable: the shell can be swapped to `wa-page` without untangling MUI layout primitives. The bulk of MUI in the shell is `ThemeProvider`/`CssBaseline` + icons, not structure. |
| 3 | **The brand/primary color is still defined in four places with four different purples:** `KEEP_ADMIN_BASE_COLOR = #5F1EBE` (`config.dev.ts:24`), `--wa-color-brand-* = #7e57c2` (`styles.css:1932-1952`), `--wa-color-brand-50 = #7c5fd9` (`keep-overrides.css:251`, full ramp), dark-mode `#8B6CE0` (`dark-mode.css:9`). | 🔴 open | Consolidate to **one** WA brand scale. Unchanged since the original report except that `lit-overrides.css` is now `keep-overrides.css`. |
| 4 | **`dark-mode.css:9-11` still overrides `--wa-color-brand-600 / -500 / -700`** — Shoelace-era **3-digit** tint names. WebAwesome 3.x uses **2-digit** tints (`--wa-color-brand-05 … -95`). Dead code. | 🔴 open | Delete on migration; fold dark brand into the token theme (§3). |
| 5 | **WebAwesome token scaffolding exists and has grown.** `keep-overrides.css` defines the full `--wa-color-brand-{05..95}` ramp, brand aliases, **`--wa-font-size-scale: 0.85`**, and a `@media (prefers-color-scheme: dark)` brand override. | 🟢 improved | The token system is live; the work is *extending* it to the shell + Linaria, not bootstrapping it. |
| 6 | **CSP is not being sent at all** (`disabledContent-Security-Policy`). The `style-src-attr 'none'` vs. `wa-page` conflict is latent, not solved. Additionally `setBasePath` still points at **webawesome@3.6.0** while **3.10.0** is installed. | 🔴 **worse** | §5 rewritten. Re-enable CSP and adopt `wa-page` together. |
| 7 | **The icon situation is now _three_ systems, not two:** `@mui/icons-material` (45 files) + `react-icons` (18 files) + **`src/styles/app-icons.ts`** — a 216 KB registry of 78 base64-encoded SVG data URIs, imported by 10+ components. | 🔴 **worse** | §6.4 rewritten. Also: `src/styles/icons.json` (144 KB, 36 entries) is imported by **nothing**, and `@fortawesome/fontawesome-free` + two `@fontsource-variable` packages are declared dependencies that **no source file imports**. |
| 8 | **NEW: a runtime WA-token reader now exists.** `src/services/wa-color.ts` resolves any `--wa-*` color token to concrete sRGB hex (probe element → computed `color` → 1×1 canvas readback), and `wa-typography.ts` does the same for font tokens. | 🟢 **new asset** | Built for the Monaco theme, but it is exactly the primitive needed anywhere JS must read a token (charts, canvas, `<meta name="theme-color">`, third-party widgets). Reuse it rather than re-reading `getPropertyValue()`, which returns unevaluated `var()`/`color-mix()` chains. |

**Rough surface area (re-measured):** 69 files import `@mui/material`, 45 import
`@mui/icons-material`, 18 import `react-icons`, 69 use `@linaria/react`, **22** files read
`getTheme()` (down from 31), `Box` appears **148×**. Three `CssBaseline` mounts
(`App.tsx`, `HomeElement.tsx`, `LoginPage.tsx`) and two `ThemeProvider`s (`App.tsx`,
`HomeElement.tsx`).

---

## 1. Current layout audit

### 1.1 App shell anatomy (as built today — unchanged)

```
index.html  ── #root  +  pre-React inline <script> that reads localStorage['theme'],
   │                       sets documentElement.style.colorScheme, toggles .wa-dark,
   │                       and sets body[data-theme]        ← already WA-aware
   ▼
index.tsx   ── imports index.css, styles.css, dark-mode.css, webawesome.css,
   │           keep-overrides.css
   │           setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/...')  ← stale
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

> **Note:** `index.html` **already** toggles `.wa-dark` on `<html>` alongside
> `body[data-theme]` and `colorScheme`. Half of the "reconcile `body[data-theme]` vs.
> WA's `.wa-dark`" cross-cutting risk is therefore already handled at first paint; what
> remains is making the *runtime* toggle (`HomeElement`/theme switch) set both.

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
3. **Hardcoded hex in Linaria** — `CommonStyles.tsx` (936 LOC) and per-component `styled`
   blocks bake in `#0F5FDC`, `#F01648`, `#5E1EBE`, `#8B6CE0`, `#3874cb`,
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
   sheet. Flash-prevention script in `index.html` already sets `.wa-dark`.

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
| Sidenav theme toggle + `ProfileMenu` | `navigation-footer` | Pinned to the bottom of the nav. |
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
    <script>
      /* pre-React theme flash guard — unchanged from today's index.html */
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

> Retained only as an escape hatch if `wa-page` proves unworkable (e.g. an unresolvable
> CSP or sticky-behaviour conflict). **`wa-page` is free — prefer §2.3.** Choosing this
> path means re-implementing sticky logic, the skip link, and the auto height vars by hand
> for no licensing benefit.

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
> dependencies but imported nowhere.** Either wire them into `--wa-font-family-*` (and
> `font-src` in CSP) or drop them.

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

Prefer WA's own class hook (`.wa-dark` on `<html>` — already set by `index.html`) over the
MUI `data-theme` attribute, so WA components and app CSS switch together. Note the current
`keep-overrides.css` uses `@media (prefers-color-scheme: dark)` for its dark brand
override, which ignores the in-app theme toggle — consolidate on `.wa-dark` so the manual
switch wins over the OS preference.

### 3.6 Reading tokens from JavaScript — use `wa-color.ts`

`src/services/wa-color.ts` already solves the "read a `--wa-*` token in JS" problem
correctly, and the reasoning is worth not re-deriving:

> WA tokens are not hex — they are `var()` chains bottoming out in `color-mix(in oklab, …)`
> or relative color syntax, and `getPropertyValue()` returns that expression
> *unevaluated*. `resolveWaColors()` therefore (1) applies `color: var(<token>)` to a
> hidden probe element and reads the computed `color` longhand, forcing evaluation, then
> (2) paints the result into a 1×1 canvas and reads back sRGB bytes, letting the browser
> do every color-space conversion. Opaque → `#rrggbb`, translucent → `#rrggbbaa`.

`wa-typography.ts` does the equivalent for font tokens. **Reuse both** rather than
re-reading custom properties by hand anywhere JS needs a concrete value.

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
2. **Replace literal hex/px in `CommonStyles.tsx`** (936 LOC, highest fan-out) per §3.
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
   re-tokenizing them now is throwaway work.

Linaria stays as the authoring tool — it just emits `var(--wa-*)` references. No build
change is required (`@wyw-in-js/vite` extracts to a bundled stylesheet, served from
`'self'`).

---

## 5. Content-Security-Policy impact — ⚠️ rewritten

**Today there is no CSP.** `vite.config.mts` defines the policy string under the key
`'disabledContent-Security-Policy'`, so the dev server sends no `Content-Security-Policy`
header at all (report 00 P0-2). Production is served by the Keep server, whose policy is
out of this repo and must be confirmed separately.

The policy that will be restored:

```
style-src-attr 'none';
style-src-elem 'self' https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/ 'unsafe-hashes' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
font-src   'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
script-src 'self' 'unsafe-inline' data: gap: … https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/;
connect-src 'self' data: *;
worker-src 'self' blob:;
```

**Do not simply re-enable it as written.** Re-enabling and adopting `wa-page` should be one
change, because the policy needs these fixes:

1. **`style-src-attr 'none'` blocks `wa-page`.** `wa-page` sets inline element styles from
   JS (`--header-height`, `--banner-height`, `--subheader-height`, nav-drawer state); WA
   form controls and `::part` sizing also write inline styles. **Action:** relax to
   `style-src-attr 'unsafe-inline'` (or enumerate hashes) before enabling `wa-page`. The
   `sha256-47DEQ…` currently listed is the hash of the **empty string** — it authorizes
   only empty `<style>`/style attributes and should be dropped.
2. **Host mismatch, now also a version mismatch.** `index.tsx` calls
   `setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/…')` while CSP allow-lists
   `cdn.jsdelivr.net` **and** the installed package is **3.10.0** (report 00 P0-9).
   **Action:** **self-host the WA assets** and keep everything on `'self'`. That is the
   cleanest fix — it removes the CDN dependency, kills the host mismatch, eliminates the
   version skew, and simplifies `style-src-elem`/`font-src`/`script-src`/`img-src` in one
   move. Deriving the base path from the installed version is the minimum alternative.
3. **`<wa-icon>` fetches SVGs at runtime**, governed by `connect-src` (`*` today — must be
   tightened). Self-hosting the icon set removes the third-party runtime dependency.
   See §6.4: the app also carries its own base64 icon registry, which needs no network at
   all.
4. **`worker-src 'self' blob:` is already present and is now load-bearing** —
   `keep-monaco-editor.ts` instantiates Monaco's `editor`/`json`/`ts` workers via Vite's
   `?worker` imports, which produce blob or same-origin worker URLs. Keep this directive.
5. **Linaria/WA bundled stylesheets** are injected as `'self'` `<style>`/`<link>` (covered
   by `style-src-elem 'self'`). The pre-render theme `<script>` in `index.html` relies on
   `script-src 'unsafe-inline'` — replace with a nonce or hash when tightening
   (report 00 P0-2).

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
   `.toggle-button`, and the `drawerWidth` constant. **Land the CSP fix (§5) in the same
   change.**
3. **Tokenize Linaria + the `keep-*` elements, retire `getTheme()`** (§4), collapsing the
   four brand definitions into `keep-theme.css` (§3.5) and deleting the invalid
   `--wa-color-brand-600/500/700`.
4. **Swap icons** (§6.4).
5. **Delete the theme layer:** remove both `<ThemeProvider>`s and all **three**
   `<CssBaseline/>` mounts (`App.tsx`, `HomeElement.tsx`, `LoginPage.tsx`), delete
   `theme.ts`, and drop the `.Mui*` dark-mode rules as their components disappear.
6. **Drop MUI dependencies** (`@mui/material`, `@mui/icons-material`, `@mui/x-*`,
   `@emotion/*`) once imports reach zero. (`@mui/lab` is already gone.)

### 6.4 Icon system — ⚠️ rewritten: three systems, not two

The original plan was "replace `@mui/icons-material` (47) and `react-icons` (18) with
`<wa-icon>`". Since then a **third** system landed, and two packages arrived that nothing
imports. Current inventory:

| System | Size | Consumers | Notes |
|---|---|---|---|
| `@mui/icons-material` | dep | **45 files** | Material Symbols glyphs. |
| `react-icons` | dep | **18 files** | Mixed icon sets. |
| **`src/styles/app-icons.ts`** | **216 KB**, 78 icons | **10+ files** (`QuickConfigForm`, `AddImportDialog`, `ScopeForm`, `EditView`, `DetailsSection`, `IconDropdown`, `SlimDatabaseCard`, …) | A `Record<string, string>` of **base64-encoded SVG data URIs**, keyed by name (`archeology`, `binoculars`, `cocktail`, …). Guarded by `checkIcon()` in `styles/scripts.ts`. |
| `public/img/shoelace/*.svg` | ~20 files | referenced by URL | Hand-copied Font Awesome Free 6.7.2 SVGs (attribution comments intact). |
| `@fortawesome/fontawesome-free@7.3.1` | dep | **0 imports** | Declared but unused — presumably intended for self-hosting `wa-icon`'s FA set. |
| `src/styles/icons.json` | **144 KB**, 36 entries | **0 imports** | Dead file. |

**Revised approach:**

1. **Delete the dead weight first** — `src/styles/icons.json` (144 KB, no importers), and
   either wire up or drop `@fortawesome/fontawesome-free`. **S**, zero risk, and it
   shrinks the repo before the interesting work.
2. **Decide `app-icons.ts`'s fate.** 216 KB of base64 in a TS module is inlined into the
   entry chunk (report 00 P2-3: 6.94 MB). Two viable ends:
   - **(a) Register it as a WA custom icon library** so the same 78 glyphs are addressable
     as `<wa-icon library="keep" name="cocktail">`, with the SVGs moved to static assets
     and fetched (cacheable, out of the JS bundle). Aligns with §5's self-hosting.
   - **(b) Keep it inline** if the icons must work offline with zero requests — but then
     code-split it, since only ~10 components need it.
3. **Then** replace `@mui/icons-material` + `react-icons` with `<wa-icon>` (Font Awesome
   free tier, **self-hosted** per §5). Build a `mui-icon → fa-name` map and codemod the
   shell + high-traffic files first: `name="house"`, `"gear"`, `"bolt"` (Quick Config's
   `FlashOnIcon`), `"chevron-left/right"` (collapse rail), `"sun"/"moon"` (theme toggle),
   `"bars"` (mobile menu). Confirm each needed glyph exists in the **free** FA tier; the
   remainder go into the `keep` library from step 2.
4. Sequence the codemod **per component**, inside its report-02 pass, so a view loses its
   MUI icons at the same time it loses its MUI chrome.

---

## 7. Phased plan (effort S/M/L + risks)

| Phase | Work | Effort | Status | Primary risks |
|-------|------|--------|:---:|---------------|
| **P0. Decisions & spike** | ~~WA Pro vs. free-fallback go/no-go~~ ✅ **resolved — `wa-page` is free**. Remaining: pick the brand base hex; decide the `--wa-font-size-scale` question (§3.3); decide the icon strategy (§6.4); spike `wa-page` with dummy slots. | **S** | 🟡 partly done | Font-scale decision has knock-on effects on every px→token mapping. |
| **P0.5 Housekeeping** | Delete `src/styles/icons.json`; resolve `@fortawesome/fontawesome-free` + `@fontsource-variable/*` (wire up or drop). | **S** | 🔴 new | None — pure removal. |
| **P1. Token foundation** | Add `keep-theme.css` single-source brand ramp (light + `.wa-dark`); alias legacy `--*` app tokens to `--wa-*`; delete the invalid `--wa-color-brand-600/500/700`; consolidate `prefers-color-scheme` onto `.wa-dark`. | **S–M** | 🔴 open | Divergent purples change subtly; dark-mode regressions. |
| **P2. Shell swap + CSP** | Build `AppShell` on `wa-page`; map regions to slots; delete `AppContainer`/`RightPanel`/mobile duplication/collapse toggle/`drawerWidth`. **Re-enable CSP under the correct header name, relax `style-src-attr`, self-host WA assets.** | **M** | 🔴 open | 768px breakpoints and sticky behavior; the 57px collapse rail is not native to `wa-page`; QuickConfig drawer placement; CSP must be validated in *enforcing* mode. |
| **P3. Linaria + element tokenization** | Replace `getTheme()` interpolations and literals with `var(--wa-*)` across 22 `getTheme` files and 69 Linaria files; tokenize the `keep-*` elements (report 02 §6.5); adopt `wa-stack/cluster/split/grid`; retire the `theme` prop plumbing. | **L** | 🔴 open | Visual drift; missed hardcoded hex; the `--wa-font-size-scale: 0.85` interaction. **Do report 02 §6.2 first.** |
| **P4. Icon migration** | §6.4 steps 2–4: `app-icons` → WA custom library; `<wa-icon>` codemod across 63 files. | **M–L** | 🔴 open | Missing/renamed FA glyphs; icon sizing/color inheritance; bundle impact if `app-icons` stays inline. |
| **P5. Remove MD** | After report-02 components land: delete both `ThemeProvider`s + all three `CssBaseline` mounts + `theme.ts` + the `.Mui*` sheet; drop MUI + Emotion deps. | **M** | 🔴 open | Any straggler reading the MUI theme; bundle/test fallout. |

### Cross-cutting risks

- **FOUC / FOUCE.** WA components upgrade after first paint. Use `wa-cloak` on `<html>`
  (removed once WA is ready) and pre-set `--header-height`/`--menu-width` on `wa-page` to
  prevent layout shift. Keep the existing pre-render theme `<script>`.
- **Dark mode.** Today = `light-dark()` + `body[data-theme]` + a 468-line sheet with 54
  `.Mui*` rules. Target = flip `--wa-color-*` under `.wa-dark`; components re-color
  automatically. Risk: both systems coexist during transition — sequence so each
  component's `.Mui*` override is deleted only when that component is replaced.
  `index.html` already sets `.wa-dark` at first paint; make the **runtime** toggle set it
  too.
- **Responsive breakpoints.** `mobile-breakpoint="768"` must match the hand-written
  `@media (max-width:768px)` rules; audit for others (`1366px` in `CommonStyles`).
- **Collapse rail (57px).** An app feature separate from `wa-page`'s mobile drawer;
  implement via `--menu-width` toggle, not the drawer.
- **CSP** (§5) — still the most likely hard blocker. Validate in enforcing mode early;
  it is currently untested because the header is disabled.
- **Bundle.** The entry chunk is already 6.94 MB / 1.88 MB gzip. Both `app-icons.ts`
  (216 KB) and the Monaco/Prettier import chain contribute; the token work should not add
  to it.

---

## 8. References

- WebAwesome `wa-page` slots/parts/attributes, layout utilities (`wa-stack/cluster/grid/split/flank/frame`, `wa-gap-*`), tokens, and the Pro-only component list — per the bundled `webawesome` and `webawesome-design` skills shipped inside `@awesome.me/webawesome@3.10.0` (`dist/skills/`).
- `reports/02-react-to-lit-webawesome.md` — component migration (prerequisite for §6 step 1; §6.2 is a prerequisite for P3).
- `reports/00-code-quality.md` — P0-2 (CSP), P0-9 (WA base-path version skew), P2-3 (bundle size).
- `reports/04-remove-react.md` — removing React / the Lit-native shell (end-state for §2.3).
