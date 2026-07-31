/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import '@awesome.me/webawesome/dist/components/page/page.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import './keep-footer';
import './keep-mobile-header';
import './keep-notification';
import './keep-profile-menu';
import './keep-profile-menu-dialog';
import './keep-side-nav';
import './keep-tooltip';
import { FA_LIBRARY } from '../../services/icon-library';
import {
  applyTheme,
  nextThemeMode,
  toThemeMode,
  THEME_MODE_UI
} from '../../services/theme-service';
import { getRouter } from '../../router/instance';
import { StoreController } from '../../store/StoreController';
import { store } from '../../store/store';
import { switchTheme } from '../../store/styles/action';
import keepLogo from '../../assets/KeepNewIcon.png';
import '../../styles/app-shell.css';

/**
 * The application shell for an authenticated session, built on `<wa-page>`. Tag:
 * `keep-app-shell`.
 *
 * `wa-page` owns the viewport and scaffolds the regions itself, so this element is a mapping
 * from the app's parts onto its slots rather than a layout. What it replaced (#707) —
 * `HomeElement`'s `AppContainer` flex row, the `RightPanel` `width: calc(100% - 241px|50px)`
 * arithmetic, `SideNavContainer`'s width animation and the whole duplicated `MobileSidebar` —
 * is deleted, not ported.
 *
 * Two regions are deliberately *not* used:
 *
 *   - `footer`. `keep-footer`'s bar is `position: fixed; bottom: 0` and 23px tall, which is
 *     where the `calc(100vh - 23px)` in this app's page-level rules comes from. Slotting it
 *     would add a grid row and change every one of them. It stays a fixed overlay outside the
 *     page element.
 *   - `subheader`. The obvious tenant is the breadcrumb strip, but it is rendered by
 *     `keep-views` inside that element's shadow root; hoisting it is its own change.
 *
 * ## This element renders into the light DOM, and it is the only one that does
 *
 * {@link createRenderRoot} returns `this`. Every other `keep-*` element in the tree has a
 * shadow root, and the standing rule when converting one is that its CSS moves into `static
 * styles` with it. That rule is right for a *component*; it is wrong here, because this
 * element's styling is the document's, not its own:
 *
 * - **`styles/app-shell.css` is almost entirely `wa-page::part(…)`.** Parts cross exactly one
 *   boundary from the tree containing the element, so those rules would still work from a
 *   shadow root — but they are the reason the file is plain CSS rather than Linaria, and
 *   moving them changes nothing about them.
 * - **Web Awesome's `native.css` styles bare `<button>` from `@layer wa-native`.** The three
 *   buttons below — logo, appearance toggle, collapse tab — take `height`,
 *   `font-size`/`font-weight`, `white-space`, `vertical-align`, `user-select` and their
 *   transitions from it, and only *some* of that is overridden by the classes on them. A
 *   shadow root drops the lot, and the visible half of the result is that the logo and the
 *   toggle stop being `--wa-form-control-height` tall.
 * - **Four utility classes come from `styles/styles.css`**: `medium-text`,
 *   `color-text-primary`, `text-bold` on the wordmark and `side-nav-logo-img` on the logo.
 *
 * So a shadow root would mean restating a third-party author-layer sheet and four global
 * utilities from memory, to gain encapsulation that the app's outermost chrome has no use
 * for. And the suite runs with `css: false`, so every part of getting that wrong is invisible
 * to it — this is precisely the failure `test/app-shell.test.ts`'s own preamble warns about.
 *
 * The one thing light DOM costs is a box: an unknown element is `display: inline` by default,
 * which would put `wa-page` inside an inline box. `app-shell.css` opens by setting this host
 * to `display: contents`, so the box tree is identical to the one React produced.
 *
 * ## The main region arrives as a property, not a slot
 *
 * {@link main} is a template, and the only two values it takes are `keep-views` and the
 * `/callback` landing. This element is chrome and has no opinion about either — and, more to
 * the point, it must not *import* either: `keep-app` code-splits the two apart (#974), and a
 * static import here would pull both into this chunk.
 *
 * A `<slot>` would express the same thing, but the natural spelling of it —
 * `<slot><keep-views></keep-views></slot>` — is a trap: slot fallback content is real DOM,
 * so `keep-views` would connect and start fetching even on `/callback`, where it is not what
 * is on screen. A property has no such shadow.
 *
 * ## There is no theme provider here (#709)
 *
 * This component mounted the app's last `ThemeProvider` and its last global-baseline
 * component, both from Material UI, and `theme.ts` existed only to feed them. All three are
 * gone. The provider had nothing left to theme, and the baseline was a *duplicate* of Web
 * Awesome's `native.css`, not an addition to it: the same `box-sizing`, the same zeroed
 * margins, the same font smoothing. It only appeared to be load-bearing because its Emotion
 * styles were injected last and unlayered, so they won over `native.css` at every declaration
 * the two shared.
 */

