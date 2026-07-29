/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import consentsReducer, { setConsents, deleteConsent, toggleDeleteConsent } from '../../../src/store/consents/reducer';
import { INIT_STATE, Consent, ConsentState } from '../../../src/store/consents/types';

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

  it('setConsents replaces consents from the payload', () => {
    const consents = [makeConsent({ client_id: 'c1' }), makeConsent({ client_id: 'c2' })];
    expect(consentsReducer(initial, setConsents(consents)).consents).toEqual(
      consents
    );
  });

  it('deleteConsent removes the consent matching client_id and clears deleteUnid', () => {
    const base: ConsentState = {
      ...initial,
      consents: [makeConsent({ client_id: 'c1' }), makeConsent({ client_id: 'c2' })],
      deleteUnid: 'unid',
    };
    const next = consentsReducer(base, deleteConsent(makeConsent({ client_id: 'c1' })));
    expect(next.consents).toHaveLength(1);
    expect(next.consents[0].client_id).toBe('c2');
    expect(next.deleteUnid).toBe('');
  });

  it('toggleDeleteConsent flips the dialog and stores the payload fields', () => {
    const next = consentsReducer(
      initial,
      toggleDeleteConsent({ unid: 'u1', appName: 'My App', username: 'bob', scope: 'read' }),
    );
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
      consentsReducer(frozen, setConsents([makeConsent({})]))
    ).not.toThrow();
  });
});
