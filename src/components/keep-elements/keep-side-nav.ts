/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import './keep-tooltip';
import { FA_LIBRARY } from '../../services/icon-library';
import { store } from '../../store/store';
import { showPages } from '../../store/account/action';
import { fetchKeepDatabases } from '../../store/databases/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { StoreController } from '../../store/StoreController';
import { appRoutes as routes, apps, databases, settings, type NavRoute } from '../sidenav/Routes';
import type { Router } from '../../router/router';

/**
 * The route list in `wa-page`'s `navigation` slot. Tag: `keep-side-nav`.
 *
 * Replaces `components/sidenav/SideNav.tsx`, which was a Material UI `List` of
 * `ListItemButton`s inside router `NavLink`s. (Those package names are described rather than
 * written literally: the per-file gate for this pass is a raw grep for them.)
 *
 * `expanded` no longer drives any width — `--menu-width` on `<wa-page>` does, and the paint is
 * `::part(menu)` in `styles/app-shell.css`. It survives only so the separator above the first
 * item can differ between the 57px rail and the open menu, which is what it did before.
 *
 * ## The router arrives as a property, because there is still no controller for it
 *
 * `Router` (`router/router.ts`) is deliberately framework-free and says a Lit reactive
 * controller will subscribe to it when the views convert. That controller does not exist, and
 * the one live instance is created in `App.tsx` and handed out through React context, so an
 * element cannot reach it on its own. Every other converted element has answered this by
 * emitting an event and letting the still-React parent navigate — which does not work here,
 * because these are **real anchors** and three things depend on that:
 *
 *   1. `NavigationGuardContext` catches in-app navigation with a document-level capture
 *      listener that looks for an `<a href>` on the composed path. Without an anchor the
 *      unsaved-changes prompt stops appearing and a half-edited form is discarded silently.
 *   2. Middle-click, modified click and "copy link address" only work on a real `href`, and the
 *      href needs the router's basename.
 *   3. Hover prefetching of the route chunk (#813) is a `Router.prefetch` call.
 *
 * So the shell passes the instance down instead. That is the smallest thing that keeps all
 * three, and when the reactive controller lands this element is its first customer: delete the
 * property, the subscription and the two helpers below.
 *
 * ## Four rules in the old stylesheet were dead, and this element does not reproduce dead rules
 *
 * Moving into a shadow root forces a decision on every declaration, and four of these had
 * stopped matching when the app moved off Material UI v4 — they name v4 class names that the
 * installed major does not emit. Each is reproduced here **as it was written**, not as it
 * rendered, and the difference is visible. Listed so a reviewer can check them deliberately:
 *
 * | Rule as written | What actually renders today | Here |
 * |---|---|---|
 * | route label white on the gradient | black in light mode, `#e0e0e0` in dark | white |
 * | item hover `--keep-sidenav-hover` | the framework's own 4 % black wash | the token |
 * | Quick Config glyph, from its own class | black / `#e0e0e0` | white, like the other five |
 * | current item gets a left bar and a navy fill | nothing; no node ever carried the class | applied |
 *
 * The first three are contrast failures on a purple-to-blue gradient. The fourth is the only
 * indication of which page you are on, and the class it needed was never set: the four call
 * sites passed `route-active`, and one of them compared `full-width /schema` against `/schema`
 * so it never matched anything at all. `aria-current` is computed here and drives both the
 * paint and the accessible state, so the two cannot drift apart again.
 *
 * ## Smaller differences, all deliberate
 *
 * - **One tab stop per item, not two.** The old markup nested a `tabindex="0"` button inside
 *   the anchor, so keyboard users pressed Tab twice per route.
 * - **The list is a list.** It was a `<ul>` whose children were anchors; it is now
 *   `<nav><ul><li>`, and the nav is labelled.
 * - **The spacer above the first item is inert.** It was an empty focusable button.
 * - **Schemas and Scopes move 4px left**, onto the same text origin as the other four. They
 *   were the two labels that never carried the class holding the -4px nudge.
 * - **The labels take the app's body font.** They were the last thing on screen still asking
 *   for the framework's default family, which is not installed and fell back to Arial.
 */

/**
 * How long a pointer must rest on a link before it counts as intent to go there (#813).
 *
 * The same 80ms `router/react.tsx` uses for `Link`, restated because its hook is React and
 * local to that module. Both should become one helper when `keep-link` lands.
 */
const PREFETCH_INTENT_MS = 80;

/** `navigator.connection`, which TypeScript's DOM lib does not declare. */
type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** Whether speculative fetching is welcome on this connection. Mirrors `router/react.tsx`. */
const prefetchIsWelcome = (): boolean => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== '2g' && connection.effectiveType !== 'slow-2g';
};

