/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { loadPopover } from './load-popover';
import { KeepElement } from './keep-element';
import './keep-option-list';
import './keep-tooltip';
import { readCurrentUser } from './profile-user';
import { FA_LIBRARY } from '../../services/icon-library';
import { StoreController } from '../../store/StoreController';

/** Anchors the popover to the avatar. Scoped to this shadow root, so it collides with nothing. */
const TRIGGER_ID = 'profileTrigger';

/**
 * The profile block in the sidenav's footer region. Tag: `keep-profile-menu`.
 *
 * One element serves both rail states, which is the whole point of the component it
 * replaces: the avatar stays mounted in a stable position so the username, the
 * "Administrator" label and the Sign Out button can fade and collapse in step with
 * `--menu-width`, instead of the icon disappearing and reappearing mid-animation.
 *
 * ## Navigation still leaves through an event, and now travels one hop further
 *
 * `keep-option-list` dispatches the logout thunk itself and emits `logout`. Until this
 * conversion the still-React parent here caught that event and called the router. This
 * element cannot: the router is published through React context with no module-level
 * instance and there is no Lit router controller yet (#926), the same wall
 * `keep-side-nav` and `keep-schemas-multi-view` hit.
 *
 * So the event keeps going. `KeepElement.emit` sets `composed: true`, so `logout` leaves
 * `keep-option-list`'s shadow root, crosses this one, and surfaces on the host — where
 * `KeepProfileMenu`'s `onLogout` is bound and the shell navigates. Nothing is re-emitted
 * and nothing is stopped; the ordering `keep-option-list` documents (dispatch, then the
 * parent's redirect, both synchronous) is unchanged by the extra hop.
 *
 * ## The avatar is a real button, and it is `inert` when the rail is open
 *
 * It used to be a `<div onClick>`: no role, no name, no keyboard path. A `<button>` fixes
 * all three (#713) but raises a question the div never had to answer — when the rail is
 * expanded there is no menu to open, and a focusable control that does nothing is worse
 * than no control.
 *
 * Rendering the button only in the collapsed state would answer it, but it also destroys
 * and recreates the node on every toggle, which kills the transitions this component
 * exists to protect. `inert` gives both: one stable node, dropped from the tab order and
 * from the accessibility tree exactly while it has nothing to do.
 *
 * ## The popover is `wa-popover`, not a hand-positioned panel
 *
 * The panel has to escape `wa-page::part(menu)`, which sets `overflow-x: hidden` — that is
 * why the original portalled a floating menu out to the document. `wa-popover` clears it
 * with a `position: fixed` dialog and brings three things a hand-rolled popup would have
 * to reinvent:
 *
 *  - **Positioning through the CSSOM.** Its `wa-popup` writes `style.setProperty`, so the
 *    production CSP's `style-src-attr 'none'` cannot silently drop it (#685).
 *  - **Dismissal.** Outside click and Escape, with focus returned to the trigger. The
 *    original had the first only, through a click-away wrapper.
 *  - **Nothing leaves this shadow root.** The panel is `wa-popover`'s own shadow DOM and
 *    the card is slotted light DOM, so `static styles` below still reaches all of it —
 *    unlike a node appended to `document.body`, whose rules would need a document sheet.
 *
 * Two deliberate differences from the panel it replaces: it has `wa-popover`'s arrow, which
 * matters more now that the anchor is a 24px glyph in a 57px rail, and the trigger carries
 * `aria-expanded`, which the div never could.
 *
 * ## The text on the gradient is mode-invariant now, and that is a dark-mode fix
 *
 * Both labels were `.color-text-primary`, i.e. `#000` in light and `#e0e0e0` in dark. The
 * sidenav gradient has **no dark variant** (see `keep-theme.css`), so those two colours land
 * on the same background — and this block sits at the gradient's bottom, which is `#8cc7f9`.
 * Measured against it: `#000` is 11.7:1 and `#e0e0e0` is 1.35:1. Dark mode has been
 * illegible here for as long as the token has been mode-aware.
 *
 * There is nothing mode-aware to point at when the background is not, so the colour is a
 * literal — the same reasoning `keep-option-list` records for its crimson. Light mode
 * renders exactly as it does today; dark mode stops being a contrast failure.
 *
 * The popover card is the opposite case: it sits on `--wa-color-surface-raised`, which *is*
 * mode-aware, so its text reads `--wa-color-text-normal` and both modes follow the surface.
 */
