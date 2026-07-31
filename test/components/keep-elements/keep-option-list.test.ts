/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { FA_LIBRARY } from '../../../src/services/icon-library';
import { store } from '../../../src/store/store';
import { logout } from '../../../src/store/account/action';
import '../../../src/components/keep-elements/keep-option-list';
import type OptionList from '../../../src/components/keep-elements/keep-option-list';

/**
 * The real `logout` is a thunk that fires a network request before it clears the session.
 * Only `logout` is replaced — everything else in the module stays real, because the store
 * graph reaches `getToken` from several other action modules and a bare factory mock would
 * strip it.
 *
 * The stand-in returns a plain action so `store.dispatch` can run for real: the sentinel goes
 * through the actual reducers, matches nothing, and changes no state.
 */
const LOGOUT_ACTION = { type: 'test/logout' };

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  logout: vi.fn(() => LOGOUT_ACTION),
}));

const TAG = 'keep-option-list';

const button = (el: OptionList) => el.shadowRoot!.querySelector('button') as HTMLButtonElement;
const icon = (el: OptionList) => el.shadowRoot!.querySelector('wa-icon') as HTMLElement;

describe('keep-option-list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanupLit();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders one sign-out button', async () => {
    const el = await mountLit<OptionList>(TAG);
    expect(el.shadowRoot!.querySelectorAll('button')).toHaveLength(1);
    expect(button(el).textContent!.trim()).toBe('SIGN OUT');
  });

  /* The visible label is the button's accessible name, so the glyph must stay unlabelled —
     a label on the icon would read the control out twice. */
  it('names the button by its visible label and leaves the glyph decorative', async () => {
    const el = await mountLit<OptionList>(TAG);
    expect(button(el).hasAttribute('aria-label')).toBe(false);
    expect(icon(el).hasAttribute('label')).toBe(false);
  });

  it('renders the exit-door glyph from the bundled library, never the CDN', async () => {
    const el = await mountLit<OptionList>(TAG);
    expect(icon(el).getAttribute('library')).toBe(FA_LIBRARY);
    expect(icon(el).getAttribute('name')).toBe('right-from-bracket');
    // The 1em box both replaced icon sets drew, rather than WebAwesome's 1.25em default.
    expect(icon(el).getAttribute('canvas')).toBe('auto');
  });

  it('keeps the signOut test hook the React version carried', async () => {
    const el = await mountLit<OptionList>(TAG);
    expect(button(el).getAttribute('data-testid')).toBe('signOut');
  });

  /* Not in a form here, but the element is slotted into React parents that may be — and a
     bare <button> defaults to type=submit. */
  it('declares the button as type=button', async () => {
    const el = await mountLit<OptionList>(TAG);
    expect(button(el).getAttribute('type')).toBe('button');
  });

  it('dispatches the logout action on click', async () => {
    const dispatch = vi.spyOn(store, 'dispatch');
    const el = await mountLit<OptionList>(TAG);

    button(el).click();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(LOGOUT_ACTION);
  });

  it('emits logout so the React parent can navigate', async () => {
    const el = await mountLit<OptionList>(TAG);
    const onLogout = vi.fn();
    el.addEventListener('logout', onLogout);

    button(el).click();

    expect(onLogout).toHaveBeenCalledTimes(1);
    // The name is the whole signal. `emit` passes `detail: undefined`, which CustomEvent's
    // own init default turns into null — so null is what "no payload" looks like at runtime.
    expect((onLogout.mock.calls[0][0] as CustomEvent).detail).toBeNull();
  });

  /* The redirect lives in the parent, so the event has to leave the shadow root to reach it. */
  it('composes and bubbles the logout event past the shadow boundary', async () => {
    const el = await mountLit<OptionList>(TAG);
    const onLogout = vi.fn();
    document.body.addEventListener('logout', onLogout);

    button(el).click();

    document.body.removeEventListener('logout', onLogout);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  /*
   * The ordering the React version had: `dispatch(logout()); navigate('/')`. The thunk's
   * network call was never awaited, so the redirect happened before the session state was
   * cleared. Splitting the navigation out to the parent must not quietly reverse that —
   * hence an ordering assertion rather than two independent "it was called" ones.
   */
  it('dispatches before it emits, so the parent navigates after the dispatch', async () => {
    const order: string[] = [];
    vi.spyOn(store, 'dispatch').mockImplementation(((action: unknown) => {
      order.push('dispatch');
      return action;
    }) as typeof store.dispatch);

    const el = await mountLit<OptionList>(TAG);
    el.addEventListener('logout', () => order.push('navigate'));

    button(el).click();

    expect(order).toEqual(['dispatch', 'navigate']);
  });
});
