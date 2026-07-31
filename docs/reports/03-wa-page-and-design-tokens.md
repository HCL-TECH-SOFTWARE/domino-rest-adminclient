# Report 03 — App Layout on `wa-page` + WebAwesome Design Tokens (removing Material Design)

**Scope:** Rebase the application shell (header / side navigation / main content / footer / dialogs) on WebAwesome's `wa-page` and drive all color, spacing, typography, radius, shadow, and focus styling from WebAwesome **design tokens**, retiring the MUI `ThemeProvider`/`createTheme`/`CssBaseline` theme, the `getTheme()` JS color object, and the hardcoded hex values in the Linaria stylesheets.

> **Refreshed 2026-07-30** against branch `new_code` @ `0d5458c`. Previous refreshes:
> `fcab645` (2026-07-28), `e17010c` and `7594672` (both 2026-07-27). Originally written
> 2026-07-24 against `@awesome.me/webawesome@3.6.0`; the dependency is now **3.10.0**.
>
> ### ✅ This report is no longer a plan
>
> **The shell is on `wa-page`** (#707, PRs #751/#767). `src/AppShell.tsx` maps the app's
> regions onto `wa-page` slots; `HomeElement`'s `AppContainer` flex row, `RightPanel`'s
> `width: calc(100% - 241px|50px)` arithmetic, `SideNavContainer`'s width animation and the
> whole duplicated `MobileSidebar` are **deleted, not ported**. Two regions are
> deliberately unused and §2.2 records why.
>
> **The tokens landed** (#705/#706, then #708 in five PRs). `src/styles/keep-theme.css` is
> the single definition of the brand ramp *and* the semantic surface/text tokens for both
> modes; the `keep-*` elements and the Linaria layer read `var(--wa-*)` instead of carrying
> their own hexes; the `theme` prop plumbing is gone; and `CommonStyles.tsx` was split per
> feature — and has since been deleted outright, along with all six modules it re-exported,
> as their consumers became Lit elements (#957, #956).
>
> **The token audit closed too** (#765). **34 `--wa-*` tokens are read by `src`, all 34
> resolve, 0 undefined**, and no `--sl-*` token remains anywhere.
>
> ### ✅ Both bugs from the last refresh are fixed
>
> - **Finding 11b — the invalid-input border never painted.** The `:state(user-invalid)`
>   rules named colour steps WA 3.10 does not define (`--wa-color-danger-600`, `-300`) with
>   no fallback, so the declaration was dropped at computed-value time. **Re-measured: 0
>   bare `var(--wa-color-*-NNN)` reads across `src`.** The only two textual matches of a
>   three-digit step are comments recording that those names were never valid.
> - **`--wa-font-sans` did not exist** (WA's family tokens are
>   `--wa-font-family-{body,heading,code,longform}`), so the `inherit` fallback always won —
>   the same silent-failure shape. Fixed in **#874**, and it turned out to cause *no* visual
>   change, verified in a browser: the body font already computed to what
>   `--wa-font-family-body` holds.
>
> ### ⚠️ The tail is smaller but real
> **131 `light-dark()` literals** remain (down from 229): 84 in `dark-mode.css`, 23 in
> `styles.css`, 16 in `.ts`/`.tsx`, 8 in `keep-theme.css`. `dark-mode.css` is **395** lines
> (down from 469) of hand-written dark overrides, and **54 of its 75 selectors contain
> `.Mui`** — so it is two blockers, not one: the `.Mui` half goes with **#709**, the rest
> retires per file inside **#806**. There are still **256** raw hex literals in `.ts`/`.tsx`.
>
> ### ➖ The layout half of §6 was dropped, deliberately
> **#765 is closed `COMPLETED`, but only its token half shipped.** Measured on this commit:
> **0** usages of `wa-stack`, `wa-cluster` or `wa-grid` in `src`, and the strings have never
> existed in the tree. 34 files in `keep-elements/` and 5 in `styles/` use hand-rolled
> `display: flex`/`grid`, and converting them means rendering WA layout elements inside 34
> shadow roots **with no consumer asking for it**, which `css: false` cannot verify. The
> primitives should arrive in *new* layout instead. Do not cite #765 as evidence they are in
> use.
>
> ### ✅ Standing caveats retired
> WebAwesome ships no data grid in any tier — still true, and **no longer a problem**: #771
> authored `keep-data-table` and #770 deleted `@mui/x-data-grid` with the People/Groups
> screens. The date-picker caveat retired earlier (#703, `keep-input-date`). **All four icon
> systems are gone** (#718/#913), which closes §6.4.

**Status:** **Delivered, with a documented tail.** The shell, the token layer and the icon
convergence are all in production. What remains is the `light-dark()`/hex residue in §4 —
half of it gated on #709, half retiring per file inside #806.

**Companion reports (cross-reference, do not duplicate):**
- `reports/02-react-to-lit-webawesome.md` — component-level React→Lit/WebAwesome migration. Non-layout components that read the MUI theme must migrate there **before** the theme provider can be deleted.
- `reports/04-remove-react.md` — end-state where the shell is authored directly in Lit/HTML rather than JSX-hosted custom elements.

---

## 0. Executive summary & key findings

| # | Finding | Status | Impact |
|---|---------|:---:|--------|
| 1 | ~~`<wa-page>` is a Web Awesome **Pro** component~~ → **`<wa-page>` is FREE at 3.10.0** | ✅ **RESOLVED** | Settled empirically as well as by inspection: it is in production. §2.4's CSS-grid fallback is now purely historical. |
| 1b | ~~**No `wa-page` in the tree yet**~~ → **`AppShell.tsx` is built on it** (#707) | ✅ **DONE** | §2 is now a *description*, not a plan. `MOBILE_BREAKPOINT_PX = 768` feeds `mobile-breakpoint`, and `test/app-shell.test.ts` fails if `styles/app-shell.css`'s two media queries drift from it — a media condition cannot read a custom property, so the number is duplicated on purpose and guarded. |
| 2 | **The app shell was _not_ built on MUI `AppBar`/`Toolbar`/`Drawer`.** It was hand-rolled Linaria `styled` + flexbox. | ✅ **paid off exactly as predicted** | The swap needed no untangling of MUI layout primitives, which is why #707 could *delete* the old scaffolding rather than port it. What remains of MUI in the shell is `ThemeProvider`/`CssBaseline` + icons — see finding 10. |
| 3 | **The brand purple is consolidated *in the token layer*; the other two purples are nearly gone.** `keep-theme.css` owns the ramp (`#7c5fd9` light base, `#8b6ce0` dark). `KEEP_ADMIN_BASE_COLOR = #5F1EBE` is down to **7 interpolations in one file**, `store/styles/action.ts`, plus its definition in `config.dev.ts`; `#7e57c2` is down to **2 occurrences**. | 🟡 **nearly done** | #705/#706 built the single source of truth. These counts were **re-measured, not adjusted** — the previous "11 interpolations across five files" named three files that no longer exist *and* was already wrong before they were deleted, since none of them contained the token when they went. Finish the remainder in **#765**. |
| 3b | ➖ **RETRACTED — the "invisible login label" was not a bug.** This row previously claimed that `body[data-theme='dark'] .login-submit-button` (`styles.css:1975-1985`) painted its label invisible, because it sets `--wa-color-brand` **and** `--wa-color-brand-on` to the same `#7e57c2`. Checked in a browser while implementing #765: the label is white before and after. `wa-button` reads `--wa-color-brand-on-loud` / `-on-normal` / `-on-quiet` and **never the bare `--wa-color-brand-on`**, so the declaration was inert. | ➖ **withdrawn** | The finding was reasoned from the token *name* rather than measured, which is the exact mistake §4.1 warns about. What was true: the block was the last place rendering the pre-#705 purple, so deleting it (#765) still belongs in finding 3 — just as consolidation, not as a defect fix. The genuinely dead declaration is one more instance of finding 11. |
| 4 | ~~**`dark-mode.css:9-11` overrides `--wa-color-brand-600 / -500 / -700`**~~ — Shoelace-era 3-digit tint names that never applied | ✅ **RESOLVED** (#706) | The three declarations were deleted and their values carried over to the real `05…95` steps in `keep-theme.css`. `dark-mode.css:9-12` now carries a comment recording that they were invalid, which is the right artefact to leave behind. **The class of bug recurred twice more** — see finding 11. |
| 5 | **The WebAwesome token layer is now a designed thing, not scaffolding.** `keep-theme.css` (183 lines) defines the light and dark brand ramps, the semantic `--wa-color-surface-*` / `--wa-color-text-*` pins, `--wa-font-size-scale: 0.85`, `--wa-border-radius-scale: calc(5 / 6)` and the `--keep-sidenav-*` gradient tokens — each with a comment saying which semantic token it drives and why the value is what it is. Load order (`src/index.tsx`) is `webawesome.css` → `keep-theme.css` → `keep-overrides.css`, and that order matters. | ✅ **done** | The work is now *extending* the token layer's reach (§4, §6), not building it. |
| 5b | **The pins are on the _semantic_ tokens, not the neutral ramp — deliberately.** #708 planned to re-skin by overriding `--wa-color-neutral-*`, mirroring what #706 did for brand, and measurement killed it: WA's neutral ramp is **shared between light and dark**, and only the semantic tokens switch which step they read. Dark `surface-raised` wants `neutral-10 = #252535` while light `text-normal` wants `neutral-10 = #383838`; one ramp cannot satisfy both. | 📌 **decision, recorded** | Pin `--wa-color-surface-*` / `--wa-color-text-*` instead — which also leaves WA's neutrals intact for component internals tuned against them. Do not "simplify" this back to a ramp override. |
| 5c | **`test/styles/keep-theme.test.ts` pins the CSS to `getTheme()` as _text_.** `vitest.config.ts` runs with `css: false` and jsdom has no canvas backend, so a runtime assertion on these tokens would be vacuous. The suite parses `keep-theme.css` instead and asserts each pinned token equals the corresponding `getTheme('dark')` value, plus a single-source-of-truth guard that no other stylesheet redefines them. | ✅ **the only automated guard this layer has** | Structural, not behavioural: it cannot catch a layout or contrast regression. **Visual changes still need a browser** — see §7 Cross-cutting risks. |
| 6 | **CSP: withdrawn as worded, and now _promoted_ as substance.** `vite.config.mts`'s disabled key is dev-server only; the production CSP is **`jar/config/config.json`**, tracked here and packaged into the JAR. What changed this round is *why it matters*: **#684 closed report 00's token-storage P0 on the strength of "CSP tightening" as the compensating control.** | 🔴 **promoted** (**#685**) | Two concrete gaps, both measured on this commit: the two routes that serve the SPA document carry `script-src 'unsafe-inline'` while the asset routes do not; and every profile sets `style-src-attr 'none'` while **20** inline `style="…"` attributes ship (down from 22, and now all inside `keep-*` shadow roots). ✅ **The first is now a config-only fix** — the built `dist/index.html` has no inline `<script>` body at all since #707 moved the boot code into `src/index.ts`. |
| 6b | ~~`setBasePath` points at **webawesome@3.6.0** while **3.10.0** is installed~~ | ✅ **RESOLVED** (#673) | Both calls **deleted**. `src/index.tsx` now carries a comment explaining why there is none: in WA 3.x the base path feeds only the autoloader, and this app imports its **18** WA components explicitly. Guarded by source scans in `test/services/icon-library.test.ts`. |
| 7 | **The icon situation is down to _one_ system.** `@mui/icons-material` and `react-icons` are **gone** — 0 references in `src`, both uninstalled (#718/#913, 115 sites across 43 files). `wa-icon` is used in 32 modules, fed by **`src/services/icon-library.ts`**. | ✅ **CLOSED** except #731 | What remains is **`src/styles/app-icons.ts`** (216 KB, **86** base64 SVG data URIs, **20** importers, **#731**) — deliberately out of scope, because **15 of its 19 render sites are `<img>`, not `wa-icon`**, so it is not separable from the component pass. Its 86 entries are user-selectable colour illustrations with `iconName` persisted server-side, so folding them into `library="fa"` is a UX and data-contract change, not a migration. ⚠️ Two #718 findings: a missing `library` attribute **silently falls back to the Font Awesome CDN** (`<wa-page>`'s nav toggle had been fetching `bars.svg` remotely on every authenticated screen), and `wa-icon`'s default `fixed` canvas is 1.25em × 1em — wider than the 1em × 1em the old sets drew. |
| 7b | ~~**Dead weight in `src/styles/`:** `icons.json`, `text-manipulation.css`, two `@fontsource-variable` packages~~ | ✅ **RESOLVED** (#679) | All four deleted and verified absent on this commit. |
| 8 | **The WA-token readers are tested.** `src/services/wa-color.ts` resolves any `--wa-*` color token to concrete sRGB hex (probe element → computed `color` → 1×1 canvas readback); `wa-typography.ts` does the same for font tokens; `editor-theme.ts` maps 16 Monaco color ids onto WA semantic tokens. **29 unit tests**, `src/services` at 96.8 %. | ✅ **proven** | A working precedent for "read WA design tokens from JS". Reuse it rather than `getPropertyValue()`, which returns unevaluated `var()`/`color-mix()` chains. §3.6. |
| 9 | **`src/services/theme-service.ts` is the single writer for appearance** — `.wa-dark` on `<html>`, `documentElement.style.colorScheme`, `body.dataset.theme`. Both runtime togglers call it. 10 unit tests. | ✅ **done, and now barely needed** | #708 removed the *reason* components cared: **no component reads a theme value any more.** The service still owns the three carriers, but nothing downstream branches on them except the CSS cascade. |
| 10 | **The MUI theme layer moved rather than shrank.** #743/#746 deleted `App.tsx`'s `ThemeProvider` + `CssBaseline` — and `AppShell.tsx` mounts them instead (`AppShell.tsx:136-137`, `:212`). There is now exactly **one** of each, down from two and three. | 🟡 **open by design** | This is #709's job, not this report's — the theme provider cannot go while 60 `.tsx` files still import `@mui/material`. Recorded here so "the ThemeProvider is gone" is not inferred from #746's title. `getTheme()` survives with **4** readers: `App.tsx`, `AppShell.tsx`, `theme.ts`, `store/styles/action.ts`. |
| 11 | 🐛 **Shoelace-era token names keep reappearing, and they fail silently.** Finding 4 caught `--wa-color-brand-600/500/700`. #708 found two more rounds. **This refresh found 19 more, and 14 of them are worse than dead weight** — see 11b. Verified directly against the installed package: `@awesome.me/webawesome@3.10.0` defines colour steps **`05…95` only** and font sizes `2xs…5xl` + `smaller`/`larger` + `s`/`m`/`l`. `-300`, `-600`, `-700`, `-950`, `-0`, `-small`, `-medium`, `-large` do not exist. | 🔴 **recurring class** | Grep for 3-digit colour steps and `-small/-medium/-large` before believing any token does something. |
| 11b | ✅ **FIXED — the WA validity styling now paints.** Was: **14 fallback-less reads** of non-existent tokens in exactly the rules that colour validation state (`var(--wa-color-danger-600)`, `-300`), so the declaration was dropped at computed-value time and the red error border never rendered. **Re-measured on `0d5458c`: 0 bare `var(--wa-color-*-NNN)` reads across `src`** — the only two textual matches of a three-digit step are comments in `keep-theme.css:304` and `dark-mode.css:15` recording that those names were never valid. | ✅ **closed** | ⚠️ **The condition that let it ship has not changed.** This was the second half of the bug #742/#744 fixed: that PR corrected the *selector* (`:state(user-invalid)`, not `data-user-invalid`) and `validity-states.test.ts` asserts the selector and the state transitions — but with `css: false` it cannot assert a painted colour, which is precisely why the dead *value* survived the fix to the dead *selector*. The fix here is likewise verified by reading compiled values, **not** by a regression test. Any colour or layout change still needs a browser. |

**Rough surface area (re-measured at `0d5458c`):** **43** files import `@mui/material` (84
references) and that is now the *only* MUI package; `@mui/icons-material` and `react-icons`
are **gone**. ~~**50** files use `@linaria/react` with **148 `styled.` usages** (was 175)~~ —
**0 and 0** since #825; a raw grep for `styled` still answers **68**, and every one of them is
a provenance comment inside a converted element (32 of those lines carry the `styled.` or
`styled(` form specifically — the gap between 68 and 32 is exactly why the exit gate in
`test/styles/no-css-in-js.test.ts` matches import forms rather than the word).
**6** files read `getTheme()`, `Box` appears **48×** (was 144). **One** `CssBaseline` mount
and **one** `ThemeProvider`, both in `AppShell.tsx`. On the WebAwesome side: **504** `--wa-*`
references across **67** files, `webawesome.css` imported exactly **once** at
`src/index.tsx:13` (the three other textual matches are comments), **50** registered `keep-*`
elements, and `wa-page` **in production**.

⚠️ **`Box` fell 144 → 48 and `styled.` 175 → 148 without a dedicated sweep** — both are
falling out as #806 converts files. Do not schedule work against either number; schedule
against #806's tier list.

**What is _not_ done:** **131 `light-dark()` literals** (down from 229) — 16 in `.tsx`/`.ts`,
**84 in `dark-mode.css`**, 23 in `styles.css`, 8 in `keep-theme.css` — and `dark-mode.css` is
still **395 lines** (was 469) of hand-written per-selector dark overrides, plus **256** raw
hex literals in `.ts`/`.tsx`. That file is the clearest remaining target: most of it exists to
do what `--wa-color-text-normal` and `--wa-color-surface-*` now do centrally.

⚠️ **But it is two jobs, not one.** **54 of its 75 selectors contain `.Mui`**, and none
contains `wa-`. The `.Mui` half is deleted by **#709** when MUI leaves; the rest retires per
file inside **#806**. Sequencing its tokenization *ahead* of #709 means tokenizing rules that
are about to vanish.

---

## 1. Current layout audit

### 1.1 App shell anatomy — **as rebuilt in #707**

```
index.html  ── #root  +  two module <script src=…>            ← no inline script (CSP)
   │
   ├─ src/index.ts    appearance boot: reads localStorage['theme'], sets
   │                  documentElement.style.colorScheme, toggles .wa-dark,
   │                  sets body[data-theme]                   ← a real module, not inline
   ▼
index.tsx   ── imports index.css, styles.css, dark-mode.css,
   │           webawesome.css (×1) → keep-theme.css → keep-overrides.css   ← order matters
   │           (no setBasePath — deleted in #673; a comment explains why)
   │           <Provider store>  →  <App/>
   ▼
App.tsx     ── <Router basename="/admin/ui">  authenticated ? AppShell : LoginPage
   │             (no ThemeProvider/CssBaseline here — deleted in #746)
   ▼
AppShell.tsx  ── ***the shell***  <ThemeProvider><CssBaseline/>   ← the only pair left
   └─ <WaPage mobileBreakpoint="768px" class={collapsed && 'nav-collapsed'}>
        ├─ slot="header"              <MobileHeader/>      ← mobile only; 0px on desktop
        ├─ slot="navigation-header"   logo, title, theme toggle (in a KeepTooltip)
        ├─ slot="navigation"          <SideNav expanded/>  ← auto-drawers below 768px
        ├─ slot="navigation-footer"   <ProfileMenu/>
        ├─ (default)                  <Views/>
        │      ├─ PageRouters (breadcrumb/top nav)
        │      ├─ <Routes> … Homepage / Schemas / Apps / Scopes / AccessMode
        │      └─ <QuickConfigFormContainer/>  (wa-drawer-based quick config)
        └─ .nav-collapse-toggle       desktop rail collapse button
   ├─ <Notification/>   outside the page element (portals to document.body)
   └─ <Footer/>         outside the page element (fixed overlay) — see below
```

**Deleted rather than ported** (`test/shell-dead-code.test.ts` asserts they stay deleted):
`HomeElement`'s `AppContainer` flex row, `RightPanel`'s `width: calc(100% - 241px|50px)`,
`SideNavContainer`'s width animation, the dead desktop top bar (#751), and the whole
duplicated `MobileSidebar` — `wa-page` does that last one natively below
`mobile-breakpoint`.

**Two regions are deliberately _not_ used**, and the reasons are worth keeping:

- **`footer`.** `.footer-container` is `position: fixed; bottom: 0` and 23px tall, which is
  where the `calc(100vh - 23px)` in ~20 page-level rules comes from. Slotting it would add
  a grid row and change every one of them. It stays a fixed overlay outside the page
  element.
- **`subheader`.** The obvious tenant is `PageRouters`, but it renders inside `Views`'
  `NavigationGuardProvider` and needs the router context; hoisting it is its own change.

> **One non-obvious constraint, recorded in the source.** The collapse rail is switched by
> a **class**, not `data-toggle-nav`: `wa-page` hides its own hamburger the moment it finds
> that attribute anywhere in its light DOM, which would leave mobile with no way to open
> the drawer. (`data-collapsed` would work too, but `@lit/react` derives props from
> `React.HTMLAttributes`, which has no `data-*` index signature.)

> **The breakpoint is duplicated on purpose.** `MOBILE_BREAKPOINT_PX = 768` feeds
> `wa-page`'s `mobile-breakpoint` attribute, and `styles/app-shell.css` repeats the literal
> in two media queries because a media condition cannot read a custom property.
> `test/app-shell.test.ts` fails if the three drift apart.

> **✅ The `.wa-dark` reconciliation risk stays closed.** `src/index.ts` sets all three
> carriers at first paint and `services/theme-service.ts` sets the same three at runtime
> (§3.7). Note that #707 had to move the boot code out of `index.html` and into a module:
> an inline `<script>` is exactly what the #685 CSP tightening forbids, and PR #752 was
> closed over precisely this.

Key regions and where they are styled:

| Region | Component / file | How it is styled today |
|--------|------------------|------------------------|
| Top bar / logo | ~~`components/header/Header.tsx`~~ | ✅ **Gone.** The desktop bar was dead code (#751); the logo and title moved into `wa-page`'s `navigation-header` slot. An empty `header` part measures 0px, so `--header-height` stays 0 on desktop. |
| Mobile header | ~~`components/header/MobileHeader.tsx`~~ → `keep-elements/keep-mobile-header.ts` | ✅ **Converted** (#806). A Lit element rendered into `slot="header"` only below 768px; no Linaria left. |
| Side navigation | ~~`components/sidenav/SideNav.tsx` + `styles/sidenav.tsx#SideNavContainer`~~ → `keep-elements/keep-side-nav.ts` | ✅ **Converted** (#806); `styles/sidenav.tsx` deleted with the `CommonStyles` barrel (#957). In `wa-page`'s `navigation` slot. Width belongs to `--menu-width` and the paint to `::part(menu)`; the gradient comes from `--keep-sidenav-background` in `keep-theme.css` (#708) rather than `getTheme().sidenav.background`. **No MUI inside** — the `List`/`ListItemButton`/… stack and its MUI icons are gone (#718). |
| Main content | `Views.tsx#ViewContainer` | Linaria; `height:calc(100vh - 23px)`, `overflow-y:auto`. `RightPanel`'s `calc(100% - 241px\|50px)` is **deleted** — `wa-page` owns the grid. |
| Mobile nav drawer | ~~`components/sidenav/MobileSidebar.tsx`~~ | ✅ **Deleted** — `wa-page` collapses `navigation` into a drawer natively below `mobile-breakpoint`. |
| Quick-config drawer | ~~`components/database/QuickConfigFormContainer.tsx`~~ → `keep-elements/keep-quick-config-drawer.ts` + `keep-quick-config-form.ts` | ✅ **Converted** (#806). A WebAwesome/Lit drawer whose `::part` styling now lives in the element rather than in `dark-mode.css`. |
| Dialogs | ~~`components/dialogs/*`, `styles/dialog.tsx` (`CommonDialog` = MUI `Dialog`)~~ → twelve `keep-elements/keep-*-dialog.ts` on native `<dialog>` | ✅ **Converted** (#806); the directory and `styles/dialog.tsx` are both deleted (#956, #957). The five `.MuiDialog-*` rules in `dark-mode.css` outlived every element they targeted and match nothing — see #959. |
| Footer | ~~`Footer.tsx`~~ → `keep-elements/keep-footer.ts` | ✅ **Converted** (#806). Fixed overlay outside `wa-page` (see §1.1). |
| Notifications/toasts | ~~`components/alerts/Notification.tsx`, `dialogs/SnackbarToaster.tsx`~~ → `keep-elements/keep-alert.ts` | ✅ **Converted** (#806). The MUI Snackbar is gone, and with it the reason this sat outside the page element. `keep-alert` no longer relocates itself to `document.body` either (#952) — the Popover API puts it in the top layer from wherever it is rendered. |

### 1.2 Where the theme / colors / spacing come from

1. **WebAwesome design tokens — now the primary source.** `src/styles/keep-theme.css`
   (183 lines) is the single definition of the light and dark brand ramps, the semantic
   `--wa-color-surface-{lowered,default,raised,border}` and `--wa-color-text-{normal,loud}`
   pins, `--wa-font-size-scale: 0.85`, `--wa-border-radius-scale: calc(5 / 6)` and the
   `--keep-sidenav-*` tokens. **382** `--wa-*` references across **67** files now read from
   it. Guarded by `test/styles/keep-theme.test.ts`.
2. **MUI theme** — `src/theme.ts` `createTheme({...})`: `palette`, one
   `typography.caption` override, and `components.styleOverrides` for `MuiTooltip,
   MuiBadge, MuiDialogTitle, MuiButton, MuiPaper, MuiListItemIcon, MuiCircularProgress,
   MuiBreadcrumbs, MuiInputBase, MuiTab, MuiFormLabel, MuiSwitch`. Now instantiated
   **once**, in `AppShell.tsx`, with a single `<CssBaseline/>` (was 2 providers / 3
   baselines). Removing it is **#709**.
3. **`getTheme()` JS color object** — `src/store/styles/action.ts`. **6 readers** on this commit. Down from **22 readers
   to 4**: `App.tsx`, `AppShell.tsx`, `theme.ts`, and the module that defines it. The
   Linaria interpolations that made up the other 18 are gone (#708), and with them the
   `theme` / `themeMode` prop plumbing — 20 pass-downs and 15 `<{ theme: string }>`
   generics. The unreachable `'hcl'` branch was deleted too.

   > 🐛 **This fixed live bugs, not just style.** `getTheme(props.theme)` silently returned
   > the **light** palette when no `theme` prop was passed, and `ViewsTable`, `AgentsTable`,
   > `AppsTable` and `ConsentsTable` never passed one — so those tables rendered light
   > chrome in dark mode. It is now impossible to reproduce: no component knows the theme.

4. **Hardcoded hex in Linaria — nearly eliminated.** `CommonStyles.tsx` and all six
   per-feature modules it re-exported (`layout`, `search`, `cards`, `dialog`, `sidenav`,
   `forms`) are **deleted** (#957, #956): every consumer became a Lit element whose rules
   live in its own shadow root. The repo is down to **33 `styled.` usages across 12 files**
   (was 175 across 68), **20 `light-dark()` literals across 10 files** (was 56 across 21),
   and **`KEEP_ADMIN_BASE_COLOR` to 7 interpolations in `store/styles/action.ts` alone**
   (was reported as 11 across five files, three of which no longer exist). §4.
5. **Global CSS custom properties** — `styles.css` (1,279 lines) `:root` defines app-local
   tokens with `light-dark()`. `--base-color` is now derived
   (`light-dark(var(--wa-color-brand-40), var(--wa-color-brand-60))`) with a comment noting
   it serves two opposite roles — a text colour and a surface — which is why splitting it
   is on **#765**. The legacy `#7e57c2` block at L1946–1985 is **still live** (§0 finding 3).
6. **WebAwesome token overrides** — `keep-overrides.css` (242 lines) now holds only
   component-level `::part` fixes; the ramp moved to `keep-theme.css` in #706.
   `dark-mode.css` (**395 lines, 84 `light-dark()`**) is the largest remaining
   un-tokenized surface — mostly `.Mui*` rules that predate the semantic tokens.
7. **Dark mode** — CSS `light-dark()` + `body[data-theme="dark"]` + `.wa-dark` + the
   `.Mui*` override sheet. `src/index.ts` sets all three carriers at boot and
   `services/theme-service.ts` sets the same three at runtime (§3.7). The boot script is
   still asymmetric — it writes `body.dataset.theme` only on the dark branch — so
   `theme-service` remains the only place that *clears* it.
8. **WA design tokens read from JavaScript** — `services/wa-color.ts`,
   `wa-typography.ts` and `editor-theme.ts` resolve `--wa-*` tokens to concrete values for
   Monaco, which cannot consume CSS custom properties. Tested (§3.6).

**Material Design is now baked in at exactly one place structurally** — `AppShell.tsx`'s
single `ThemeProvider` + `CssBaseline` (Roboto, MD elevation, MD ripple/typography
defaults, MD `Dialog`/`Paper`/`Tab`/`Switch`/`Breadcrumbs` chrome) — plus `theme.ts`'s
component overrides (43 files) and the `.Mui*` dark-mode
sheet. That consolidation is what makes **#709** a tractable single change rather than a
sweep.

---

## 2. The `wa-page` shell — ✅ **built** (#707)

> **Read §1.1 first for what actually shipped.** This section was written as a design and
> is kept as reference for the slot semantics and the alternatives considered. Where §2.2
> and §2.3 differ from `src/AppShell.tsx`, **the code is right and this section records the
> plan.** The three notable divergences:
>
> - **`subheader` was not used.** `PageRouters` renders inside `Views`'
>   `NavigationGuardProvider` and needs router context; hoisting it is its own change.
> - **`footer` was not used.** `.footer-container` is `position: fixed` and 23px tall, which
>   is where the `calc(100vh - 23px)` in ~20 page rules comes from. Slotting it would add a
>   grid row and change all of them.
> - **The collapse rail is switched by a class, not `data-toggle-nav`.** `wa-page` hides its
>   own hamburger the moment it finds that attribute anywhere in its light DOM, which would
>   leave mobile with no way to open the drawer.

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

> **The "Today" column describes the tree as it was before #707**, and is kept as the record of
> what was mapped where. Every file it names has since been deleted or converted — see the
> §1.1 table above for what each region is now. Do not read this one as an inventory.

| Today | `wa-page` slot | Notes |
|-------|----------------|-------|
| `Header.tsx` logo bar + `SnackbarToaster` | `header` | Global top bar. Put the nav hamburger here (default) or use `data-toggle-nav`. |
| `PageRouters` breadcrumb / page title | `subheader` | Sticky breadcrumb row — exactly what `subheader` is for. |
| `SideNav.tsx` (routes list) | `navigation` (`menu`) | Auto-drawer on mobile ⇒ **delete** `MobileSidebar.tsx`, the `open` state, `RightPanel` width math, and the `.toggle-button`. Keep the gradient via `::part(menu)`. |
| Sidenav logo + "HCL Domino REST API" title | `navigation-header` | Column-stacked by default. |
| Sidenav theme toggle + `ProfileMenu` | `navigation-footer` | ✅ As built, the toggle sits in **`navigation-header`** next to the logo and `ProfileMenu` alone occupies `navigation-footer`. The toggle keeps dispatching `switchTheme`; the DOM writes stay in `applyTheme(themeMode)` (§3.7) — do not re-implement them in the slot. |
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
        <img className="keep-icon" src={keepLogo} alt="HCL Domino REST API" />
        <SnackbarToaster />
      </header>

      <div slot="subheader"><PageRouters /></div>

      <div slot="navigation-header" className="wa-stack wa-align-items-center">
        <img className="keep-icon side-nav-logo-img" src={keepLogo} alt="" />
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

### 2.4 Free-tier CSS-grid fallback — ➖ **not needed, and now moot**

> `wa-page` is free *and shipped* (#707), so this is historical. Retained only because the
> reasoning about sticky behaviour and `style-src-attr` is still relevant to §5.1 item 1.
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

**Status: steps 1–3 and 5 are done (#708). Steps 4, 6 and 7 remain.**

1. ✅ **Kill the `getTheme(props.theme)` interpolations.** **DONE** — 35 interpolations
   replaced with static `var(--wa-*)`, and the plumbing that fed them deleted: 20
   `theme=`/`themeMode=` pass-downs and 15 `<{ theme: string }>` generics. `getTheme()` is
   down to 6 readers. The affected `styled` components are now **fully static**, so Linaria
   no longer injects a per-instance CSS variable at render:
   ```diff
   - border-right: 1px solid ${(p) => getTheme(p.theme).sidenav.border};
   - background-image: ${(p) => getTheme(p.theme).sidenav.background};
   + border-right: 1px solid var(--keep-sidenav-border);
   + background-image: var(--keep-sidenav-background);
   ```
   > The sidenav gradient became `--keep-sidenav-*` rather than a `--wa-*` token because it
   > is a brand asset with no WA semantic equivalent — a three-stop gradient, an active and
   > a hover state. Naming it in the `--keep-` namespace keeps `keep-theme.css` as the one
   > file to edit without pretending it is part of WA's scale.
2. ✅ **Replace literal hex/px in `CommonStyles.tsx`** — **DONE**, and the file itself was
   split (see §6) and later deleted entirely (#957). 133 radius/font-size substitutions landed with it, under a **two-part
   gate**: a token was only substituted where it lands **within 1px** of the literal *and*
   does not collapse two distinct sizes into one. That is why `16px` and `18px` kept their
   literals — see the caveat below.
3. ✅ **Tokenize the `keep-*` elements** — **DONE**, 93 literals (report 02 §6.5).
   Collapsing the four buttons first (#701) worked exactly as this report advised: three
   components that should not exist never got tokenized.
4. 🟡 **Prefer WA layout utilities over bespoke flex.** **NOT STARTED — deferred to #765.**
   Adoption of `wa-stack`/`wa-cluster`/`wa-split`/`wa-grid` is still **zero**. It was scoped
   out of #708 deliberately: it is the one item the suite genuinely cannot see (`css:
   false`) and it carries the most visual risk, so it wants a browser and a human, not a
   codemod.
5. ✅ **Retire the `styles.css :root` app tokens** — **partly done via aliasing**, the
   transition strategy this report recommended. `--base-color` is now
   `light-dark(var(--wa-color-brand-40), var(--wa-color-brand-60))`, so class-based CSS
   keeps working. 🔴 The `#7e57c2` login block (§0 finding 3) is the part that was *not*
   aliased and still needs deleting.
6. 🟡 **Leave `styled(MuiComponent)` blocks for report 02** — unchanged and still correct.
   They disappear when the underlying MUI component is replaced (**#709**); re-tokenizing
   them now is throwaway work.
7. 🟡 **Where a token genuinely has to reach JavaScript**, call `resolveWaColors()` /
   `resolveWaTypography()` (§3.6) instead of reviving a `getTheme()`-shaped color object.
   The Monaco theme is the proof this works.

~~Linaria stays as the authoring tool — it just emits `var(--wa-*)` references. No build
change was required (`@wyw-in-js/vite` extracts to a bundled stylesheet, served from
`'self'`).~~ **Superseded (#825).** It did not stay: `styled` is a React component factory,
so it could not outlive React, and the blocks moved into each element's `static styles` as
that element converted. They still emit `var(--wa-*)` references, which is the part of this
paragraph that held — the tokens were never the Linaria layer's doing. Removing
`@wyw-in-js/vite` changed the built stylesheet by **zero bytes**, so nothing about the CSP
answer changes either.

**Scale check, re-measured:** 175 `styled.` blocks across 68 files, now referencing
`--wa-*` in **382** places across 67 files (was 110). The remaining literal surface is
**131 `light-dark()`** calls: 16 in `.tsx`/`.ts` files, **84 in `dark-mode.css`**, 23
in `styles.css`.

### 4.1 Caveats worth carrying into the next sweep

Three things #708 learned the hard way. They apply to whoever does `dark-mode.css`.

- **Measure the ladders; do not derive them.** `--wa-font-size-*` is a
  `round(calc(… / 1.125), 1px)` chain on a rem base, so with `--wa-font-size-scale: 0.85`
  applied it is **not** a clean geometric series. Hand arithmetic is not trustworthy here —
  assign the token to a real property in a browser and read back the computed longhand.
  (And note `CSSStyleDeclaration.setProperty` needs the kebab-case CSS name, not the
  camelCase IDL one, or the probe silently reads the inherited value.)
- **The radius scale was retuned rather than mapped per site.** `--wa-border-radius-scale:
  calc(5 / 6)` makes `--wa-border-radius-l` land exactly on the app's dominant 10px card
  radius. The cost is that WA's own components lose ~17 % corner radius; that was judged
  acceptable by eye, but it is a global change and should be re-checked if WA components
  become more prominent.
- **Substitution changes pixels even when it is "correct".** The gate let `14px →
  13.6px` through at **50 sites** — sub-pixel, but it is the app's most common size — and
  converged light-mode borders from six greys onto one token at 15 sites. Neither is a bug;
  both are visible. Budget a human look, not just a green suite.

---

## 5. Content-Security-Policy — an in-repo work item (`jar/config/config.json`)

> ### Correction, twice over
> Earlier revisions of this report (and report 00 P0-2) called the
> `'disabledContent-Security-Policy'` key at `vite.config.mts:29` a shipped regression, and
> made "re-enable CSP" a **prerequisite for adopting `wa-page`**. That was wrong: the object
> is the Vite **dev-server** header map, affecting `localhost` only. It is not built, not
> shipped, and not what any browser sees in production. **That part of the correction
> stands, and CSP still does not gate `wa-page`** — adopt `wa-page` on its own schedule.
>
> **The correction itself then got one thing wrong.** It claimed the production CSP was
> served from a `config.json` *outside this repository* and concluded "there is nothing to
> fix in-repo". Both halves are false:
>
> - The file is **`jar/config/config.json`** — tracked here, and packaged verbatim into the
>   shipped artifact by `pom.xml` (`<resource><directory>jar</directory></resource>`,
>   commented *"Direct into the JAR"*).
> - Its git history is a run of CSP changes made in this repo: `079175b Update CSP to add
>   worker-src and include blob`, `80c4201 Remove unsafe-inline for script-src`,
>   `547e316 Update CSP headers`, `81c0335 Update CSP for styles`, `b06a4f4 Remove
>   unsafe-hashes and sha keyword on style-src-elem`.
>
> So §5 is **not** a memo to hand to someone else. It is an editable work item, tracked as
> **#685**.

### 5.0 The policy that actually ships

`jar/config/config.json` defines five `webapps.webjars` entries, each with its own `csp`
string. Two of them serve the SPA — `/admin/ui/*` and `/admin/ui` — and **they disagree
with each other**. Reproduced from the tracked file (not a sketch):

| Entry | `csp` |
|---|---|
| `/admin/ui/*` | `default-src 'self' data:; script-src 'self' 'unsafe-inline' data: gap: https://ssl.gstatic.com https://cdn.jsdelivr.net/npm/@awesome.me/webawesome/; worker-src 'self' blob:; style-src-attr 'none'; style-src-elem 'self' https://cdn.jsdelivr.net/…; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net/…; img-src 'self' data: gap:; worker-src 'self' data: blob:; connect-src 'self' data: *` |
| `/admin/ui` | same, **minus** the first `worker-src 'self' blob:`, and `img-src 'self' data: gap: *` |
| `/adminui.json` | `default-src 'self';` |
| `/admin/*` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; worker-src 'self' data: blob:` |
| `/monaco-editor-core/*` | as `/admin/*` |

Four defects visible in that table before any `wa-page` work begins:

1. **`/admin/ui/*` declares `worker-src` twice.** CSP takes the **first** occurrence and
   ignores the rest, so the effective value is `'self' blob:` and the later
   `'self' data: blob:` is dead. It happens to be the *stricter* one, so Monaco still works
   — but the duplicate means an edit to the second copy would silently do nothing.
2. **The two SPA entries diverge**, and `/admin/ui` opens `img-src` to `*` while
   `/admin/ui/*` does not. Whichever route a user lands on decides their policy.
3. **`connect-src 'self' data: *`** — the `*` is in the shipped policy, not just an old
   sketch. It negates the directive.
4. **`/monaco-editor-core/*` serves a path nothing requests any more.** Monaco is bundled
   as ESM; `MONACO_EDITOR_DIR` in `config.dev.ts` has no reader (see #675's follow-ups).
   The entry is dead weight.

### 5.1 Gap analysis against the shipped policy

1. **`style-src-attr 'none'` is already set, and the app already ships inline style
   attributes.** This is no longer a future `wa-page` requirement — and `wa-page` is now
   **live**, so the aggravating factor has arrived: it sets `--header-height`,
   `--banner-height`, `--subheader-height` and nav-drawer state as inline styles from JS.
   On top of that, **20 static `style="…"` attributes across 10 files** render today (down
   from 22/12 — three went with the `keep-button*` collapse). All ten files are now
   `keep-*` elements: `keep-nsf-card` (`style="font-size: 32px;"`), `keep-dropdown`,
   `keep-autocomplete`, `keep-input-text`, `keep-input-password`, `keep-input-date`,
   `keep-default-card`, `keep-drawer`, `keep-button`, `keep-source`.

   > Being inside a shadow root does **not** exempt them: `style-src-attr` applies to the
   > document, and shadow content is part of it.

   Under `style-src-attr 'none'` those attributes should be refused. So exactly one of the
   following is true, and **finding out which is the first task in #685**:

   - they *are* being blocked in production, and the resulting layout defects have simply
     not been reported (CSP style violations are silent to the user); or
   - the policy is not reaching the browser at all — in which case the CSP is not doing any
     of the work it appears to be doing, and every other directive here is theatre.

   **Fix, once known:** either `style-src-attr 'unsafe-inline'`, or remove the inline
   attributes (most are trivially expressible as classes or `:host` rules). Note the
   `sha256-47DEQ…` hash removed in `b06a4f4` was the hash of the **empty string** — it
   authorized only empty style attributes and carried no useful permission, so dropping it
   changed nothing.
2. **No CDN hosts are needed for WebAwesome any more.** The `setBasePath` call to
   `ka-f.webawesome.com` is **gone** (#673) and icons are self-hosted: `services/
   icon-library.ts` registers `<wa-icon library="fa">` against Font Awesome SVGs bundled
   from the `@fortawesome/fontawesome-free` dependency, precisely so the deployment CSP
   does not have to allow a third-party origin. **Requirement:** the
   `cdn.jsdelivr.net` / `ka-f.*` entries in `style-src-elem`, `font-src` and `script-src`
   can be **dropped** — WA assets are all `'self'`. Confirm no `<wa-icon>` still resolves
   through WA's default CDN resolver (see §6.4 — since #700 the only `<wa-icon src=…>`
   sites left are `data:` URIs).
3. **`connect-src 'self' data: *` — the `*` is shipping.** No `<wa-icon>` fetches an SVG
   over the network any more: glyphs come from the bundled `library="fa"`, and the two
   `keep-nsf-card` sites are `data:` URIs. `'self' data:` suffices. The trailing `*` makes
   the directive permit any origin, so it is currently providing no protection at all.
4. **`worker-src 'self' blob:` is load-bearing.** `keep-monaco-editor.ts` instantiates
   Monaco's `editor`/`json`/`ts` workers via Vite's `?worker` imports, which produce blob or
   same-origin worker URLs. **Requirement:** keep this directive in production, or Monaco
   (Source tab, Diff view) breaks.
5. ✅ **`script-src 'unsafe-inline'` is no longer required — and this is now the highest-value
   item in #685.** The pre-render theme `<script>` that needed it has been moved into
   `src/index.ts` as a real module (#707), and the built `dist/index.html` on this commit
   contains **no inline `<script>` body at all** — one `<script type="module" crossorigin
   src=…>` and one stylesheet `<link>`.

   That matters more than it used to. **#684 closed report 00's token-storage P0 on the
   basis that CSP tightening is the compensating control**, and `'unsafe-inline'` sits on
   exactly the two profiles that serve the SPA document (`/admin/ui`, `/admin/ui/*`) while
   the asset routes are already `'self'`. Dropping it from those two entries is now a
   **config-only edit with a verified precondition**, and it is what turns that decision
   into an actual control. Note `80c4201 Remove unsafe-inline for script-src` removed it
   once before and it came back — so verify against a built artifact, not the source
   `index.html`, and keep `test/shell-dead-code.test.ts`-style guarding in mind.
   `https://ssl.gstatic.com` also sits in `script-src` with no obvious current consumer.
6. **Linaria/WA bundled stylesheets** are injected as `'self'` `<style>`/`<link>`, covered
   by `style-src-elem 'self'`. No action.
7. **`img-src`.** Since #700 every image resolves from `/admin/assets/…` (same-origin) or a
   `data:` URI, so `'self' data:` is exactly right. The `gap:` scheme (Cordova) and the `*`
   on the `/admin/ui` entry are both removable.
8. **No `report-uri`/`report-to` in production.** `vite.config.mts` reports dev violations
   to `/api/csp-violation-report` (`c32a3a6`), but none of the five shipped policies report
   anything. Adding it is the cheapest way to answer §5.1(1) with data instead of guesswork.

**Repo-side action: tracked as #685.** Two things not to do: don't rename the
`'disabledContent-Security-Policy'` key in `vite.config.mts` (it changes nothing in
production and imposes a wide-open policy on `localhost`), and don't tighten
`jar/config/config.json` blind — add reporting first, confirm what the current policy is
actually blocking, then narrow.

---

## 6. Removing Material Design — sequence

Ordering matters: the theme provider cannot be deleted until nothing reads the MUI theme.

1. 🟡 **(Report 02, prerequisite) Migrate non-layout MUI components off the theme.** Every
   component relying on MUI palette/`styleOverrides` (`Dialog`, `Paper`, `Tab`,
   `Breadcrumbs`, `Switch`, `Badge`, `Button` text-variants, inputs) must move to WA
   equivalents or plain tokenized elements. Track by grepping `@mui/material` imports —
   **60 `.tsx` files** (was 69) → 0. This is the long pole and it has barely moved; steps
   2–3 below were the fast ones.
2. ✅ **Stand up the shell** — **DONE** (#707/#767). `AppShell.tsx` on `wa-page`;
   `AppContainer`, `RightPanel`, `SideNavContainer`'s animation, `MobileSidebar`, the dead
   desktop top bar and `drawerWidth` all deleted. It did not wait on CSP, as this report
   advised.
3. ✅ **Tokenize Linaria + the `keep-*` elements, retire `getTheme()`** — **DONE**
   (#705/#706/#708). `keep-theme.css` is the single brand and semantic-token source; the
   invalid `--wa-color-brand-600/500/700` are deleted; `getTheme()` is down to 6 readers.
   🟡 **Tail:** the `#7e57c2` login block and `KEEP_ADMIN_BASE_COLOR`'s 11 interpolations
   (§0 finding 3), plus the **131** `light-dark()` literals in §4.
4. 🟡 **Swap icons** (§6.4) — the `src=`/`IMG_DIR` half is done; the two React icon
   packages (**#718**) and `app-icons.ts` (**#731**) remain.
5. 🔴 **Delete the theme layer:** remove the **one** remaining `<ThemeProvider>` +
   `<CssBaseline/>` pair (both now in `AppShell.tsx`), delete `theme.ts`, and drop the
   `.Mui*` dark-mode rules as their components disappear. Tracked as **#709**. Blocked on
   step 1.
6. 🔴 **Drop MUI dependencies** (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`,
   `@emotion/*`) once imports reach zero. `@mui/lab`, `@mui/x-date-pickers` and
   `@mui/x-tree-view`, `@mui/x-data-grid`, `@mui/icons-material` are **all already gone**;
   `@mui/material` (43 files) is the last one, owned by **#709**.

### 6.4 Icon system — down to three, and the answer is in production

The original plan was "replace `@mui/icons-material` (47) and `react-icons` (18) with
`<wa-icon>`". A **third** system was then found (`app-icons.ts`), and #669 added a
**fourth** deliberately, as the target pattern. Since then #700/#725/#730 **closed two of
the five rows below** — the hand-copied SVGs and the dead style assets are gone.

| System | Size | Consumers | Notes |
|---|---|---|---|
| **`src/services/icon-library.ts`** ✅ | 11 glyphs, bundled by Vite | `<wa-icon library="fa" name="…">` | **The target pattern (#669).** `registerIconLibrary('fa', …)` resolving to SVG URLs imported from the `@fortawesome/fontawesome-free` dependency with `?url`. Avoids both hardcoded `/admin/...` paths (which break under any other mount point) and WA's default `ka-f.fontawesome.com` CDN resolver. Unknown names log a warning instead of silently rendering an empty glyph. |
| ~~`@mui/icons-material`~~ | ➖ **uninstalled** | — | ✅ **Gone** (#718/#913). Was 41 files / 87 refs; 0 references remain in `src`. |
| ~~`react-icons`~~ | ➖ **uninstalled** | — | ✅ **Gone** (#718/#913). Was 18 files. |
| **`src/styles/app-icons.ts`** | **216 KB**, **86** icons | **20 modules** | A `Record<string, string>` of **base64-encoded SVG data URIs**, keyed by name (`archeology`, `binoculars`, `cocktail`, …). Guarded by `checkIcon()` in `styles/scripts.ts`. `iconName` is persisted server-side, so this is a data contract, not just an asset choice. **#731** |
| ~~`public/img/shoelace/*.svg`~~ | 13 files | — | ✅ **Retired** (#700/#730). |
| ~~`src/styles/icons.json`~~, ~~`text-manipulation.css`~~, ~~two `@fontsource-variable` packages~~ | — | — | ✅ **Deleted** (#679). Verified absent on this commit. |

> **Corrected, and still true:** `@fortawesome/fontawesome-free@7.3.1` is **not** an unused
> dependency — `icon-library.ts` imports 11 SVGs from it.

**Revised approach:**

1. ✅ **Delete the dead weight first** — **DONE** (#679).
2. ✅ **Finish the migration `icon-library.ts` started** — **DONE** (#700/#730). `IMG_DIR`
   has one textual match left, a doc comment. The failure mode was worth recording: off
   `/admin/`, `${IMG_DIR}/shoelace/*.svg` fell through to the SPA's `index.html` and the
   browser got **`200 text/html`** where an image was expected — a silent rendering
   failure. `test/services/icon-library.test.ts` now scans stylesheets as well as `.tsx`,
   which is the gap that had hidden the same bug in `.login-castle-bg`.
3. 🟡 **Decide `app-icons.ts`'s fate** — **#731, open.** 216 KB of base64 in a TS module is
   inlined into the entry chunk, which is now **2,111.11 kB / 594.20 kB gzip** — so
   `app-icons.ts` has gone from ~3 % of the entry chunk to **~10 %**. The Monaco split made
   this item relatively more valuable, not less. Two viable ends:
   - **(a) Register it as a second WA custom icon library**, alongside `fa`, so the same
     86 glyphs are addressable as `<wa-icon library="keep" name="cocktail">` — the same
     `registerIconLibrary` shape as `icon-library.ts`, with the SVGs moved to static assets
     and fetched (cacheable, out of the JS bundle). **Preferred:** the precedent already
     exists and is tested.
   - **(b) Keep it inline** if the icons must work offline with zero requests — but then
     code-split it, since only 19 modules need it.
4. ✅ **Done** — `@mui/icons-material` + `react-icons` replaced with `<wa-icon library="fa">` (#718/#913). Note `library` is **mandatory in practice**: omitting it silently falls back to the FA CDN.
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
| **P0. Decisions & spike** | WA Pro go/no-go; brand base hex; the `--wa-font-size-scale` question; icon strategy. | **S** | ✅ **DONE** (#705) | — |
| **P0.5 Housekeeping** | Delete `icons.json`, `text-manipulation.css`, the two `@fontsource-variable/*` packages. | **S** | ✅ **DONE** (#679) | — |
| **P1. Token foundation** | `keep-theme.css` as the single-source brand ramp (light + `.wa-dark`); alias legacy `--*` app tokens; delete the invalid `--wa-color-brand-600/500/700`. | **S–M** | ✅ **DONE** (#706) | — |
| **P2. Shell swap** | `AppShell` on `wa-page`; regions → slots; delete `AppContainer`/`RightPanel`/mobile duplication/collapse toggle/`drawerWidth`. | **M** | ✅ **DONE** (#707) | Resolved as expected: the 768px breakpoint is guarded by a test, and the collapse rail went to `--menu-width` + a class rather than the drawer. |
| **P3. Linaria + element tokenization** | Replace `getTheme()` interpolations and literals with `var(--wa-*)`; tokenize the `keep-*` elements; retire the `theme` prop plumbing; radius + typography mapping; split `CommonStyles.tsx`. | **L** | ✅ **DONE** (#708, 5 PRs) | Landed. Residual risk is visual, not structural — see §4.1. |
| **P3.5 Token tail** | ✅ the dead-token reads (11b), `keep-tooltip.ts`'s invalid names and `#7e57c2` in `styles.css` are all **fixed**; `--wa-font-sans` fixed in #874. 🔴 Remaining: tokenize the **131** `light-dark()` literals (**84 in `dark-mode.css`**) and the **256** hex literals in `.ts`/`.tsx`; split `--base-color` into text and surface tokens. | **M** | 🟡 **part done** (#765 closed its audit half) | `dark-mode.css` is 395 lines, **54 of 75 selectors `.Mui`** — sequence that half's deletion with **#709**, not ahead of it. The non-`.Mui` half retires per file inside **#806**. |
| **P3.6 Layout utilities** | ➖ **DROPPED, deliberately.** Adoption today: **zero**, and the strings have never existed in `src`. #765 closed without doing this half: 34 files in `keep-elements/` and 5 in `styles/` use hand-rolled flex/grid, and converting them means rendering WA layout elements inside 34 shadow roots **with no consumer asking for it** — a large change `css: false` cannot verify. | — | ➖ **not planned** | The primitives cost nothing to adopt in **new** layout, which is where they should arrive. File fresh if a concrete screen wants them. |
| **P4. Icon migration** | ✅ **DONE** for the packages — 115 sites across 43 files converted to `<wa-icon library="fa">`, both packages uninstalled (#718/#913). 🔴 Remaining: `app-icons` (86 glyphs, 216 kB, 20 importers) → a second WA custom library (**#731**). | **M–L** | ✅ / 🔴 **#731** | ⚠️ **#731 is not separable from the component pass** — 15 of its 19 render sites are `<img>`, not `wa-icon`. Two #718 findings to carry: a missing `library` attribute **silently falls back to the FA CDN**, and `wa-icon`'s default `fixed` canvas (1.25em × 1em) is wider than the 1em the old sets drew. |
| **P5. Remove MD** | After report-02 components land: delete the one `ThemeProvider` + `CssBaseline` pair + `theme.ts` + the `.Mui*` sheet; drop MUI + Emotion deps. | **M** | 🔴 open (**#709**) | Any straggler reading the MUI theme; bundle/test fallout; `@mui/x-data-grid` still has no WA successor (**#702**). |

### Cross-cutting risks

- **FOUC / FOUCE.** WA components upgrade after first paint. `wa-cloak` on `<html>` and
  pre-set `--header-height`/`--menu-width` still apply. ✅ The pre-render theme code
  survived the shell swap — as `src/index.ts`, a module rather than an inline `<script>`,
  which is what the #685 CSP tightening requires.
- **Dark mode.** ✅ The writer side is solved: `services/theme-service.ts` sets all three
  carriers from one place, and after #708 **no component reads a theme value**. 🔴 The
  consumer side is not: **229 `light-dark()`** literals remain (109 in `dark-mode.css`, 64
  in `styles.css`, 56 in `.tsx`/`.ts`), and `dark-mode.css` is still a 469-line `.Mui*`
  sheet. Sequence its deletion with #709 so each override goes when its component does.
- **Responsive breakpoints.** ✅ Guarded: `MOBILE_BREAKPOINT_PX` feeds `wa-page` and
  `test/app-shell.test.ts` fails if `app-shell.css`'s two media queries drift. Still audit
  for others (`1366px`).
- **Collapse rail (57px).** ✅ Implemented via `--menu-width` and a `nav-collapsed` class,
  as recommended — *not* the mobile drawer. Note the source comment explaining why it is a
  class and not `data-toggle-nav` (§1.1).
- **CSP** — ➖ never a blocker for `wa-page`, and it did not block it. But it has been
  **promoted** as work: #684 closed the token-storage P0 on the strength of CSP tightening,
  and the shipped policy still allows `script-src 'unsafe-inline'` on the two SPA routes
  and `style-src-attr 'none'` against 20 live inline attributes. #685 is now the top item
  in report 00.
- **Bundle.** ✅ The entry chunk is **2,111.11 kB / 594.20 kB gzip**, down 66.6 % — Monaco
  now lazy-loads (#729). ⚠️ **Side effect:** `app-icons.ts` (216 KB) is now roughly a tenth
  of the entry chunk rather than a thirtieth, so **#731** is worth more than it was.
  `icon-library.ts`'s `?url` imports emit separate asset files rather than inlined base64 —
  another reason to prefer §6.4 step 3(a).
- 🆕 **The suite cannot see any of this.** `vitest.config.ts` runs with `css: false` and
  jsdom has no canvas backend, so every guard this layer has is a **source-scanning**
  test (`keep-theme.test.ts`, `theme-selectors.test.ts`, `shell-dead-code.test.ts`,
  `app-shell.test.ts`). They pin structure, not appearance. **A green suite is not evidence
  that a token change looks right** — and most of these screens sit behind login, so plan
  for a human click-through in both modes on anything that touches §4 or §6.

---

## 8. References

- WebAwesome `wa-page` slots/parts/attributes, layout utilities (`wa-stack/cluster/grid/split/flank/frame`, `wa-gap-*`), tokens, and the Pro-only component list — per the bundled `webawesome` and `webawesome-design` skills shipped inside `@awesome.me/webawesome@3.10.0` (`dist/skills/`). The Pro-only set is enumerated in `dist/skills/webawesome/references/choosing-components.md` under "A note on Pro"; `wa-page` is **not** in it, and there is **no** data grid or date picker in either tier.
- `reports/02-react-to-lit-webawesome.md` — component migration (prerequisite for §6 step 1; §6.2 is a prerequisite for P3).
- `reports/00-code-quality.md` — P0-2 (CSP, **withdrawn as worded** — the `vite.config.mts` key is dev-server only, but the production policy is `jar/config/config.json`, in this repo; see #685), P0-9 (WA base path, **done** — both `setBasePath` calls deleted in #673), P2-3 (bundle size).
- `reports/04-remove-react.md` — removing React / the Lit-native shell (end-state for §2.3).
- In-repo sources of truth cited above: `src/services/theme-service.ts`, `wa-color.ts`, `wa-typography.ts`, `editor-theme.ts`, `icon-library.ts`; `test/services/*.test.ts`; `src/styles/keep-overrides.css`, `dark-mode.css`, `styles.css`, `CommonStyles.tsx`; `vite.config.mts:29`.