@customElement('keep-profile-menu')
export default class ProfileMenu extends KeepElement {
  static styles = css`
    /* The document's border-box reset stops at the boundary, and the card below has both a
       min-width and padding. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
    }

    /*
     * Dark on the pale end of the sidenav gradient, in both appearances. See the class note
     * for the measurement; this is not a token because the background it sits on is not
     * mode-aware either.
     */
    .profile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin: 0 0 30px;
      padding: 0;
      overflow: hidden;
      color: #000;
      /* Animate the horizontal padding so the avatar glides into place rather than jumping.
         The duration is the sidenav's own open timing, which is what the component this
         replaces used in both directions. */
      transition: padding 225ms ease-in;
    }

    .profile.expanded {
      align-items: center;
      padding: 0 20px;
    }

    .avatar-row {
      display: flex;
      width: 100%;
      align-items: center;
      margin-bottom: 0;
      transition: margin-bottom 225ms ease-in;
    }

    .profile.expanded .avatar-row {
      margin-bottom: 20px;
    }

    keep-tooltip {
      display: flex;
    }

    /*
     * The avatar button. Everything before cursor is undoing the user-agent button box —
     * none of the app's own resets cross the shadow boundary. The 8px collapsed offset is
     * the spacing the mobile header uses from the left edge of the 57px rail, so the glyph
     * does not shift as the rail opens and closes.
     */
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 0 0 8px;
      padding: 10px;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: margin-left 225ms ease-in;
    }

    .profile.expanded .avatar {
      margin-left: 0;
      cursor: default;
    }

    .avatar:focus {
      outline: none;
    }

    /* The user-agent ring is a thin dark outline, which on this gradient is close to
       invisible. */
    .avatar:focus-visible {
      outline: 2px solid #000;
      outline-offset: 2px;
    }

    /*
     * was the wa-size-xl utility, a font-size class that cannot cross the boundary. The
     * token can, so this is the same computed size — and the size the glyph has always
     * drawn, because the 36px .profile-menu-user-icon on the icon itself was outranked
     * by the icon library's own 1em and never applied.
     */
    .avatar wa-icon {
      font-size: var(--wa-font-size-xl);
    }

    /*
     * Username and role. There is no width animation to write: the row is 100% of a column
     * whose width is already being animated by wa-page::part(body), so this box shrinks
     * with the rail for free. min-width: 0 lets it shrink past its text and the clip
     * happens on .profile, which is what keeps partial letters out of the 57px rail.
     *
     * visibility rather than opacity alone: at zero opacity the labels are still in the
     * accessibility tree, and the rail is meant to have dropped them.
     */
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      margin-left: 0;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 195ms ease-in,
        margin-left 195ms ease-in,
        visibility 0s linear 195ms;
    }

    .profile.expanded .info {
      margin-left: 16px;
      opacity: 1;
      visibility: visible;
      transition:
        opacity 225ms ease-in,
        margin-left 225ms ease-in,
        visibility 0s;
    }

    /* was .medium-text (16px) and .nowrap; the .weight-700 beside them names no rule in any
       stylesheet in the tree, so the name has never been bold and is not made bold here. */
    .name {
      font-size: 16px;
      white-space: nowrap;
    }

    /* was .text-13 */
    .role {
      font-size: 13px;
    }

    /*
     * The inline Sign Out, shown when the rail is open. grid-template-rows: 0fr -> 1fr is
     * the animatable spelling of height auto, so the row collapses without this element
     * having to know how tall keep-option-list is.
     */
    .actions {
      display: grid;
      grid-template-rows: 0fr;
      width: 100%;
      opacity: 0;
      visibility: hidden;
      transition:
        grid-template-rows 195ms ease-in,
        opacity 195ms ease-in,
        visibility 0s linear 195ms;
    }

    .profile.expanded .actions {
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
      transition:
        grid-template-rows 225ms ease-in,
        opacity 225ms ease-in,
        visibility 0s;
    }

    .actions-inner {
      display: flex;
      justify-content: center;
      min-height: 0;
      overflow: hidden;
    }

    /*
     * The popover card. Padding, radius and min-width are the panel's; the surface is the
     * one the card's inner container already asked for, and the arrow is given the same
     * value so the two do not part company in dark mode.
     */
    /*
     * Required, not defensive. The popover module is fetched off the eager path, and until
     * it resolves the popover is an unknown element — an inline box that renders its
     * children as ordinary content. Its children here are the user's name and the sign-out
     * list, so without this they flash inline under the avatar on every load.
     */
    wa-popover:not(:defined) {
      display: none;
    }

    wa-popover::part(body) {
      min-width: 220px;
      padding: 24px;
      border-radius: var(--wa-border-radius-l);
      background-color: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
    }

    wa-popover::part(popup__arrow) {
      background-color: var(--wa-color-surface-raised);
    }

    .card-user {
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-bottom: 24px;
    }
  `;