@customElement('keep-side-nav')
export default class SideNav extends KeepElement {
  static styles = css`
    /*
     * The document's border-box reset does not cross a shadow boundary, and every item here
     * has both a width and inline padding.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
    }

    .nav {
      display: flex;
      flex-direction: column;
      /* was the list's 8px block padding, with the 10px top the sidenav overrode it with. */
      margin: 0;
      padding: 10px 0 8px;
    }

    /* A bare ul keeps its user-agent bullets and 40px inline padding in here. */
    .items {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    /*
     * was the empty button at the top of the list: no content, 8px of block padding, and one of
     * two top margins depending on the rail. Not focusable any more; it never did anything.
     */
    .spacer {
      height: 16px;
    }

    .spacer.expanded {
      margin-top: 26px;
    }

    .spacer.collapsed {
      margin-top: 50px;
    }

    keep-tooltip {
      display: block;
    }

    /*
     * One row. Was an anchor wrapping a button whose padding, flex box and hover this restates.
     *
     * The left border is transparent on every row and coloured on the current one, so the
     * active state costs no horizontal shift — the old rule added 3px and paid for it with a
     * -4px nudge on a selector that did not match either.
     */
    .item {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: flex-start;
      padding: 8px 16px;
      border: 0;
      border-left: 3px solid transparent;
      background: none;
      color: var(--keep-sidenav-on);
      font-family: inherit;
      font-size: 16px;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .item:hover {
      background: var(--keep-sidenav-hover);
    }

    /*
     * An explicit ring. The user-agent default is a thin dark outline, which on this gradient is
     * most of the way to invisible.
     */
    .item:focus-visible {
      outline: 2px solid var(--keep-sidenav-on);
      outline-offset: -4px;
    }

    .item[aria-current='page'] {
      border-left-color: var(--keep-sidenav-border);
      background: var(--keep-sidenav-active);
    }

    /*
     * 56px, not the framework's own 36px: the labels have to start well outside the 57px rail so
     * no glyph peeks through while the width animates.
     */
    .icon {
      display: inline-flex;
      flex-shrink: 0;
      min-width: 56px;
    }

    /*
     * was the wa-size-xl utility. Those live in a Web Awesome cascade layer and a class does not
     * cross a shadow boundary; the token it sets does, so this is the same computed size.
     * Colour comes from here because the icon paints from currentColor and this element is the
     * one place that knows it sits on the sidenav gradient.
     */
    .icon wa-icon {
      color: var(--keep-sidenav-on);
      font-size: var(--wa-font-size-xl);
    }

    /*
     * was the text box plus the sidenav's own link class. NO BACKTICKS IN THIS BLOCK - one
     * ends the css template and the file stops parsing.
     *
     * Deliberately not nowrap: a single-word label overflows the 57px rail and is clipped by
     * the menu part, which is what it did before. Forcing nowrap would also pull Quick Config
     * back onto one line in the rail, where its space lets it wrap onto two today.
     */
    .label {
      flex: 1 1 auto;
      min-width: 0;
      margin: 4px 0 4px -4px;
      font-size: 16px;
      font-weight: 400;
      letter-spacing: 0.00938em;
      line-height: 1.5;
    }

    /*
     * The separator was a zero-height rule with the framework's default divider colour. That
     * colour is a palette default and this app never sets the palette's mode, so it was the
     * light-mode value in both appearances — restated as the literal it resolved to rather than
     * pointed at a token that would change it.
     */
    .divider {
      height: 0;
      margin: 0;
      border: 0;
      border-bottom: thin solid rgb(0 0 0 / 12%);
    }
  `;

  /** True when the menu shows its labels; false for the 57px rail. */
  @property({ type: Boolean }) accessor expanded = false;

  /** The app's one {@link Router}. See the class note for why it comes down as a property. */
  @property({ attribute: false }) accessor router: Router | null = null;

  /**
   * Which entries the deployment's `adminui.json` turns on. The shell has no selector for this,
   * so the element owns it; the object is only replaced by `setNavItems`, which is what the
   * controller's identity check needs.
   */
  private readonly navitems = new StoreController(this, (state) => state.account.navitems);

  @state() private accessor pathname = '';

  private routerUnsubscribe?: () => void;

