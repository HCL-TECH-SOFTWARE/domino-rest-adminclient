/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCallback, initiateAuthorizationRequest } from '../../../src/components/login/pkce';

/**
 * `state` (RFC 6749 4.1.1 / RFC 9700 4.7.1) is this flow's CSRF token, added alongside the
 * PKCE `code_verifier`/`code_challenge` pair that was already covered indirectly through
 * `keep-login-page.test.ts`'s mock of this module. Nothing exercised the real exchange
 * before this file: `initiateAuthorizationRequest` and `handleCallback` are always mocked
 * at the call sites, so a break here would only ever surface against a live IdP.
 */

const OIDC_CONFIG_URL = 'https://idp.example/.well-known/openid-configuration';
const CLIENT_ID = 'keepadminui';
const REDIRECT_URI = 'https://host.example/admin/ui/callback';

const realLocation = window.location;

/** Replaces `window.location` with a plain, writable stand-in (`pkce.js` assigns `.href`
 *  to navigate, which the real, read-only `Location` would reject in jsdom). Mirrors
 *  `withSearch` in `keep-callback-page.test.ts`. */
const setLocation = (overrides: { href?: string; search?: string }) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, href: '', search: '', ...overrides },
  });
};

describe('pkce', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setLocation({});
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    vi.unstubAllGlobals();
  });

  describe('initiateAuthorizationRequest', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(JSON.stringify({ authorization_endpoint: 'https://idp.example/authorize' })),
        ),
      );
    });

    it('navigates to the discovered authorization endpoint', async () => {
      const started = await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      expect(started).toBe(true);
      const url = new URL(window.location.href);
      expect(`${url.origin}${url.pathname}`).toBe('https://idp.example/authorize');
    });

    it('includes client_id, redirect_uri, response_type and a PKCE S256 challenge', async () => {
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      const url = new URL(window.location.href);
      expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
      expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
    });

    it('omits scope when none is given', async () => {
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      const url = new URL(window.location.href);
      expect(url.searchParams.has('scope')).toBe(false);
    });

    it('includes scope when one is given', async () => {
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI, 'my-scope');
      const url = new URL(window.location.href);
      expect(url.searchParams.get('scope')).toBe('my-scope');
    });

    it('sends a state parameter and stores the same value for the callback to check', async () => {
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      const url = new URL(window.location.href);
      const sentState = url.searchParams.get('state');
      expect(sentState).toBeTruthy();
      expect(sessionStorage.getItem('pkce_state')).toBe(sentState);
    });

    it('generates a fresh state on every attempt', async () => {
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      const first = sessionStorage.getItem('pkce_state');
      await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      const second = sessionStorage.getItem('pkce_state');
      expect(second).not.toBe(first);
    });

    it('returns false and does not navigate when discovery fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network down');
        }),
      );
      const started = await initiateAuthorizationRequest(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);
      expect(started).toBe(false);
      expect(window.location.href).toBe('');
    });
  });

  describe('handleCallback', () => {
    it('rejects when the callback URL carries no authorization code', async () => {
      setLocation({ search: '?state=abc' });
      await expect(handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI)).rejects.toThrow(
        'Authorization code not found in callback URL',
      );
    });

    it('rejects when no state was ever sent, so there is nothing to check the callback against', async () => {
      setLocation({ search: '?code=abc&state=whatever' });
      await expect(handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI)).rejects.toThrow(
        /State mismatch/,
      );
    });

    it('rejects when the returned state does not match what was sent — the CSRF check', async () => {
      sessionStorage.setItem('pkce_state', 'expected-state');
      setLocation({ search: '?code=abc&state=tampered' });
      await expect(handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI)).rejects.toThrow(
        /State mismatch/,
      );
    });

    it('consumes the stored state on a failed check, so it cannot be replayed', async () => {
      sessionStorage.setItem('pkce_state', 'expected-state');
      setLocation({ search: '?code=abc&state=tampered' });
      await expect(handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI)).rejects.toThrow();
      expect(sessionStorage.getItem('pkce_state')).toBeNull();
    });

    it('rejects when the code verifier is missing, once the state check has passed', async () => {
      sessionStorage.setItem('pkce_state', 'expected-state');
      setLocation({ search: '?code=abc&state=expected-state' });
      await expect(handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI)).rejects.toThrow(
        'Code verifier not found in session storage',
      );
    });

    it('exchanges the code for a token once state and code verifier both check out', async () => {
      sessionStorage.setItem('pkce_state', 'expected-state');
      localStorage.setItem('pkce_code_verifier', 'a-verifier');
      setLocation({ search: '?code=abc&state=expected-state' });

      const token = { access_token: 'at', refresh_token: 'rt' };
      let tokenRequestBody: URLSearchParams | undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
          if (url === OIDC_CONFIG_URL) {
            return new Response(JSON.stringify({ token_endpoint: 'https://idp.example/token' }));
          }
          tokenRequestBody = init?.body as URLSearchParams;
          return new Response(JSON.stringify(token));
        }),
      );

      const result = await handleCallback(OIDC_CONFIG_URL, CLIENT_ID, REDIRECT_URI);

      expect(result).toEqual(token);
      expect(localStorage.getItem('login_type')).toBe('oidc');
      expect(sessionStorage.getItem('pkce_state')).toBeNull();

      expect(tokenRequestBody?.get('grant_type')).toBe('authorization_code');
      expect(tokenRequestBody?.get('code')).toBe('abc');
      expect(tokenRequestBody?.get('code_verifier')).toBe('a-verifier');
      expect(tokenRequestBody?.get('client_id')).toBe(CLIENT_ID);
      expect(tokenRequestBody?.get('redirect_uri')).toBe(REDIRECT_URI);
    });
  });
});
