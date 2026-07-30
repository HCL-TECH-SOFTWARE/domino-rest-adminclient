/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { toggleAppFilterDrawer } from '../../../src/store/drawer/reducer';
import { INIT_STATE } from '../../../src/store/drawer/types';
import { fetchMyApps } from '../../../src/store/applications/action';
import '../../../src/components/keep-elements/keep-app-filter';
import type AppFilter from '../../../src/components/keep-elements/keep-app-filter';

/**
 * The real thunk fetches. Only the dispatch matters here, so it is replaced by a plain
 * action the store can absorb — the same substitution `AppsTable.test.tsx` makes.
 */
vi.mock('../../../src/store/applications/action', () => ({
  fetchMyApps: vi.fn(() => ({ type: 'FETCH_MY_APPS' })),
}));

const TAG = 'keep-app-filter';

/**
 * Replaced `applications/AppFilterContainer.tsx`. The applied filters arrive as properties
 * from the still-React `AppsTable`; the drawer flag is this element's own, through a
 * `StoreController`, so these tests drive the real store.
 */
describe('keep-app-filter', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    vi.mocked(fetchMyApps).mockClear();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  /**
   * The panel, the footer and the rules around them moved into the shared
   * `keep-filter-drawer` shell, so the drawer and the three buttons now live one shadow root
   * deeper than the sections do. Only these four readers move: every assertion below is the
   * one it always was.
   */
  const shell = (el: AppFilter) =>
    el.shadowRoot!.querySelector('keep-filter-drawer') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };

  const mount = async (props: Partial<AppFilter> = {}) => {
    const el = await mountLit<AppFilter>(TAG, props);
    // `mountLit` awaits this element's first update; the shell's own is scheduled by it and
    // has not run yet, so the drawer and buttons are not in its root until this drains.
    await settle(el);
    return el;
  };

  const drawer = (el: AppFilter) =>
    shell(el).shadowRoot!.querySelector('keep-drawer') as HTMLElement & {
      open: boolean;
      closeFn: () => void;
    };

  const groups = (el: AppFilter) => Array.from(el.shadowRoot!.querySelectorAll('wa-radio-group'));

  const radios = (el: AppFilter, index: number) =>
    Array.from(groups(el)[index].querySelectorAll('wa-radio'));

  const buttons = (el: AppFilter) =>
    Array.from(shell(el).shadowRoot!.querySelectorAll('keep-button')) as HTMLElement[];

  const buttonNamed = (el: AppFilter, text: string) =>
    buttons(el).find((button) => button.textContent!.trim() === text)!;

  /**
   * A store dispatch reaches the element through `StoreController.requestUpdate()`, and Web
   * Awesome's radio group settles its own children a tick later again (`syncRadioElements`
   * awaits each radio, and `change` is emitted from `updateComplete.then`) — so assertions
   * drain the microtask queue rather than awaiting a single update. The shell is awaited
   * alongside, since a change to the open flag has to reach it before the drawer moves.
   */
  const settle = async (el: AppFilter) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
      await shell(el)?.updateComplete;
    }
  };

  const open = async (el: AppFilter) => {
    store.dispatch(toggleAppFilterDrawer());
    await settle(el);
  };

  /** Click a radio the way a pointer would; the group turns that into a `change`. */
  const pick = async (el: AppFilter, index: number, value: string) => {
    radios(el, index).find((radio) => radio.getAttribute('value') === value)!.click();
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a closed drawer labelled Filter', async () => {
    const el = await mount();
    expect(drawer(el).open).toBe(false);
    expect(drawer(el).getAttribute('label')).toBe('Filter');
  });

  it('defaults both filters to All', async () => {
    const el = await mount();
    expect(el.status).toBe('All');
    expect(el.appSecret).toBe('All');
    expect(el.draft).toEqual({ status: 'All', appSecret: 'All' });
  });

  it('offers the two sections, named, in the original order', async () => {
    const el = await mount();
    expect(groups(el).map((group) => group.getAttribute('label'))).toEqual([
      'Status',
      'Authentication method',
    ]);
  });

  it('offers the original options, with the strings the table switches on', async () => {
    const el = await mount();
    expect(radios(el, 0).map((radio) => radio.getAttribute('value'))).toEqual([
      'All',
      'Active',
      'Inactive',
    ]);
    expect(radios(el, 1).map((radio) => radio.getAttribute('value'))).toEqual([
      'All',
      'App secret',
      'App secret generated',
      'App secret not generated',
      'PKCE',
    ]);
  });

  it('labels every option with the value it stands for', async () => {
    const el = await mount();
    expect(radios(el, 1).map((radio) => radio.textContent!.trim())).toEqual([
      'All',
      'App secret',
      'App secret generated',
      'App secret not generated',
      'PKCE',
    ]);
  });

  it('separates the sections and the footer with a rule each', async () => {
    // Two sections and a button row: one divider between the sections, one before the row.
    const el = await mount();
    expect(el.shadowRoot!.querySelectorAll('hr.divider')).toHaveLength(2);
  });

  it('offers Reset, Cancel and Show Results, in that order', async () => {
    const el = await mount();
    expect(buttons(el).map((button) => button.textContent!.trim())).toEqual([
      'Reset',
      'Cancel',
      'Show Results',
    ]);
  });

  it('opens when the store flag turns on', async () => {
    const el = await mount();
    await open(el);
    expect(drawer(el).open).toBe(true);
  });

  it('seeds the draft from the applied filters when it opens', async () => {
    const el = await mount({ status: 'Inactive', appSecret: 'PKCE' });
    await open(el);
    expect(el.draft).toEqual({ status: 'Inactive', appSecret: 'PKCE' });
    expect(groups(el)[0].value).toBe('Inactive');
    expect(groups(el)[1].value).toBe('PKCE');
  });

  it('checks the radio the draft names', async () => {
    const el = await mount({ status: 'Active' });
    await open(el);
    expect(radios(el, 0).map((radio) => radio.checked)).toEqual([false, true, false]);
  });

  it('does not re-seed on an unrelated store change', async () => {
    // The flag is read through a controller, which re-renders on any store change — so the
    // handler compares the previous value rather than trusting the render.
    const el = await mount({ status: 'Active' });
    await open(el);
    await pick(el, 0, 'Inactive');

    store.dispatch({ type: 'SOMETHING_ELSE' });
    await settle(el);

    expect(el.draft.status).toBe('Inactive');
  });

  it('records a pick in the draft without publishing it', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);

    await pick(el, 0, 'Active');
    await pick(el, 1, 'App secret generated');

    expect(el.draft).toEqual({ status: 'Active', appSecret: 'App secret generated' });
    expect(onChange).not.toHaveBeenCalled();
    expect(store.getState().drawer.appFilterDrawer).toBe(true);
  });

  it('reads a group with nothing selected as All', async () => {
    // A radio group's value is nullable and the draft is not — the table's two switch
    // statements have no arm for null, so an unset group has to arrive as the All they do
    // have an arm for.
    const el = await mount({ status: 'Active' });
    await open(el);

    groups(el)[0].value = null;
    groups(el)[0].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(el);

    expect(el.draft.status).toBe('All');
  });

  it('does not let the radio group’s composed change escape past filter-change', async () => {
    const el = await mount();
    const leaked = vi.fn();
    document.body.addEventListener('change', leaked);
    await open(el);

    await pick(el, 0, 'Active');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('change', leaked);
  });

  it('stops the input event that precedes it too', async () => {
    const el = await mount();
    const leaked = vi.fn();
    document.body.addEventListener('input', leaked);
    await open(el);

    await pick(el, 0, 'Active');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('input', leaked);
  });

  it('Show Results publishes the draft, refreshes the list and closes', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);
    await pick(el, 0, 'Inactive');
    await pick(el, 1, 'PKCE');

    buttonNamed(el, 'Show Results').click();
    await settle(el);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ status: 'Inactive', appSecret: 'PKCE' });
    expect(fetchMyApps).toHaveBeenCalledTimes(1);
    expect(store.getState().drawer.appFilterDrawer).toBe(false);
  });

  it('Reset clears both filters and closes, without refetching', async () => {
    // The original did not refetch on Reset — the table re-filters the apps it already has.
    const el = await mount({ status: 'Active', appSecret: 'PKCE' });
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);

    buttonNamed(el, 'Reset').click();
    await settle(el);

    expect(onChange.mock.calls[0][0].detail).toEqual({ status: 'All', appSecret: 'All' });
    expect(el.draft).toEqual({ status: 'All', appSecret: 'All' });
    expect(fetchMyApps).not.toHaveBeenCalled();
    expect(store.getState().drawer.appFilterDrawer).toBe(false);
  });

  it('Cancel closes and publishes nothing', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);
    await pick(el, 0, 'Active');

    buttonNamed(el, 'Cancel').click();
    await settle(el);

    expect(onChange).not.toHaveBeenCalled();
    expect(fetchMyApps).not.toHaveBeenCalled();
    expect(store.getState().drawer.appFilterDrawer).toBe(false);
  });

  it('discards the abandoned edit when it re-opens after Cancel', async () => {
    // The React version seeded its draft once, with useState, and was never unmounted — so a
    // cancelled edit stayed in the radio buttons and described a list it had not filtered.
    const el = await mount({ status: 'Active', appSecret: 'PKCE' });
    await open(el);
    await pick(el, 0, 'Inactive');

    buttonNamed(el, 'Cancel').click();
    await settle(el);
    await open(el);

    expect(el.draft).toEqual({ status: 'Active', appSecret: 'PKCE' });
    expect(groups(el)[0].value).toBe('Active');
  });

  it('takes the applied filters from the parent, never the other way round', async () => {
    // The wrapper re-applies every property on every parent render, so the element must not
    // write back to them — the table owns them.
    const el = await mount({ status: 'All', appSecret: 'All' });
    await open(el);
    await pick(el, 0, 'Active');
    buttonNamed(el, 'Show Results').click();
    await settle(el);

    expect(el.status).toBe('All');
    expect(el.appSecret).toBe('All');
  });

  it('reconciles the store flag when the drawer is dismissed by escape or overlay', async () => {
    // The React version passed no close handler at all, so a dismissed drawer left the flag
    // true and the Filter button then toggled it to false and appeared to do nothing.
    const el = await mount();
    await open(el);

    drawer(el).closeFn();
    await settle(el);

    expect(store.getState().drawer.appFilterDrawer).toBe(false);
  });

  it('does not re-open when the hide that follows its own close arrives', async () => {
    const el = await mount();
    await open(el);

    buttonNamed(el, 'Cancel').click();
    await settle(el);
    drawer(el).closeFn();
    await settle(el);

    expect(store.getState().drawer.appFilterDrawer).toBe(false);
  });

  it('moves focus into the first group on open, but not on close', async () => {
    const el = await mount();
    const focus = vi.spyOn(el, 'focusFirstField');

    await open(el);
    expect(focus).toHaveBeenCalledTimes(1);

    await open(el); // toggles back to closed
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('focusFirstField lands on a radio', async () => {
    const el = await mount({ status: 'Active' });
    await open(el);
    await el.focusFirstField();
    expect(el.shadowRoot!.activeElement?.tagName.toLowerCase()).toBe('wa-radio');
  });

  it('keeps the shell’s own events inside: filter-change is the whole outbound contract', async () => {
    // `filter-apply` / `filter-reset` / `filter-cancel` are composed, so left alone they
    // would cross this boundary too and reach a consumer that has no way to interpret them.
    const el = await mount();
    const leaked = vi.fn();
    ['filter-apply', 'filter-reset', 'filter-cancel'].forEach((type) =>
      document.body.addEventListener(type, leaked),
    );
    await open(el);

    buttonNamed(el, 'Show Results').click();
    await settle(el);
    await open(el);
    buttonNamed(el, 'Reset').click();
    await settle(el);
    await open(el);
    buttonNamed(el, 'Cancel').click();
    await settle(el);

    expect(leaked).not.toHaveBeenCalled();
    ['filter-apply', 'filter-reset', 'filter-cancel'].forEach((type) =>
      document.body.removeEventListener(type, leaked),
    );
  });

  it('focusFirstField is a no-op when there is nothing to focus', async () => {
    // Exercises the guard: the query is the only thing standing between a re-render that
    // drops the groups and a TypeError inside an update.
    const el = await mount();
    groups(el).forEach((group) => group.remove());
    await expect(el.focusFirstField()).resolves.toBeUndefined();
  });
});
