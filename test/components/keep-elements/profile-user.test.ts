/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { readCurrentUser } from '../../../src/components/keep-elements/profile-user';

/** A Keep bearer token, as the non-IdP login flow stores it. */
const keepToken = (sub: string) =>
  JSON.stringify({ claims: { iss: 'keep', sub, permissions: [] }, expSeconds: 1, issueDate: 1 });

/** An OIDC envelope whose `access_token` is a JWT with the given payload. */
const idpToken = (payload: Record<string, unknown>) =>
  JSON.stringify({ access_token: `header.${btoa(JSON.stringify(payload))}.signature` });

describe('readCurrentUser', () => {
  afterEach(() => {
    localStorage.removeItem('user_token');
  });

  it('is empty when no session token is stored', () => {
    expect(readCurrentUser(false)).toBe('');
    expect(readCurrentUser(true)).toBe('');
  });

  it('reads the first RDN value out of a Keep token subject', () => {
    localStorage.setItem('user_token', keepToken('CN=John Doe/O=Acme'));
    expect(readCurrentUser(false)).toBe('John Doe');
  });

  it('is empty when the Keep token carries no subject', () => {
    localStorage.setItem('user_token', JSON.stringify({ expSeconds: 1, issueDate: 1 }));
    expect(readCurrentUser(false)).toBe('');
  });

  it('is empty rather than undefined when the subject has no RDN value', () => {
    // The component this replaced assigned `split('=')[1]` unguarded, so this case put
    // `undefined` into a variable typed `string` and rendered the word.
    localStorage.setItem('user_token', keepToken('plain-subject'));
    expect(readCurrentUser(false)).toBe('');
  });

  it('prefers the email claim on an IdP token', () => {
    localStorage.setItem('user_token', idpToken({ email: 'jane@example.com', CN: 'Jane' }));
    expect(readCurrentUser(true)).toBe('jane@example.com');
  });

  it('falls back to the CN claim when there is no email', () => {
    localStorage.setItem('user_token', idpToken({ CN: 'Jane Roe' }));
    expect(readCurrentUser(true)).toBe('Jane Roe');
  });

  it('is empty when the IdP token names the user in neither claim', () => {
    localStorage.setItem('user_token', idpToken({ sub: 'opaque-id' }));
    expect(readCurrentUser(true)).toBe('');
  });

  /*
   * The reason this is one function and not two. The mobile header's copy had no `try`, so a
   * token it could not parse threw during render and took the bar down with it; the sidenav's
   * copy swallowed the same failure. Both shapes are checked because they fail in different
   * places — `atob` on a non-JWT, `JSON.parse` on a non-object.
   */
  it('yields an empty name rather than throwing on an unparseable token', () => {
    localStorage.setItem('user_token', 'not-json-at-all');
    expect(() => readCurrentUser(false)).not.toThrow();
    expect(readCurrentUser(false)).toBe('');
    expect(() => readCurrentUser(true)).not.toThrow();
    expect(readCurrentUser(true)).toBe('');
  });

  it('yields an empty name when an IdP token is not a JWT', () => {
    localStorage.setItem('user_token', JSON.stringify({ access_token: 'nope' }));
    expect(readCurrentUser(true)).toBe('');
  });
});