/**
 * Feeds `wa-page`'s `mobile-breakpoint`. `styles/app-shell.css` repeats the number in two
 * media queries (a media condition cannot read a custom property) and `test/app-shell.test.ts`
 * fails if they drift.
 */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Written in the same form as the query `wa-page` compiles into its shadow root from
 * `mobile-breakpoint`, so this element and the component agree on which side of 768 the
 * boundary pixel falls. MUI's `useMediaQuery('(max-width:768px)')`, which `HomeElement` used,
 * said "mobile" at exactly 768px where `wa-page` says "desktop".
 */
const MOBILE_QUERY = `(width < ${MOBILE_BREAKPOINT_PX}px)`;

@customElement('keep-app-shell')
export default class AppShell extends KeepElement {
  /** Light DOM — see the class note. `static styles` is deliberately absent with it. */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  /**
   * The main region's content: `keep-views` on every real route, the OIDC landing on
   * `/callback`. Supplied by `keep-app`; see the class note for why it is a property.
   */
  @property({ attribute: false }) accessor main: TemplateResult | typeof nothing = nothing;

  /** Collapsed is the initial state, as it was when this was `HomeElement`'s `open` flag. */
  @state() private accessor collapsed = true;

  /**
   * `wa-page` reflects the same state on its `view` attribute, but only after a
   * `ResizeObserver` has run — it renders `desktop` first regardless of width. `matchMedia`
   * is correct on the very first render, which is what the conditional regions below need.
   */
  @state() private accessor isMobile = false;

  private readonly themeMode = new StoreController(this, (s) => s.styles.themeMode);

  private readonly viewport = window.matchMedia(MOBILE_QUERY);

  private readonly onViewportChange = (): void => {
    this.isMobile = this.viewport.matches;
  };

  /** Guards the one-shot appearance sync against a reconnect. */
  private themeSynced = false;

