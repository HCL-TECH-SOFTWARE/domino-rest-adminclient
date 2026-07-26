import { describe, it, expect } from 'vitest';
import accountReducer from '../../../src/store/account/reducer';
import {
  LOGIN,
  LOGOUT,
  AUTHENTICATE,
  NAVITEMS,
  REMOVE_AUTH,
  SET_TOKEN,
  RENEW_TOKEN,
  SET_LOGIN_ERROR,
  SET_401_ERROR,
  SET_IDP_LOGIN,
  CURRENT_IDP,
  SET_ERROR_MESSAGE,
  AccountState,
  IdP,
} from '../../../src/store/account/types';

const initial: AccountState = {
  navitems: {
    databases: false,
    apps: false,
    users: false,
    groups: false,
  },
  authenticated: false,
  error: false,
  error401: false,
  errorMessage: '',
  token: '',
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

  it('LOGIN sets authenticated to true', () => {
    expect(accountReducer(initial, { type: LOGIN }).authenticated).toBe(true);
  });

  it('AUTHENTICATE sets authenticated to true', () => {
    expect(accountReducer(initial, { type: AUTHENTICATE }).authenticated).toBe(true);
  });

  it('LOGOUT clears authenticated and token', () => {
    const loggedIn: AccountState = { ...initial, authenticated: true, token: 'abc' };
    expect(accountReducer(loggedIn, { type: LOGOUT })).toMatchObject({
      authenticated: false,
      token: '',
    });
  });

  it('REMOVE_AUTH clears authenticated and token', () => {
    const loggedIn: AccountState = { ...initial, authenticated: true, token: 'abc' };
    expect(accountReducer(loggedIn, { type: REMOVE_AUTH })).toMatchObject({
      authenticated: false,
      token: '',
    });
  });

  it('NAVITEMS replaces navitems from the payload', () => {
    const navitems = { apps: true, databases: true, groups: false, users: true };
    expect(accountReducer(initial, { type: NAVITEMS, payload: navitems }).navitems).toEqual(
      navitems
    );
  });

  it('SET_TOKEN stores the token from the payload', () => {
    expect(accountReducer(initial, { type: SET_TOKEN, payload: 'tok' }).token).toBe('tok');
  });

  it('RENEW_TOKEN stores the token from the payload', () => {
    expect(accountReducer(initial, { type: RENEW_TOKEN, payload: 'renewed' }).token).toBe(
      'renewed'
    );
  });

  it('SET_LOGIN_ERROR sets error from the payload', () => {
    expect(accountReducer(initial, { type: SET_LOGIN_ERROR, payload: true }).error).toBe(true);
  });

  it('SET_401_ERROR sets error401 from the payload', () => {
    expect(accountReducer(initial, { type: SET_401_ERROR, payload: true }).error401).toBe(true);
  });

  it('SET_IDP_LOGIN sets idpLogin from the payload', () => {
    expect(accountReducer(initial, { type: SET_IDP_LOGIN, payload: true }).idpLogin).toBe(true);
  });

  it('SET_ERROR_MESSAGE sets errorMessage from the payload', () => {
    expect(
      accountReducer(initial, { type: SET_ERROR_MESSAGE, payload: 'oops' }).errorMessage
    ).toBe('oops');
  });

  it('CURRENT_IDP replaces currentIdp from the payload', () => {
    const idp: IdP = {
      name: 'idp',
      wellKnown: 'https://example/.well-known',
      adminui_config: { active: true, client_id: 'cid' },
    };
    expect(accountReducer(initial, { type: CURRENT_IDP, payload: idp }).currentIdp).toEqual(idp);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => accountReducer(frozen, { type: LOGIN })).not.toThrow();
  });
});
