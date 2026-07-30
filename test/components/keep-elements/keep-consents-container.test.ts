/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setPulledApp } from '../../../src/store/applications/reducer';
import { fetchMyApps } from '../../../src/store/applications/action';
import { fetchUsers } from '../../../src/store/access/action';
import { getConsents } from '../../../src/store/consents/action';
import '../../../src/components/keep-elements/keep-consents-container';
import type ConsentsContainer from '../../../src/components/keep-elements/keep-consents-container';

/*
 * The three fetches become tagged plain actions, so what this file asserts is *which* of
 * them the element asked for and how often — its whole job, and the thing the component it
 * replaces got wrong by asking for two of them twice on every cold arrival. Each mock keeps
 * the rest of its module, because `keep-consents` renders inside this element and reads two
 * of the real creators out of `store/consents/action`.
 *
 * The plain actions reach the real store and no reducer claims them, which is the point:
 * nothing here should move any slice.
 */
vi.mock('../../../src/store/applications/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/applications/action')>()),
  fetchMyApps: vi.fn(() => ({ type: 'test/fetchMyApps' })),
}));
vi.mock('../../../src/store/access/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/access/action')>()),
  fetchUsers: vi.fn(() => ({ type: 'test/fetchUsers' })),
}));
vi.mock('../../../src/store/consents/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/consents/action')>()),
  getConsents: vi.fn(() => ({ type: 'test/getConsents' })),
}));

const TAG = 'keep-consents-container';

const asked = {
  apps: () => vi.mocked(fetchMyApps),
  users: () => vi.mocked(fetchUsers),
  consents: () => vi.mocked(getConsents),
};

describe('keep-consents-container', () => {
  beforeEach(() => {
    store.dispatch({ type: 'INIT_STATE' });
    asked.apps().mockClear();
    asked.users().mockClear();
    asked.consents().mockClear();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: 'INIT_STATE' });
  });

  const mount = async () => {
    const el = await mountLit<ConsentsContainer>(TAG);
    await el.updateComplete;
    return el;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the consents screen, with no dialog chrome', async () => {
    const el = await mount();
    const consents = el.shadowRoot!.querySelector('keep-consents')!;
    expect(consents).toBeTruthy();
    // The route is not a dialog, so the close control must not be asked for.
    expect((consents as unknown as { dialog: boolean }).dialog).toBe(false);
  });

  it('asks for the applications, the users and the consents on connect', async () => {
    await mount();
    expect(asked.apps()).toHaveBeenCalledTimes(1);
    expect(asked.users()).toHaveBeenCalledTimes(1);
    expect(asked.consents()).toHaveBeenCalledTimes(1);
  });

  it('leaves the application list alone when it has already been pulled', async () => {
    store.dispatch(setPulledApp(true));
    await mount();
    expect(asked.apps()).not.toHaveBeenCalled();
    expect(asked.users()).toHaveBeenCalledTimes(1);
    expect(asked.consents()).toHaveBeenCalledTimes(1);
  });

  it('asks once, not once per change of the pulled flag', async () => {
    // The effect this replaces listed appPull as a dependency, so it re-ran the moment
    // fetchMyApps resolved — a second /users and a second /consents on every cold arrival,
    // for a table that subscribes to those slices and re-renders on its own.
    const el = await mount();
    store.dispatch(setPulledApp(true));
    await el.updateComplete;
    expect(asked.users()).toHaveBeenCalledTimes(1);
    expect(asked.consents()).toHaveBeenCalledTimes(1);
  });

  it('asks again when the element is remounted, as a fresh visit to the route', async () => {
    const el = await mount();
    el.remove();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(asked.consents()).toHaveBeenCalledTimes(2);
  });
});
