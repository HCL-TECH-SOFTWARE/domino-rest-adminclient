/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from '@reduxjs/toolkit';
import {
  deleteConsent,
  getConsents,
  initApplicationState,
  toggleDeleteConsent,
} from '../../../src/store/consents/action';
import { INIT_STATE } from '../../../src/store/consents/types';
import {
  setConsents as setConsentsAction,
  deleteConsent as deleteConsentAction,
  toggleDeleteConsent as toggleDeleteConsentAction,
} from '../../../src/store/consents/reducer';
import { toggleConsentsLoading } from '../../../src/store/loading/action';
import { toggleAlert } from '../../../src/store/alerts/action';
import { Level, Logger } from '../../../src/services/log-service';

/**
 * #690 — the consents thunks had **no error handling at all**: no `try`, no status check.
 *
 * Two consequences, both user-visible:
 *
 *  - `getConsents` — a non-JSON body (a gateway error page, an expired session redirect)
 *    rejected out of the thunk. `consentsLoading` is a toggle flipped on entry, so the
 *    list span forever, and a non-2xx JSON body was dispatched into `SET_CONSENTS` as
 *    though it were the consent list.
 *  - `deleteConsent` — dispatched `DELETE_CONSENT`, ran the caller's success callback and
 *    raised **"Successfully deleted consent…"** without ever looking at the status. A
 *    revoke that the server refused was reported to the user as done.
 *
 * The second is the one that matters: revoking a consent is a security action, and being
 * told it succeeded when it did not is worse than an error.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown; nonJson?: boolean }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => {
      if (init.nonJson) throw new SyntaxError('Unexpected token < in JSON');
      return init.body ?? {};
    },
  }) as unknown as Response;

describe('consents thunks', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const types = () => dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
  const loadingToggles = () => types().filter((t) => t === toggleConsentsLoading.type).length;
  const alerts = () =>
    dispatch.mock.calls
      .map((call) => call[0] as { type?: string; payload?: string })
      .filter((a) => a?.type === toggleAlert.type)
      .map((a) => a.payload as string);

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn() as unknown as typeof dispatch;
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe('getConsents', () => {
    it('stores the consents it fetched', async () => {
      const consents = [{ unid: 'c1' }];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: consents })));

      await getConsents()(dispatch);

      expect(dispatch.mock.calls.map((c) => c[0])).toContainEqual({
        type: setConsentsAction.type,
        payload: consents,
      });
      expect(loadingToggles()).toBe(2);
    });

    it('does not store an error body as though it were the consent list', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(response({ ok: false, status: 500, body: { message: 'boom' } })),
      );

      await getConsents()(dispatch);

      expect(types()).not.toContain(setConsentsAction.type);
      expect(loadingToggles()).toBe(2);
    });

    it('clears the loading flag when the body is not JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, nonJson: true })));

      await expect(getConsents()(dispatch)).resolves.not.toThrow();
      expect(loadingToggles()).toBe(2);
    });

    it('clears the loading flag when the request never completes', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(getConsents()(dispatch)).resolves.not.toThrow();
      expect(loadingToggles()).toBe(2);
    });
  });

  describe('deleteConsent', () => {
    it('revokes the consent and tells the user', async () => {
      const onSuccess = vi.fn();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { unid: 'c1' } })));

      await deleteConsent('c1', onSuccess)(dispatch);

      expect(types()).toContain(deleteConsentAction.type);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(alerts().join()).toMatch(/successfully deleted/i);
    });

    it('encodes the unid into the path', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteConsent('a/b c', vi.fn())(dispatch);

      expect(String(fetchMock.mock.calls[0][0])).toContain(encodeURIComponent('a/b c'));
    });

    // The bug this file exists for.
    it('does not claim success when the server refuses the revoke', async () => {
      const onSuccess = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(response({ ok: false, status: 403, body: { message: 'nope' } })),
      );

      await deleteConsent('c1', onSuccess)(dispatch);

      expect(types()).not.toContain(deleteConsentAction.type);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(alerts().join()).not.toMatch(/successfully deleted/i);
      expect(alerts()).toHaveLength(1);
    });

    it('does not claim success when the request never completes', async () => {
      const onSuccess = vi.fn();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(deleteConsent('c1', onSuccess)(dispatch)).resolves.not.toThrow();

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alerts().join()).not.toMatch(/successfully deleted/i);
    });
  });

  describe('plain action creators', () => {
    it('toggleDeleteConsent carries the consent identity', () => {
      expect(toggleDeleteConsent('c1', 'App', 'ada', 'scope')).toEqual({
        type: toggleDeleteConsentAction.type,
        payload: { unid: 'c1', appName: 'App', username: 'ada', scope: 'scope' },
      });
    });

    it('initApplicationState carries no payload', () => {
      expect(initApplicationState()).toEqual({ type: INIT_STATE });
    });
  });
});