  private prefetchTimer?: ReturnType<typeof setTimeout>;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.router && !this.routerUnsubscribe) this.watchRouter();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.routerUnsubscribe?.();
    this.routerUnsubscribe = undefined;
    this.cancelPrefetch();
  }

  protected willUpdate(changed: PropertyValues): void {
    // `@lit/react` assigns properties from a layout effect, i.e. after the element is already
    // connected, so the router is not there yet when `connectedCallback` runs.
    if (changed.has('router')) this.watchRouter();
  }

  /** Was the mount effect. Publishes which nav entries this deployment allows. */
  protected firstUpdated(): void {
    store.dispatch(showPages());
  }

  private watchRouter(): void {
    this.routerUnsubscribe?.();
    this.routerUnsubscribe = undefined;
    const router = this.router;
    if (!router) return;
    this.pathname = router.location().pathname;
    this.routerUnsubscribe = router.subscribe(() => {
      this.pathname = router.location().pathname;
    });
  }

  /**
   * "The current path is at or below `to`", so `/schema/orders.nsf/Alpha` keeps Schemas lit.
   * `/` is exact, or it would match everything. Same rule the router's own nav link applies.
   */
  private isCurrent(uri: string): boolean {
    if (uri === '/') return this.pathname === uri;
    return this.pathname === uri || this.pathname.startsWith(`${uri}/`);
  }

  private href(uri: string): string {
    return this.router?.href(uri) ?? uri;
  }

  private onLinkClick(event: MouseEvent, uri: string): void {
    if (!this.router) return;
    // Anything that is not a plain left-click belongs to the browser: modified clicks open tabs
    // and windows, and swallowing them would break that.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.router.navigate(uri);
  }

  private startPrefetch(uri: string): void {
    if (this.prefetchTimer !== undefined || !this.router || !prefetchIsWelcome()) return;
    this.prefetchTimer = setTimeout(() => {
      this.prefetchTimer = undefined;
      this.router?.prefetch(uri);
    }, PREFETCH_INTENT_MS);
  }

  private readonly cancelPrefetch = (): void => {
    if (this.prefetchTimer === undefined) return;
    clearTimeout(this.prefetchTimer);
    this.prefetchTimer = undefined;
  };

  /**
   * Quick Config is the one item that is not a route. It fills the database list on first open
   * — the flag is read straight off the store rather than through a second controller, because
   * a handler-only read does not need a subscription and re-rendering the whole rail when a
   * fetch settles is work for nothing.
   */
  private readonly onQuickConfig = (): void => {
    if (!store.getState().databases.databasePull) {
      store.dispatch(fetchKeepDatabases());
    }
    store.dispatch(toggleQuickConfigDrawer());
  };

  /**
   * One route row.
   *
   * The glyph carries no accessible name: the label beside it names the link, and a second name
   * would only compete with it. `canvas="fixed"` is the 1.25em box that lines the six glyphs up
   * in a column — they differ in natural width, `list-ul` being a full em and `bolt` about 0.7.
   */
  private renderRoute(route: NavRoute) {
    const current = this.isCurrent(route.uri);
    return html`
      <li>
        <keep-tooltip placement="right" content=${route.label}>
          <a
            class="item"
            href=${this.href(route.uri)}
            aria-current=${current ? 'page' : nothing}
            @click=${(event: MouseEvent) => this.onLinkClick(event, route.uri)}
            @pointerenter=${() => this.startPrefetch(route.uri)}
            @pointerleave=${this.cancelPrefetch}
            @focus=${() => this.startPrefetch(route.uri)}
            @blur=${this.cancelPrefetch}
          >
            <span class="icon">
              <wa-icon library=${FA_LIBRARY} name=${route.icon} canvas="fixed"></wa-icon>
            </span>
            <span class="label">${route.label}</span>
          </a>
        </keep-tooltip>
      </li>
    `;
  }

  render() {
    const navitems = this.navitems.value;
    return html`
      <nav class="nav" aria-label="Main">
        <div class="spacer ${this.expanded ? 'expanded' : 'collapsed'}"></div>
        <ul class="items">
          ${routes.map((route) => this.renderRoute(route))}
          ${navitems.databases ? databases.map((route) => this.renderRoute(route)) : nothing}
          <li>
            <keep-tooltip placement="right" content="Quick Config">
              <button class="item" type="button" @click=${this.onQuickConfig}>
                <span class="icon">
                  <wa-icon library=${FA_LIBRARY} name="bolt" canvas="fixed"></wa-icon>
                </span>
                <span class="label">Quick Config</span>
              </button>
            </keep-tooltip>
          </li>
          ${navitems.apps ? apps.map((route) => this.renderRoute(route)) : nothing}
        </ul>

        <hr class="divider" />

        ${
          /* Mail is intentionally disabled pending LABS-1214 (see #698).
             The `false` is the feature switch; restore it to a real
             condition when the page is re-enabled. */
          // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
          false
            ? html`<ul class="items">
                ${settings.map((route) => this.renderRoute(route))}
              </ul>`
            : nothing
        }
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-side-nav': SideNav;
  }
}
