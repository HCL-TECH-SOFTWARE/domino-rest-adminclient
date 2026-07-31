/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-dropdown';
import type Dropdown from '../../../src/components/keep-elements/keep-dropdown';

const TAG = 'keep-dropdown';

const waDropdown = (el: Dropdown) => el.shadowRoot!.querySelector('wa-dropdown')!;
const trigger = (el: Dropdown) => el.shadowRoot!.querySelector('wa-button[slot="trigger"]')!;
const items = (el: Dropdown) => Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));

/**
 * What Web Awesome emits when an item is chosen, by pointer *or* by keyboard (#925).
 *
 * Both paths funnel through `makeSelection`, which is the only place `wa-select` is emitted.
 * A `click` is synthesised for the pointer path alone, which is why a `@click` per item looked
 * right and was dead for anyone using the arrow keys — measured in Chrome, not inferred.
 */
const select = (el: Dropdown, value: string) =>
  waDropdown(el).dispatchEvent(
    new CustomEvent('wa-select', {
      detail: { item: { value } },
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

describe('keep-dropdown', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-dropdown', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    expect(waDropdown(el)).toBeTruthy();
  });

  it('shows the first choice in the trigger button after firstUpdated', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    expect(trigger(el).textContent!.trim()).toBe('Alpha');
  });

  it('renders one wa-dropdown-item per choice', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    const rendered = items(el);
    expect(rendered).toHaveLength(2);
    expect(rendered.map((item) => item.textContent!.trim())).toEqual(['Alpha', 'Beta']);
  });

  // ---- #925 ------------------------------------------------------------------------------

  it('carries each choice as an item value, which is what wa-select reports back', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    expect(items(el).map((item) => item.getAttribute('value'))).toEqual(['Alpha', 'Beta']);
  });

  it('updates the trigger text on a keyboard selection', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    select(el, 'Beta');
    await el.updateComplete;
    expect(el.selected).toBe('Beta');
    expect(trigger(el).textContent!.trim()).toBe('Beta');
  });

  it('updates the trigger text when an item is clicked', async () => {
    // Drives Web Awesome itself rather than a hand-made wa-select, so the `value` attribute on
    // the item and the shape of `detail.item` are proven rather than assumed. This passed
    // against the old `@click` binding too — the keyboard test above is the one that did not.
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    (items(el)[1] as HTMLElement).click();
    await el.updateComplete;
    expect(trigger(el).textContent!.trim()).toBe('Beta');
  });

  it('does not let the composed wa-select escape into the host document', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    select(el, 'Beta');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });
});
