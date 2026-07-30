/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';
import { store } from '../../store/store';
import { logout } from '../../store/account/action';

/** The event name is the whole signal — signing out carries no payload. */
export type KeepOptionListLogoutDetail = undefined;

/**
 * The profile menu's option list: one option, Sign Out.
 * Tag: `keep-option-list`. Exposed via `KeepElements.tsx` as `KeepOptionList`.
 *
 * Rendered in three places, all of them still React and all of them profile UI:
 * `ProfileMenu` renders it inline when the sidenav is open and again inside its collapsed-rail
 * popover, and `ProfileMenuDialog` renders it in the mobile header's popover.
 *
 * ## Navigation moves up to the parent, it does not come down here
 *
 * The React version called `useNavigate()` and did `dispatch(logout()); navigate('/')`. There is
 * no Lit router controller in this codebase — the router is handed out through React context
 * with no module-level instance, so an element cannot reach it. Same resolution as
 * `keep-schemas-multi-view`: the element emits `logout` and the still-React parent navigates.
 *
 * **The order matters and is preserved.** `logout()` is a thunk whose `fetch` is only awaited
 * inside it, so the original navigated *before* the auth state was cleared. `store.dispatch` and
 * `emit` are both synchronous and run in that same order here, and the parent's handler runs
 * synchronously inside `emit`, so the sequence a user sees is unchanged.
 *
 * ## Why the store is imported directly instead of through StoreController
 *
 * This element dispatches and never selects — the parents keep their own `state.account`
 * subscription for the username. A controller with no selector would only add a subscription
 * that can never fire.
 *
 * ## The `toggleMenu` prop is gone, and it never did anything
 *
 * `OptionListProps` declared `toggleMenu`, both parents passed a setter for their popover's open
 * state (`setPopperOpen` / `setOpen`), and the component body destructured nothing and never
 * called it. So the popover has never closed on sign-out; navigating to `/` unmounts the sidenav
 * instead. Dropping the prop rather than wiring it up keeps that behaviour — closing the popover
 * from the new `logout` handler would be a fix, not a conversion, and belongs in its own change.
 */
@customElement('keep-option-list')
export default class OptionList extends KeepElement {
  static styles = css`
    /* was OptionListContainerRoot; OptionListContainer, which it extended, was empty */
    :host {
      display: block;
      width: 100%;
      max-width: 360px;
    }

    /*
     * was .option-list-container-button plus the flex/justify-center/gap-2/items-center
     * utilities, and — less obviously — Web Awesome's bare button rule in @layer wa-native,
     * which no longer reaches in here. The app class is unlayered, so where the two collided
     * (width/height, radius, background, colour, weight) the app class already won and those
     * values are what is restated; the rest of the native rule (padding, family, borders,
     * transition, cursor) is carried over because it did apply.
     *
     * box-sizing is explicit: the document's border-box reset stops at the shadow boundary, and
     * without it the 1px border would push the box past 181x42.
     *
     * The crimson is a literal rather than a token on purpose. It is not the brand ramp (that is
     * purple), it has no dark-mode override in any stylesheet, and it carries white text at
     * 6.9:1 in both modes — so there is nothing mode-aware to reach for and swapping in a token
     * would change the colour.
     */
    .sign-out {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;

      width: 181px;
      height: 42px;
      padding: 0 var(--wa-form-control-padding-inline);

      border-style: var(--wa-border-style);
      border-width: max(1px, var(--wa-form-control-border-width));
      border-color: transparent;
      border-radius: 20px;

      background: #aa1f51;
      color: #fff;

      /* font-size too: the native rule read --wa-form-control-value-font-size, which Web
         Awesome never defines, so the declaration was invalid at computed-value time and the
         button inherited. Saying so explicitly keeps that true across the shadow boundary. */
      font-family: inherit;
      font-size: inherit;
      font-weight: 700;
      white-space: nowrap;

      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;

      transition-property: background, border, box-shadow, color;
      transition-duration: var(--wa-transition-fast);
      transition-timing-function: var(--wa-transition-easing);
    }

    .sign-out:focus {
      outline: none;
    }

    .sign-out:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }

    /*
     * The native rule's hover half is not reproduced: it recoloured the background, and the
     * unlayered .option-list-container-button outranked it, so hover has never changed colour
     * here. Only the active nudge survived, and it does.
     */
    .sign-out:active {
      transform: var(--wa-button-transform-active);
    }

    @media (prefers-reduced-motion: reduce) {
      .sign-out:active {
        transform: none;
      }
    }

    /* was .profile-menu-user-icon — a genuine 36px box around the glyph, unlike the two
       profile components that put the same class on the icon itself. */
    .icon-box {
      width: 36px;
      height: 36px;
    }

    /* was size='xl' (the .wa-size-xl utility, a font-size class that cannot cross the
       boundary) and the .mt-5 utility. */
    .icon-box wa-icon {
      font-size: var(--wa-font-size-xl);
      margin-top: 5px;
    }

    /* was .small-text */
    .label {
      font-size: 14px;
    }
  `;

  /**
   * Clears the session, then tells the parent to leave the page — in that order, which is the
   * order the React version used. The thunk's network call is not awaited by either version.
   */
  private signOut(): void {
    store.dispatch(logout());
    this.emit<KeepOptionListLogoutDetail>('logout');
  }

  render() {
    return html`
      <button type="button" class="sign-out" data-testid="signOut" @click=${this.signOut}>
        <div class="icon-box">
          <!--
            The glyph is the exit-door one. No label: the icon is decorative here because
            "SIGN OUT" is right beside it and is what names the button. canvas="auto" keeps the
            1em box the icon set this replaced drew, matching the React icon entry point's
            default.
          -->
          <wa-icon library=${FA_LIBRARY} name="right-from-bracket" canvas="auto"></wa-icon>
        </div>
        <span class="label">SIGN OUT</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-option-list': OptionList;
  }
}
