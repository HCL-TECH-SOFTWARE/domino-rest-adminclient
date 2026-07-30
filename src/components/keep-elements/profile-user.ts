/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { TokenProps } from '../../store/account/types';

/** Where both login flows leave the session token. */
const TOKEN_KEY = 'user_token';

/**
 * The signed-in user's display name, read out of the stored session token.
 *
 * Shared by `keep-profile-menu` (the sidenav rail) and `keep-profile-menu-dialog` (the
 * mobile header), which render the same name in the same two places. It was copy-pasted
 * between the two components this replaces, and the two copies had **already drifted**:
 * the sidenav one wrapped the whole thing in a `try`, the mobile one did not. A token that
 * does not parse — truncated, or written by an older release — therefore threw during the
 * mobile header's render and took the header down with it. One implementation, with the
 * guard, is what both get now.
 *
 * Neither shape is validated beyond what it takes to read a name out of it; a token this
 * cannot read yields `''`, which is what the empty name slot rendered before.
 *
 * @param idpLogin Whether the session came from an external identity provider. That
 *   decides which of two unrelated token shapes is in storage: an OIDC envelope carrying a
 *   JWT `access_token`, or Keep's own bearer token with a `claims.sub` distinguished name.
 */
export function readCurrentUser(idpLogin: boolean): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return '';

  try {
    if (idpLogin) {
      // The JWT payload is the middle segment, base64url in a JSON envelope.
      const claims = JSON.parse(atob(JSON.parse(token).access_token.split('.')[1]));
      return claims.email || claims.CN || '';
    }

    const sub = (JSON.parse(token) as TokenProps)?.claims?.sub;
    if (!sub) return '';
    // A Domino distinguished name: "CN=John Doe/O=Acme" — the first RDN's value.
    return sub.split('/')[0].split('=')[1] ?? '';
  } catch {
    return '';
  }
}
