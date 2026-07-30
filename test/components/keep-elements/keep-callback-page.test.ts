/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { logout } from '../../../src/store/account/reducer';
import { handleCallback } from '../../../src/components/login/pkce';
import '../../../src/components/keep-elements/keep-callback-page';
import type CallbackPage from '../../../src/components/keep-elements/keep-callback-page';

/**
 * The OIDC redirect landing (#806 wave 6), converted from `components/login/CallbackPage.tsx`.
 *
 * The component this replaces had no test of its own, so nothing here is a port — every
 * assertion is new cover for behaviour that was previously only exercised by hand, on the one
 * screen where a mistake means an authenticated user is left staring at "Waiting to be
 * authenticated..." with a valid token already in storage.
 *
 * The exchange itself belongs to `pkce.js` and is stubbed. What is under test is what this
 * element does with each of its four outcomes: no parameters, an error parameter, a token
 * carrying an error, and a token that lands.
 */
vi.mock('../../../src/components/login/pkce', () => ({
  handleCallback: vi.fn(async () => ({})),
}));

const TAG = 'keep-callback-page';

/** A token as the exchange returns it: the user half, plus the three refresh fields. */
const TOKEN = {
  access_token: 'not-a-real-token',
  expires_in: 300,
  refresh_token: 'not-a-real-refresh-token',
  refresh_expires_in: 1800,
  'not-before-policy': 0,
};

/** What the element is expected to keep, i.e. the token with the refresh fields removed. */
const USER_TOKEN = { access_token: 'not-a-real-token', expires_in: 300 };

const realLocation = window.location;

/** jsdom's document is served from a fixed URL, so the query string has to be substituted. */
const withSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, search },
  });
};

const text = (el: CallbackPage) => el.shadowRoot!.textContent ?? '';

/** Let the exchange and the update it triggers settle. */
const settle = async (el: CallbackPage) => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  }
};

describe('keep-callback-page', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.dispatch(logout());
    vi.mocked(handleCallback).mockResolvedValue(TOKEN as never);
  });

  afterEach(() => {
    cleanupLit();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    localStorage.clear();
    sessionStorage.clear();
    store.dispatch(logout());
    vi.restoreAllMocks();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('the message it shows', () => {
    it('waits when the session is not yet authenticated', async () => {
      withSearch('');
      const el = await mountLit<CallbackPage>(TAG);
      expect(text(el)).toContain('Waiting to be authenticated...');
    });

    it('says so when the session already is', async () => {
      // The store is read once, when the element is constructed — the component this
      // replaces computed it in a `useState` initialiser for the same reason: the message is
      // about the state the user arrived in, and must not change under them mid-exchange.
      withSearch('');
      store.dispatch({ type: 'account/authenticate' });
      const el = await mountLit<CallbackPage>(TAG);
      expect(text(el)).toContain('Already successfully authenticated.');
    });

    it('always names the product', async () => {
      withSearch('');
      const el = await mountLit<CallbackPage>(TAG);
      expect(text(el)).toContain('HCL Domino REST API Administrator');
    });

    it('reports a provider error rather than waiting forever', async () => {
      withSearch('?error=access_denied');
      const el = await mountLit<CallbackPage>(TAG);
      await settle(el);
      expect(text(el)).toContain('Error authenticating. Please try again.');
      expect(handleCallback).not.toHaveBeenCalled();
    });
  });

  describe('exchanging the code', () => {
    beforeEach(() => {
      withSearch('?code=an-authorization-code');
      localStorage.setItem('oidc_config_url', 'https://idp.example/.well-known/openid-configuration');
      localStorage.setItem('client_id', 'admin-ui');
      sessionStorage.setItem('redirect_uri', 'https://host.example/admin/ui/callback');
    });

    it('exchanges with what the login page stored', async () => {
      const el = await mountLit<CallbackPage>(TAG);
      await settle(el);
      expect(handleCallback).toHaveBeenCalledWith(
        'https://idp.example/.well-known/openid-configuration',
        'admin-ui',
        'https://host.example/admin/ui/callback',
      );
    });

    it('splits the refresh fields out of the stored user token', async () => {
      // The two are read back separately — the user token by everything that authenticates a
      // request, the refresh block only by the renewal path — so they cannot share a key.
      const el = await mountLit<CallbackPage>(TAG);
      await settle(el);
      expect(JSON.parse(localStorage.getItem('user_token')!)).toEqual(USER_TOKEN);
      expect(JSON.parse(localStorage.getItem('refresh_token')!)).toEqual({
        refresh_token: 'not-a-real-refresh-token',
        refresh_expires_in: 1800,
        'not-before-policy': 0,
      });
    });

    it('marks the session authenticated through an IdP', async () => {
      const el = await mountLit<CallbackPage>(TAG);
      await settle(el);
      const { authenticated, idpLogin } = store.getState().account;
      expect(authenticated).toBe(true);
      expect(idpLogin).toBe(true);
    });

    it('reports success to the user', async () => {
      const el = await mountLit<CallbackPage>(TAG);
      await settle(el);
      expect(text(el)).toContain('Successfully authenticated! You can now access Admin UI.');
    });

    it('asks the host to leave once the stored token is the exchanged one', async () => {
      // The element cannot navigate (#926). This event is that step, and it is deliberately
      // gated on local storage rather than on the exchange resolving: the store write and the
      // storage write are separate, and the rest of the app reads the second.
      const el = await mountLit<CallbackPage>(TAG);
      const left = vi.fn();
      el.addEventListener('authenticated', left);
      await settle(el);
      expect(left).toHaveBeenCalledTimes(1);
    });

    it('reports a token that carries an error, and stores nothing', async () => {
      vi.mocked(handleCallback).mockResolvedValue({ error: 'invalid_grant' } as never);
      const el = await mountLit<CallbackPage>(TAG);
      const left = vi.fn();
      el.addEventListener('authenticated', left);
      await settle(el);

      expect(text(el)).toContain('Error fetching token. Please try again.');
      expect(localStorage.getItem('user_token')).toBeNull();
      expect(left).not.toHaveBeenCalled();
    });

    it('does not ask the host to leave while the exchange is still in flight', async () => {
      // The mount pass runs the same comparison with nothing exchanged yet. A stored token
      // from an earlier session must not be mistaken for this one.
      localStorage.setItem('user_token', JSON.stringify({ access_token: 'from-last-time' }));
      const left = vi.fn();
      const el = document.createElement(TAG) as CallbackPage;
      el.addEventListener('authenticated', left);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(left).not.toHaveBeenCalled();
    });
  });
});