  connectedCallback(): void {
    super.connectedCallback();
    // Read before subscribing: the width can change while the element is detached, and the
    // first render must not be built from a stale answer.
    this.isMobile = this.viewport.matches;
    this.viewport.addEventListener('change', this.onViewportChange);

    // Adopt the appearance the login page may have toggled, which writes localStorage only.
    // Once per element, as the mount-only effect it replaces was.
    if (!this.themeSynced) {
      this.themeSynced = true;
      const storedTheme = localStorage.getItem('theme') || 'default';
      if (storedTheme !== this.themeMode.value) store.dispatch(switchTheme(storedTheme));
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.viewport.removeEventListener('change', this.onViewportChange);
  }

  /**
   * Push the appearance to the document on the way *into* an update.
   *
   * Unconditional, and level-triggered rather than edge-triggered: `applyTheme` is documented
   * idempotent — two class/attribute writes and a `colorScheme` assignment — so it needs no
   * previous-value field. Before paint rather than after, or every toggle shows one frame of
   * the appearance being left.
   */
  protected willUpdate(): void {
    applyTheme(this.themeMode.value);
  }

  /**
   * The rail is a desktop affordance. On mobile the nav lives in `wa-page`'s drawer, where a
   * 57px rail would be nonsense, so the expanded rendering is forced there instead of
   * resetting {@link collapsed} — that way the desktop choice survives a trip through a narrow
   * viewport and back.
   */
  private get expanded(): boolean {
    return this.isMobile || !this.collapsed;
  }

  /**
   * Advance the appearance setting: light → dark → system → light (#962).
   *
   * Both destinations are written, because both are read: `localStorage` by
   * `appearance-boot` on the next load and by the system-preference listener, the store by this
   * element's own render and by {@link willUpdate}.
   */
  private readonly toggleTheme = (): void => {
    const next = nextThemeMode(this.themeMode.value);
    localStorage.setItem('theme', next);
    store.dispatch(switchTheme(next));
  };

  /**
   * The redirect half of signing out (#806).
   *
   * `keep-option-list` clears the session and emits `logout`; the event is composed, so it
   * crosses the profile elements' shadow roots and arrives here, which is where the handler is
   * bound. `getRouter()` rather than a `RouterController`: nothing here re-renders on the
   * location, so subscribing to it would buy only updates.
   */
  private readonly handleLogout = (): void => {
    getRouter().navigate('/');
  };

  /** A full reload of the deployment root, not an in-app navigation — as it always was. */
  private readonly goToOrigin = (): void => {
    window.location.href = window.location.origin;
  };

  private readonly toggleCollapsed = (): void => {
    this.collapsed = !this.collapsed;
  };

  render() {
    const { collapsed, expanded, isMobile } = this;
    // The glyph shows the *setting* — sun, moon or robot — and the label names what pressing
    // the button does next. Both come from one map, so they cannot disagree about the cycle.
    const theme = THEME_MODE_UI[toThemeMode(this.themeMode.value)];

    return html`
      <!--
        A class and not "data-toggle-nav": wa-page hides its own hamburger the moment it finds
        that attribute anywhere in its light DOM, which would leave mobile with no way to open
        the drawer. The rail is switched from here and read back through CSS only.
      -->
      <wa-page
        mobile-breakpoint="${MOBILE_BREAKPOINT_PX}px"
        class=${collapsed ? 'nav-collapsed' : ''}
      >
        <!--
          Mobile-only, because the desktop app has no top bar — #751 deleted the dead one. An
          empty header part measures 0px, so --header-height stays 0 on desktop.
        -->
        ${isMobile
          ? html`
              <div slot="header">
                <!-- The profile control crosses into keep-mobile-header as slotted light DOM,
                     which is what its unnamed slot is for. -->
                <keep-mobile-header>
                  <keep-profile-menu-dialog
                    @logout=${this.handleLogout}
                  ></keep-profile-menu-dialog>
                </keep-mobile-header>
              </div>
            `
          : nothing}

        <div slot="navigation-header" class="nav-header">
          <button
            type="button"
            class="nav-logo"
            aria-label="HCL Domino REST API home"
            @click=${this.goToOrigin}
          >
            <img class="keep-icon side-nav-logo-img" src=${keepLogo} alt="" />
          </button>
          ${expanded
            ? html`<span class="medium-text color-text-primary text-bold nav-title">
                HCL Domino REST API
              </span>`
            : nothing}
          <keep-tooltip content=${theme.action} placement="right">
            <button type="button" class="nav-theme-toggle" @click=${this.toggleTheme}>
              <!--
                No sizing attribute on either arm: ".nav-theme-toggle wa-icon" in app-shell.css
                sets 20px, and it is a descendant selector, so 20px is what this glyph has
                always rendered at.

                A label because the glyph is the button's only content — the icon shows the
                current setting, so the accessible name states the action instead, matching the
                tooltip above it word for word.

                canvas="auto" on both icons here, spelled out because the KeepIcon wrapper
                these replace defaulted to it and Web Awesome does not: WA's own default is
                "fixed", a 1.25em box that pads every glyph to a common width. Taking the
                library default would have widened both by 25 % — and the collapse tab below
                is 21px, so a 19px glyph in a 23.75px canvas would overflow it.
              -->
              <wa-icon
                library=${FA_LIBRARY}
                name=${theme.icon}
                label=${theme.action}
                canvas="auto"
              ></wa-icon>
            </button>
          </keep-tooltip>
        </div>

        <!--
          "expanded" is the only property left. The router used to come down here too, because
          keep-side-nav renders real anchors — the unsaved-changes guard, modified clicks and
          route prefetching all depend on that — and the one instance lived in React context.
          #926 made it a module singleton with a reactive controller over it, so the element
          reads it itself; that was the last property-passed router in the app.
        -->
        <div slot="navigation">
          <keep-side-nav ?expanded=${expanded}></keep-side-nav>
        </div>

        <div slot="navigation-footer">
          <keep-profile-menu ?expanded=${expanded} @logout=${this.handleLogout}></keep-profile-menu>
        </div>

        ${this.main}
        ${isMobile
          ? nothing
          : html`
              <button
                type="button"
                class="nav-collapse-toggle"
                aria-label=${collapsed ? 'expand menu' : 'collapse menu'}
                aria-expanded=${collapsed ? 'false' : 'true'}
                @click=${this.toggleCollapsed}
              >
                <!--
                  The modules were ChevronRightRounded and ChevronLeftRounded; the
                  Expand/Collapse aliases described the action, not the glyph. Font Awesome has
                  no rounded variant, so these are the square-ended chevrons.

                  No label — the button already carries an aria-label that switches with the
                  state, and a second name on the icon would only compete with it.
                -->
                <wa-icon
                  library=${FA_LIBRARY}
                  name=${collapsed ? 'chevron-right' : 'chevron-left'}
                  canvas="auto"
                ></wa-icon>
              </button>
            `}
      </wa-page>

      <!-- Both sit outside the page element on purpose: the toast is fixed to the top of the
           viewport and the footer is a fixed overlay. See the class note. -->
      <keep-notification></keep-notification>
      <keep-footer></keep-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app-shell': AppShell;
  }
}
