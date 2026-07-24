import { describe, it, expect } from 'vitest';
import consentsReducer from './reducer';
import {
  SET_CONSENTS,
  DELETE_CONSENT,
  TOGGLE_DELETE_CONSENT,
  INIT_STATE,
  Consent,
  ConsentState,
} from './types';

const initial: ConsentState = {
  consents: [],
  deleteConsentDialog: false,
  deleteUnid: '',
  appName: '',
  username: '',
  scope: '',
};

const makeConsent = (over: Partial<Consent>): Consent => ({
  username: 'user',
  scope: 'scope',
  client_id: 'client',
  unid: 'unid',
  redirect_uri: '',
  code_expires_at: '',
  refresh_token_expires_at: '',
  scope_claim: '',
  scope_description: '',
  scope_logo_url: '',
  ...over,
});

describe('consentsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(consentsReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('SET_CONSENTS replaces consents from the payload', () => {
    const consents = [makeConsent({ client_id: 'c1' }), makeConsent({ client_id: 'c2' })];
    expect(consentsReducer(initial, { type: SET_CONSENTS, payload: consents }).consents).toEqual(
      consents
    );
  });

  it('DELETE_CONSENT removes the consent matching client_id and clears deleteUnid', () => {
    const base: ConsentState = {
      ...initial,
      consents: [makeConsent({ client_id: 'c1' }), makeConsent({ client_id: 'c2' })],
      deleteUnid: 'unid',
    };
    const next = consentsReducer(base, {
      type: DELETE_CONSENT,
      payload: makeConsent({ client_id: 'c1' }),
    });
    expect(next.consents).toHaveLength(1);
    expect(next.consents[0].client_id).toBe('c2');
    expect(next.deleteUnid).toBe('');
  });

  it('TOGGLE_DELETE_CONSENT flips the dialog and stores the payload fields', () => {
    const next = consentsReducer(initial, {
      type: TOGGLE_DELETE_CONSENT,
      payload: { unid: 'u1', appName: 'My App', username: 'bob', scope: 'read' },
    });
    expect(next).toMatchObject({
      deleteConsentDialog: true,
      deleteUnid: 'u1',
      appName: 'My App',
      username: 'bob',
      scope: 'read',
    });
  });

  it('INIT_STATE resets to the initial state', () => {
    const dirty: ConsentState = {
      ...initial,
      consents: [makeConsent({ client_id: 'c1' })],
      deleteConsentDialog: true,
      appName: 'x',
    };
    expect(consentsReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      consentsReducer(frozen, { type: SET_CONSENTS, payload: [makeConsent({})] })
    ).not.toThrow();
  });
});
