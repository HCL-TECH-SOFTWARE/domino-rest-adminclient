/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import accountReducer, {
  login,
  authenticate,
  logout,
  removeAuth,
  setNavItems,
  setLoginError,
  set401Error,
  setIdpLogin,
  setErrorMessage,
  setCurrentIdp,
} from '../../../src/store/account/reducer';
import { AccountState, IdP } from '../../../src/store/account/types';

const initial: AccountState = {
  navitems: {
    databases: false,
    apps: false,
  },
  authenticated: false,
  error: false,
  error401: false,
  errorMessage: '',
  idpLogin: false,
  currentIdp: {
    name: '',
    wellKnown: '',
    adminui_config: {
      active: false,
      client_id: '',
      scope: [],
    },
  },
};

describe('accountReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(accountReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('login sets authenticated to true', () => {
    expect(accountReducer(initial, login()).authenticated).toBe(true);
  });

  it('authenticate sets authenticated to true', () => {
    expect(accountReducer(initial, authenticate()).authenticated).toBe(true);
  });

  it('logout clears authenticated', () => {
    const loggedIn: AccountState = { ...initial, authenticated: true };
    expect(accountReducer(loggedIn, logout())).toMatchObject({
      authenticated: false,
        });
  });

  it('removeAuth clears authenticated', () => {
    const loggedIn: AccountState = { ...initial, authenticated: true };
    expect(accountReducer(loggedIn, removeAuth())).toMatchObject({
      authenticated: false,
        });
  });

  it('setNavItems replaces navitems from the payload', () => {
    const navitems = { apps: true, databases: true };
    expect(accountReducer(initial, setNavItems(navitems)).navitems).toEqual(
      navitems
    );
  });

  it('setLoginError sets error from the payload', () => {
    expect(accountReducer(initial, setLoginError(true)).error).toBe(true);
  });

  it('set401Error sets error401 from the payload', () => {
    expect(accountReducer(initial, set401Error(true)).error401).toBe(true);
  });

  it('setIdpLogin sets idpLogin from the payload', () => {
    expect(accountReducer(initial, setIdpLogin(true)).idpLogin).toBe(true);
  });

  it('setErrorMessage sets errorMessage from the payload', () => {
    expect(
      accountReducer(initial, setErrorMessage('oops')).errorMessage
    ).toBe('oops');
  });

  it('setCurrentIdp replaces currentIdp from the payload', () => {
    const idp: IdP = {
      name: 'idp',
      wellKnown: 'https://example/.well-known',
      adminui_config: { active: true, client_id: 'cid' },
    };
    expect(accountReducer(initial, setCurrentIdp(idp)).currentIdp).toEqual(idp);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => accountReducer(frozen, login())).not.toThrow();
  });
});