  /** True when the rail shows its labels; false for the 57px collapsed rail. */
  @property({ type: Boolean }) accessor expanded = false;

  /**
   * Which of two token shapes is in storage. The shell has no selector for it and passes
   * nothing down, so the element owns it — and it is a boolean, which is what the
   * controller's `Object.is` check wants.
   */
  private readonly idpLogin = new StoreController(this, (state) => state.account.idpLogin);

  /** Mirrors the popover so the trigger can carry `aria-expanded`. */
  @state() private accessor menuOpen = false;

  /*
   * Named `popoverEl`, not `popover`. `popover` is a standard `HTMLElement` property
   * (`string | null`, the Popover API attribute), so a private field of that name shadows it
   * with an incompatible type and the class stops satisfying `LitElement` — which surfaces
   * far away, as a `TS2344` on every `mountLit<ProfileMenu>` in the test file.
   */
  @query('wa-popover') private accessor popoverEl!: (HTMLElement & { open: boolean }) | null;

  connectedCallback(): void {
    super.connectedCallback();
    // Off the eager path — see load-popover.ts. Nothing awaits it: the popover starts
    // closed, and the style rule below keeps it out of the layout until it upgrades.
    void loadPopover();
  }

  protected updated(changed: PropertyValues): void {
    // Opening the rail while the popover is up would leave a card duplicating what is now
    // shown inline. Clicking the collapse toggle dismisses it as an outside click anyway;
    // this covers the path that has no click at all — crossing the mobile breakpoint, where
    // the shell forces the expanded rendering.
    const popover = this.popoverEl;
    if (changed.has('expanded') && this.expanded && popover?.open) {
      popover.open = false;
    }
  }

  private readonly onMenuShow = (): void => {
    this.menuOpen = true;
  };

  private readonly onMenuHide = (): void => {
    this.menuOpen = false;
  };

  render() {
    const user = readCurrentUser(this.idpLogin.value);

    return html`
      <div class="profile ${this.expanded ? 'expanded' : 'collapsed'}">
        <div class="avatar-row">
          <keep-tooltip placement="right" content=${this.expanded ? '' : 'Profile'}>
            <button
              id=${TRIGGER_ID}
              class="avatar"
              type="button"
              data-testid="profileIcon"
              aria-label="Profile"
              aria-haspopup="dialog"
              aria-expanded=${this.menuOpen ? 'true' : 'false'}
              ?inert=${this.expanded}
            >
              <!-- Decorative: the button around it carries the accessible name. -->
              <wa-icon library=${FA_LIBRARY} name="circle-user" canvas="auto"></wa-icon>
            </button>
          </keep-tooltip>

          <div class="info">
            <span class="name">${user}</span>
            <span class="role">Administrator</span>
          </div>
        </div>

        <div class="actions">
          <div class="actions-inner">
            <keep-option-list></keep-option-list>
          </div>
        </div>
      </div>

      <!--
        Outside .profile, which clips its overflow. A fixed-position dialog is not clipped by
        an ancestor's overflow, so this would work either way, but keeping it out of the
        clipping box removes the question.
      -->
      <wa-popover
        for=${TRIGGER_ID}
        placement="right-end"
        @wa-show=${this.onMenuShow}
        @wa-hide=${this.onMenuHide}
      >
        <div class="card-user">
          <span class="name">${user}</span>
          <span class="role">Administrator</span>
        </div>
        <keep-option-list></keep-option-list>
      </wa-popover>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-profile-menu': ProfileMenu;
  }
}
