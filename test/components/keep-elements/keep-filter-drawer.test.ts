/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-filter-drawer';
import type FilterDrawer from '../../../src/components/keep-elements/keep-filter-drawer';

const TAG = 'keep-filter-drawer';

/**
 * The shell both filter drawers sit in. It owns no state of its own, so everything here is
 * either "what did it render" or "what did it say", which is the whole of its contract.
 */
describe('keep-filter-drawer', () => {
  afterEach(cleanupLit);

  const mount = (props: Partial<FilterDrawer> = {}) => mountLit<FilterDrawer>(TAG, props);

  const drawer = (el: FilterDrawer) =>
    el.shadowRoot!.querySelector('keep-drawer') as HTMLElement & {
      open: boolean;
      closeFn: () => void;
    };

  const buttons = (el: FilterDrawer) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-button')) as HTMLElement[];

  const buttonNamed = (el: FilterDrawer, text: string) =>
    buttons(el).find((button) => button.textContent!.trim() === text)!;

  /** Listen for one of the three outbound events and report whether it fired. */
  const listen = (el: FilterDrawer, type: string) => {
    const heard = vi.fn();
    el.addEventListener(type, heard);
    return heard;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a closed drawer labelled Filter by default', async () => {
    const el = await mount();
    expect(drawer(el).getAttribute('label')).toBe('Filter');
    expect(drawer(el).open).toBe(false);
  });

  it('passes its label and open flag down to the drawer', async () => {
    const el = await mount({ label: 'Narrow it down', open: true });
    expect(drawer(el).getAttribute('label')).toBe('Narrow it down');
    expect(drawer(el).open).toBe(true);
  });

  it('offers Cancel and Show Results, and no Reset, by default', async () => {
    const el = await mount();
    expect(buttons(el).map((button) => button.textContent!.trim())).toEqual([
      'Cancel',
      'Show Results',
    ]);
  });

  it('adds Reset in front when asked, in the order the applications filter had', async () => {
    const el = await mount({ resettable: true });
    expect(buttons(el).map((button) => button.textContent!.trim())).toEqual([
      'Reset',
      'Cancel',
      'Show Results',
    ]);
  });

  it('slots the body between the header and the footer', async () => {
    const el = await mount();
    const slot = el.shadowRoot!.querySelector('.filter slot');
    expect(slot).toBeTruthy();
    // The footer follows the slot, so a section assigned to it lands above the buttons.
    expect(slot!.nextElementSibling!.className).toBe('buttons');
  });

  it('says filter-apply when Show Results is pressed', async () => {
    const el = await mount();
    const heard = listen(el, 'filter-apply');
    buttonNamed(el, 'Show Results').click();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('says filter-reset when Reset is pressed', async () => {
    const el = await mount({ resettable: true });
    const heard = listen(el, 'filter-reset');
    buttonNamed(el, 'Reset').click();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('says filter-cancel when Cancel is pressed', async () => {
    const el = await mount();
    const heard = listen(el, 'filter-cancel');
    buttonNamed(el, 'Cancel').click();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('says filter-cancel when the drawer is dismissed by escape or overlay', async () => {
    // The drawer's own close button, Escape and a click on the overlay all end at the hide
    // handler, and all three mean the same thing as Cancel.
    const el = await mount({ open: true });
    const heard = listen(el, 'filter-cancel');
    drawer(el).closeFn();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('hands the drawer the same hide handler on every render', async () => {
    // closeFn is a property, so a fresh arrow per render would dirty keep-drawer on every
    // update of this element.
    const el = await mount();
    const first = drawer(el).closeFn;
    el.label = 'Something else';
    await el.updateComplete;
    expect(drawer(el).closeFn).toBe(first);
  });

  it('never writes to its own open flag', async () => {
    // The consumer owns the flag; this element reports and does not decide.
    const el = await mount({ open: true });
    buttonNamed(el, 'Cancel').click();
    await el.updateComplete;
    expect(el.open).toBe(true);
  });

  it('lets its events reach a consumer outside the shadow boundary', async () => {
    const el = await mount();
    const heard = vi.fn();
    document.body.addEventListener('filter-apply', heard);
    buttonNamed(el, 'Show Results').click();
    expect(heard).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('filter-apply', heard);
  });
});
