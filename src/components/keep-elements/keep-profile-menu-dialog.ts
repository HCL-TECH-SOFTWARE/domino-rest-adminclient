/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
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
 * The mobile header's profile control. Tag: `keep-profile-menu-dialog`.
 *
 * Slotted into `keep-mobile-header` by the shell, and shown only below `wa-page`'s mobile
 * breakpoint. It is the same card `keep-profile-menu` opens from the collapsed rail, hung
 * off the header bar instead — the two components have always been near-duplicates, and the
 * one thing they genuinely shared, reading the username out of the session token, is now
 * one function in `profile-user.ts` rather than two copies that had already drifted.
 *
 * ## Differences from what it replaces
 *
 *  - **The trigger is a button.** It was a bare glyph with a click handler: not focusable,
 *    not operable from a keyboard, and announced as an image rather than a control. The
 *    accessible name moves from the glyph to the button, and `aria-haspopup`/`aria-expanded`
 *    describe what the control does (#713).
 *  - **`data-testid="profileIcon"` is back.** It was lost when the glyph became a React icon
 *    entry point whose prop surface has no room for it; the button is where it belonged.
 *  - **The panel is `wa-popover`.** See `keep-profile-menu`'s class note for why — the short
 *    version is CSSOM positioning that the production CSP cannot silently drop, plus Escape
 *    and focus return, which the click-away wrapper it replaces did not provide.
 *  - **A token that does not parse no longer takes the header down.** The copy of the
 *    username reader that lived here had no `try`, so a truncated or stale token threw
 *    during render. The shared reader has the guard the sidenav copy always had.
 *
 * ## Navigation leaves through an event
 *
 * `keep-option-list` clears the session and emits `logout`; `KeepElement.emit` composes it,
 * so it crosses both shadow roots and surfaces on this host, where `KeepProfileMenuDialog`'s
 * `onLogout` is bound and the shell navigates. There is no Lit router controller to reach
 * for yet (#926).
 */
@customElement('keep-profile-menu-dialog')
export default class ProfileMenuDialog extends KeepElement {
  static styles = css`
    /* The document's border-box reset stops at the boundary, and the card below has
       padding. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: inline-flex;
    }

    /*
     * Required, not defensive. The popover module is fetched off the eager path, and until
     * it resolves the popover is an unknown element — an inline box that renders its
     * children as ordinary content, which here is the user's name and the sign-out list.
     */
    wa-popover:not(:defined) {
      display: none;
    }

    keep-tooltip {
      display: flex;
    }

    /*
     * The avatar button. Everything before cursor undoes the user-agent button box; none
     * of the app's own resets cross the shadow boundary. The 8px is what
     * .profile-menu-dialog-user contributed — the rest of that rule was a 115px phantom
     * bottom margin #707 already removed.
     */
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 0 0 8px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--wa-color-text-normal);
      font: inherit;
      cursor: pointer;
    }

    .avatar:focus {
      outline: none;
    }

    .avatar:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }

    /*
     * was the wa-size-xl utility, a font-size class that cannot cross the boundary. The
     * token can, so this is the same computed size — and the size the glyph has always
     * drawn, because the 36px .profile-menu-user-icon on the icon itself was outranked by
     * the icon library's own 1em and never applied.
     */
    .avatar wa-icon {
      font-size: var(--wa-font-size-xl);
    }

    /*
     * The card. Padding and radius are the panel's; the surface is the one the card's inner
     * container already asked for, and the arrow is given the same value so the two do not
     * part company in dark mode.
     */
    wa-popover::part(body) {
      padding: 30px;
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
      margin-bottom: 60px;
    }

    /* was .medium-text (16px); the .weight-700 beside it names no rule in any stylesheet in
       the tree, so the name has never been bold and is not made bold here. */
    .name {
      font-size: 16px;
    }

    /* was .text-13 */
    .role {
      font-size: 13px;
    }
  `;

  /**
   * Which of two token shapes is in storage. The shell has no selector for it and passes
   * nothing down, so the element owns it — and it is a boolean, which is what the
   * controller's `Object.is` check wants.
   */
  private readonly idpLogin = new StoreController(this, (state) => state.account.idpLogin);

  /** Mirrors the popover so the trigger can carry `aria-expanded`. */
  @state() private accessor menuOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    // Off the eager path — see load-popover.ts. Nothing awaits it: the popover starts
    // closed, and the :not(:defined) rule keeps it out of the layout until it upgrades.
    void loadPopover();
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
      <keep-tooltip placement="right" content="Profile">
        <button
          id=${TRIGGER_ID}
          class="avatar"
          type="button"
          data-testid="profileIcon"
          aria-label="Profile"
          aria-haspopup="dialog"
          aria-expanded=${this.menuOpen ? 'true' : 'false'}
        >
          <!-- Decorative: the button around it carries the accessible name. -->
          <wa-icon library=${FA_LIBRARY} name="circle-user" canvas="auto"></wa-icon>
        </button>
      </keep-tooltip>

      <wa-popover
        for=${TRIGGER_ID}
        placement="bottom-end"
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
    'keep-profile-menu-dialog': ProfileMenuDialog;
  }
}
