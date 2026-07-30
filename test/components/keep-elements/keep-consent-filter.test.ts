/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { toggleConsentsDrawer } from '../../../src/store/drawer/reducer';
import { INIT_STATE } from '../../../src/store/drawer/types';
import '../../../src/components/keep-elements/keep-consent-filter';
import type ConsentFilter from '../../../src/components/keep-elements/keep-consent-filter';

const TAG = 'keep-consent-filter';

/** Three consents over four distinct scopes, one of them shared, so dedup is observable. */
const consent = (username: string, scope: string) => ({
  username,
  scope,
  client_id: `${username}-app`,
  unid: `unid-${username}`,
  redirect_uri: 'https://example.test/cb',
  code_expires_at: new Date().toISOString(),
  refresh_token_expires_at: new Date().toISOString(),
  scope_claim: '',
  scope_description: '',
  scope_logo_url: '',
});

const consents: ConsentFilter['consents'] = [
  consent('ann', 'read,write'),
  consent('bob', 'read'),
  consent('cid', 'admin,audit'),
];

/**
 * Replaced `consents/ConsentFilterContainer.tsx`. The applied filter arrives as properties
 * from `keep-consents-table`; the drawer flag is this element's own, through a
 * `StoreController`, so these tests drive the real store.
 */
describe('keep-consent-filter', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const shell = (el: ConsentFilter) =>
    el.shadowRoot!.querySelector('keep-filter-drawer') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };

  /**
   * Web Awesome's radio group settles its own children a tick later than the element that
   * renders it, and the shell is a whole element deeper again — so assertions drain the
   * microtask queue rather than awaiting a single update.
   */
  const settle = async (el: ConsentFilter) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
      await shell(el)?.updateComplete;
    }
  };

  const mount = async (props: Partial<ConsentFilter> = {}) => {
    const el = await mountLit<ConsentFilter>(TAG, { consents, ...props });
    await settle(el);
    return el;
  };

  const drawer = (el: ConsentFilter) =>
    shell(el).shadowRoot!.querySelector('keep-drawer') as HTMLElement & {
      open: boolean;
      closeFn: () => void;
    };

  const buttons = (el: ConsentFilter) =>
    Array.from(shell(el).shadowRoot!.querySelectorAll('keep-button')) as HTMLElement[];

  const buttonNamed = (el: ConsentFilter, text: string) =>
    buttons(el).find((button) => button.textContent!.trim() === text)!;

  const groups = (el: ConsentFilter) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-radio-group'));

  const groupNamed = (el: ConsentFilter, label: string) =>
    groups(el).find((group) => group.getAttribute('label') === label)!;

  const toggle = (el: ConsentFilter) =>
    el.shadowRoot!.querySelector('wa-switch') as HTMLElement & { checked: boolean };

  const dateFields = (el: ConsentFilter) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-input-date')) as Array<
      HTMLElement & { value: string }
    >;

  const scopeBoxes = (el: ConsentFilter) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-checkbox')) as Array<
      HTMLElement & { checked: boolean }
    >;

  const open = async (el: ConsentFilter) => {
    store.dispatch(toggleConsentsDrawer());
    await settle(el);
  };

  /** Click a radio the way a pointer would; the group turns that into a `change`. */
  const pick = async (el: ConsentFilter, label: string, value: string) => {
    Array.from(groupNamed(el, label).querySelectorAll('wa-radio'))
      .find((radio) => radio.getAttribute('value') === value)!
      .click();
    await settle(el);
  };

  /** Flip the switch as its own click handler would, then let it announce the change. */
  const flip = async (el: ConsentFilter, checked: boolean) => {
    toggle(el).checked = checked;
    toggle(el).dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(el);
  };

  /** Tick a scope checkbox through the inner control, which is what a pointer reaches. */
  const tick = async (el: ConsentFilter, scope: string, checked: boolean) => {
    const box = scopeBoxes(el).find((b) => b.textContent!.trim() === scope)!;
    const inner = box.shadowRoot!.querySelector('wa-checkbox') as HTMLElement & {
      checked: boolean;
    };
    inner.checked = checked;
    inner.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
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

  it('offers Cancel and Show Results, and no Reset', async () => {
    // The consents screen's Reset lives in its options bar, not in the drawer.
    const el = await mount();
    expect(buttons(el).map((button) => button.textContent!.trim())).toEqual([
      'Cancel',
      'Show Results',
    ]);
  });

  it('offers the five sections, in the original order', async () => {
    const el = await mount();
    const headings = Array.from(el.shadowRoot!.querySelectorAll('.section')).map((section) => {
      const group = section.querySelector('wa-radio-group');
      return group ? group.getAttribute('label') : section.querySelector('.header')!.textContent;
    });
    expect(headings).toEqual([
      'Status',
      'App name',
      'Expiration',
      'Token Expiration',
      'Scopes',
    ]);
  });

  it('separates the five sections with a rule each, and adds none before the footer', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelectorAll('hr.divider')).toHaveLength(4);
  });

  it('offers the status options the table switches on', async () => {
    const el = await mount();
    expect(
      Array.from(groupNamed(el, 'Status').querySelectorAll('wa-radio')).map((r) =>
        r.getAttribute('value'),
      ),
    ).toEqual(['All', 'Active']);
  });

  it('offers the same three modes for both expiries', async () => {
    const el = await mount();
    for (const label of ['Expiration', 'Token Expiration']) {
      expect(
        Array.from(groupNamed(el, label).querySelectorAll('wa-radio')).map((r) =>
          r.getAttribute('value'),
        ),
      ).toEqual(['All', 'None', 'Custom']);
    }
  });

  it('lists each distinct scope once, labelled by its own name', async () => {
    // 'read' appears in two consents and must not be offered twice.
    const el = await mount();
    expect(scopeBoxes(el).map((box) => box.textContent!.trim())).toEqual([
      'read',
      'write',
      'admin',
      'audit',
    ]);
  });

  it('names the scope list for a screen reader', async () => {
    const el = await mount();
    const group = el.shadowRoot!.querySelector('.scope-group')!;
    const heading = el.shadowRoot!.getElementById(group.getAttribute('aria-labelledby')!);
    expect(group.getAttribute('role')).toBe('group');
    expect(heading!.textContent).toBe('Scopes');
  });

  it('opens when the store flag turns on', async () => {
    const el = await mount();
    await open(el);
    expect(drawer(el).open).toBe(true);
  });

  it('seeds the whole draft from the applied filter when it opens', async () => {
    const date = new Date(2026, 0, 15);
    const el = await mount({
      status: 'Active',
      showWithApps: true,
      expiration: { expiration: 'Custom', date },
      tokenExpiration: { expiration: 'None', date },
      scopes: ['write'],
    });
    await open(el);

    expect(el.draft).toEqual({
      status: 'Active',
      showWithApps: true,
      expiration: { expiration: 'Custom', date },
      tokenExpiration: { expiration: 'None', date },
      scopes: ['write'],
    });
    expect(groupNamed(el, 'Status').value).toBe('Active');
    expect(toggle(el).checked).toBe(true);
    expect(scopeBoxes(el).map((box) => box.checked)).toEqual([false, true, false, false]);
  });

  it('seeds a copy, so editing the draft cannot reach the applied filter', async () => {
    const applied = ['write'];
    const el = await mount({ scopes: applied });
    await open(el);
    await tick(el, 'read', true);
    expect(applied).toEqual(['write']);
  });

  it('shows a date field only for a Custom expiry', async () => {
    const el = await mount();
    await open(el);
    expect(dateFields(el)).toHaveLength(0);

    await pick(el, 'Expiration', 'None');
    expect(dateFields(el)).toHaveLength(0);

    await pick(el, 'Expiration', 'Custom');
    expect(dateFields(el)).toHaveLength(1);
  });

  it('shows the draft date in local time, not shifted a day by a UTC parse', async () => {
    // A date field speaks local YYYY-MM-DD; reading it back through an ISO round trip lands
    // on the previous day anywhere west of Greenwich.
    const el = await mount({
      expiration: { expiration: 'Custom', date: new Date(2026, 2, 9) },
    });
    await open(el);
    expect(dateFields(el)[0].value).toBe('2026-03-09');
  });

  it('takes a new date from the field without losing the mode', async () => {
    const el = await mount({
      expiration: { expiration: 'Custom', date: new Date(2026, 2, 9) },
    });
    await open(el);
    dateFields(el)[0].dispatchEvent(
      new CustomEvent('date-change', {
        detail: { value: '2026-04-01' },
        bubbles: true,
        composed: true,
      }),
    );
    await settle(el);

    expect(el.draft.expiration.expiration).toBe('Custom');
    expect(el.draft.expiration.date.getFullYear()).toBe(2026);
    expect(el.draft.expiration.date.getMonth()).toBe(3);
    expect(el.draft.expiration.date.getDate()).toBe(1);
  });

  it('keeps the previous date when the field is cleared mid-edit', async () => {
    const date = new Date(2026, 2, 9);
    const el = await mount({ expiration: { expiration: 'Custom', date } });
    await open(el);
    dateFields(el)[0].dispatchEvent(
      new CustomEvent('date-change', { detail: { value: '' }, bubbles: true, composed: true }),
    );
    await settle(el);

    expect(el.draft.expiration.date).toEqual(date);
  });

  it('tracks the two expiries independently', async () => {
    const el = await mount();
    await open(el);
    await pick(el, 'Expiration', 'None');
    await pick(el, 'Token Expiration', 'Custom');

    expect(el.draft.expiration.expiration).toBe('None');
    expect(el.draft.tokenExpiration.expiration).toBe('Custom');
  });

  it('reads a group with nothing selected as All', async () => {
    // A radio group's value is nullable and the draft is not — the table's switch statements
    // have no arm for null.
    const el = await mount({ status: 'Active' });
    await open(el);

    groupNamed(el, 'Status').value = null;
    groupNamed(el, 'Status').dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settle(el);
    expect(el.draft.status).toBe('All');

    groupNamed(el, 'Expiration').value = null;
    groupNamed(el, 'Expiration').dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
    await settle(el);
    expect(el.draft.expiration.expiration).toBe('All');
  });

  it('records every kind of pick in the draft without publishing it', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);

    await pick(el, 'Status', 'Active');
    await flip(el, true);
    await tick(el, 'read', true);

    expect(el.draft.status).toBe('Active');
    expect(el.draft.showWithApps).toBe(true);
    expect(el.draft.scopes).toEqual(['read']);
    expect(onChange).not.toHaveBeenCalled();
    expect(store.getState().drawer.consentsDrawer).toBe(true);
  });

  it('removes a scope when its box is cleared', async () => {
    const el = await mount({ scopes: ['read', 'write'] });
    await open(el);
    await tick(el, 'read', false);
    expect(el.draft.scopes).toEqual(['write']);
  });

  it('never lists the same scope twice however often it is ticked', async () => {
    const el = await mount({ scopes: ['read'] });
    await open(el);
    await tick(el, 'read', true);
    expect(el.draft.scopes).toEqual(['read']);
  });

  it('does not let a control’s composed change or input escape past filter-change', async () => {
    const el = await mount();
    const leaked = vi.fn();
    document.body.addEventListener('change', leaked);
    document.body.addEventListener('input', leaked);
    document.body.addEventListener('filter-apply', leaked);
    document.body.addEventListener('filter-cancel', leaked);
    await open(el);

    await pick(el, 'Status', 'Active');
    await flip(el, true);
    await tick(el, 'read', true);
    buttonNamed(el, 'Cancel').click();
    await settle(el);

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('change', leaked);
    document.body.removeEventListener('input', leaked);
    document.body.removeEventListener('filter-apply', leaked);
    document.body.removeEventListener('filter-cancel', leaked);
  });

  it('Show Results publishes the draft and closes, without refetching anything', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);
    await pick(el, 'Status', 'Active');
    await flip(el, true);
    await tick(el, 'admin', true);

    buttonNamed(el, 'Show Results').click();
    await settle(el);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({
      status: 'Active',
      showWithApps: true,
      expiration: { expiration: 'All', date: expect.any(Date) },
      tokenExpiration: { expiration: 'All', date: expect.any(Date) },
      scopes: ['admin'],
    });
    expect(store.getState().drawer.consentsDrawer).toBe(false);
  });

  it('publishes a snapshot the draft cannot go on editing', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);
    await tick(el, 'read', true);
    buttonNamed(el, 'Show Results').click();
    await settle(el);

    const published = onChange.mock.calls[0][0].detail;
    await open(el);
    await tick(el, 'write', true);
    expect(published.scopes).toEqual(['read']);
  });

  it('Cancel closes and publishes nothing', async () => {
    const el = await mount();
    const onChange = vi.fn();
    el.addEventListener('filter-change', onChange);
    await open(el);
    await pick(el, 'Status', 'Active');

    buttonNamed(el, 'Cancel').click();
    await settle(el);

    expect(onChange).not.toHaveBeenCalled();
    expect(store.getState().drawer.consentsDrawer).toBe(false);
  });

  it('discards the abandoned edit when it re-opens after Cancel', async () => {
    // The original seeded four of its five drafts once, with useState, and was never
    // unmounted — so a cancelled edit stayed in the controls and described a list it had not
    // filtered.
    const el = await mount({ status: 'Active', scopes: ['write'] });
    await open(el);
    await pick(el, 'Status', 'All');
    await tick(el, 'read', true);

    buttonNamed(el, 'Cancel').click();
    await settle(el);
    await open(el);

    expect(el.draft.status).toBe('Active');
    expect(el.draft.scopes).toEqual(['write']);
  });

  it('takes the applied filter from the parent, never the other way round', async () => {
    const el = await mount({ status: 'All', scopes: [] });
    await open(el);
    await pick(el, 'Status', 'Active');
    buttonNamed(el, 'Show Results').click();
    await settle(el);

    expect(el.status).toBe('All');
    expect(el.scopes).toEqual([]);
  });

  it('reconciles the store flag when the drawer is dismissed by escape or overlay', async () => {
    // The original passed the *toggle* as its close handler, so a dismissal from a state the
    // store disagreed with flipped the flag the wrong way.
    const el = await mount();
    await open(el);

    drawer(el).closeFn();
    await settle(el);

    expect(store.getState().drawer.consentsDrawer).toBe(false);
  });

  it('does not re-open when the hide that follows its own close arrives', async () => {
    const el = await mount();
    await open(el);

    buttonNamed(el, 'Show Results').click();
    await settle(el);
    drawer(el).closeFn();
    await settle(el);

    expect(store.getState().drawer.consentsDrawer).toBe(false);
  });

  it('does not re-seed on an unrelated store change', async () => {
    const el = await mount({ status: 'Active' });
    await open(el);
    await pick(el, 'Status', 'All');

    store.dispatch({ type: 'SOMETHING_ELSE' });
    await settle(el);

    expect(el.draft.status).toBe('All');
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

  it('focusFirstField is a no-op when there is nothing to focus', async () => {
    const el = await mount();
    groups(el).forEach((group) => group.remove());
    await expect(el.focusFirstField()).resolves.toBeUndefined();
  });

  it('offers no scopes at all when there are no consents', async () => {
    const el = await mount({ consents: [] });
    expect(scopeBoxes(el)).toHaveLength(0);
  });
});
