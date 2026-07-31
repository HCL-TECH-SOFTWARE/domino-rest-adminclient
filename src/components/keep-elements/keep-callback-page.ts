/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { handleCallback } from '../login/pkce';
import { loginWithPkce } from '../../store/account/action';
import { deepEqual } from '../../utils/common';
import { getLogger } from '../../services/log-service';
import { store } from '../../store/store';

const log = getLogger('components/keep-elements/keep-callback-page');

/** The messages this screen can show, in the order the exchange reaches them. */
const WAITING = 'Waiting to be authenticated...';
const ALREADY = 'Already successfully authenticated.';
const TOKEN_FAILED = 'Error fetching token. Please try again.';
const AUTH_FAILED = 'Error authenticating. Please try again.';
const SUCCESS = 'Successfully authenticated! You can now access Admin UI.';

/**
 * The OIDC redirect landing. Tag: `keep-callback-page`.
 *
 * Replaces `components/login/CallbackPage.tsx`. The identity provider sends the browser
 * back here with either a `code` to exchange or an `error` to report; this element runs the
 * PKCE exchange, stores the token, tells the store the session is authenticated, and then
 * asks its host to leave.
 *
 * ### It does not navigate — it says it is finished
 *
 * The React version called `navigate('/')`. An element cannot: the router is published
 * through React context with no module-level instance and this codebase has no Lit router
 * controller yet (#926). So the final step is the `authenticated` event, which the still-React
 * route in `App.tsx` turns into `router.navigate('/')` — the same wall `keep-profile-menu`
 * and `keep-forms-table` describe, answered the same way.
 *
 * ### It renders the message only, not the shell
 *
 * The component this replaces wrapped itself in `AppShell` — the one place the shell appears
 * with something other than the router behind it. `AppShell` is still React, so the wrapping
 * moved up to the route in `App.tsx`, which is where the rest of the route table already
 * decides what a path renders.
 *
 * @fires authenticated - the stored token matches the one just exchanged; the host may leave.
 */
@customElement('keep-callback-page')
export default class CallbackPage extends KeepElement {
  static styles = css`
    :host {
      display: block;
    }

    /* The document reset stops at the shadow boundary and this box carries padding. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* Was a flex column built from four utility classes: padding reset to zero, then 40px
       back on the block edges, and a gap between the two lines. */
    section {
      display: flex;
      flex-direction: column;
      padding: 40px 0;
      gap: 10px;
    }

    /* Was the float, the 24px text utility and the primary text colour. The literal behind
       that colour class is per-mode and does not reach in here; the token is mode-aware. */
    .title {
      float: left;
      font-size: 24px;
      color: var(--wa-color-text-normal);
    }

    /* Web Awesome styles bare headings from a document layer, which does not cross a shadow
       boundary — without this the user-agent margin and 2em size come back instead. */
    h1 {
      margin: 0;
      font-family: var(--wa-font-family-heading);
      font-weight: var(--wa-font-weight-heading);
      font-size: var(--wa-font-size-3xl);
      line-height: var(--wa-line-height-condensed);
      text-wrap: balance;
    }
  `;

  /**
   * What the exchange produced. Compared against local storage below, exactly as the
   * component this replaces did, which is what decides when the screen is finished.
   */
  @state() private accessor tokenResponse: unknown = {};

  @state() private accessor displayText = store.getState().account.authenticated
    ? ALREADY
    : WAITING;

  /** Guards the mount work against a reconnect: moving the element must not re-exchange. */
  private started = false;

  /**
   * The exchange, run once on mount.
   *
   * `connectedCallback` and not `firstUpdated`: the error branch below writes a reactive
   * property, and doing that from inside the update cycle schedules a second update — Lit
   * warns about it, and the first paint would show the waiting message for one frame before
   * replacing it with the failure.
   */
  connectedCallback(): void {
    super.connectedCallback();
    if (this.started) return;
    this.started = true;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (code) {
      void this.exchangeCode();
    } else if (error) {
      this.displayText = AUTH_FAILED;
      log.error('Failed to initialize authorization request', { error });
    }
  }

  /**
   * Mirrors the second mount effect, whose dependency list was the token response — so it
   * ran once on mount and again when the exchange settled. Lit reports a state field with an
   * initialiser as changed on the first update, so both passes arrive here.
   */
  protected updated(changed: PropertyValues): void {
    if (changed.has('tokenResponse')) this.leaveWhenTokenStored();
  }

  private async exchangeCode(): Promise<void> {
    const oidcConfigUrl = localStorage.getItem('oidc_config_url');
    const clientId = localStorage.getItem('client_id');
    const redirectUri = sessionStorage.getItem('redirect_uri');

    const token = await handleCallback(oidcConfigUrl, clientId, redirectUri);
    const {
      refresh_token,
      refresh_expires_in,
      'not-before-policy': notBeforePolicy,
      ...userToken
    } = token;
    const refreshToken = {
      refresh_token: refresh_token,
      refresh_expires_in: refresh_expires_in,
      'not-before-policy': notBeforePolicy,
    };
    if (userToken.error) {
      log.error('Fetched token error', { error: userToken.error });
      this.displayText = TOKEN_FAILED;
      return;
    }
    localStorage.setItem('user_token', JSON.stringify(userToken));
    localStorage.setItem('refresh_token', JSON.stringify(refreshToken));
    await store.dispatch(loginWithPkce(userToken));
    this.tokenResponse = userToken;
    this.displayText = SUCCESS;
  }

  /**
   * The stored token and the exchanged one being the same object is how this screen knows
   * the session is really established — the store write and the local-storage write are two
   * separate steps and only the second is what the rest of the app reads.
   */
  private leaveWhenTokenStored(): void {
    const stored = JSON.parse(localStorage.getItem('user_token') as string);
    if (deepEqual(stored, this.tokenResponse)) this.emit('authenticated');
  }

  render() {
    return html`
      <section>
        <span class="title">HCL Domino REST API Administrator</span>
        <h1>${this.displayText}</h1>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-callback-page': CallbackPage;
  }
}
