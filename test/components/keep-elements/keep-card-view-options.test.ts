/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-card-view-options';
import type CardViewOptions from '../../../src/components/keep-elements/keep-card-view-options';

const TAG = 'keep-card-view-options';

const trigger = (el: CardViewOptions) =>
  el.shadowRoot!.querySelector('button[slot="trigger"]') as HTMLButtonElement;
const label = (el: CardViewOptions) => trigger(el).querySelector('span')!.textContent!.trim();
const items = (el: CardViewOptions) =>
  Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));

/** What Web Awesome sends when an item is chosen, by pointer or by keyboard. */
const select = (el: CardViewOptions, value: string) =>
  el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
    new CustomEvent('wa-select', {
      detail: { item: { value } },
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

describe('keep-card-view-options', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('defaults to the card view and to enabled', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    expect(el.view).toBe('card');
    expect(el.disabled).toBe(false);
    expect(label(el)).toBe('Card View');
  });

  it('offers the four views, in the original order and with the original keys', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    expect(items(el).map((item) => item.textContent!.trim())).toEqual([
      'Stack View',
      'Card View',
      'Alphabetical View',
      'NSF View',
    ]);
    expect(items(el).map((item) => item.getAttribute('value'))).toEqual([
      'stack',
      'card',
      'alphabetical',
      'nsf',
    ]);
  });

  it('capitalises the view key for the label', async () => {
    const el = await mountLit<CardViewOptions>(TAG, { view: 'alphabetical' });
    expect(label(el)).toBe('Alphabetical View');
  });

  it('upper-cases nsf rather than capitalising it', async () => {
    const el = await mountLit<CardViewOptions>(TAG, { view: 'nsf' });
    expect(label(el)).toBe('NSF View');
  });

  it('relabels itself when the parent changes the view', async () => {
    const el = await mountLit<CardViewOptions>(TAG, { view: 'card' });
    el.view = 'stack';
    await el.updateComplete;
    expect(label(el)).toBe('Stack View');
  });

  it('emits view-change with the chosen key', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    const onChange = vi.fn();
    el.addEventListener('view-change', onChange);

    select(el, 'stack');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ view: 'stack' });
  });

  it('emits view-change when a real menu item is activated', async () => {
    // Drives Web Awesome itself rather than a hand-made wa-select, so the value attribute on
    // the item and the shape of detail.item are both proven rather than assumed.
    const el = await mountLit<CardViewOptions>(TAG);
    const onChange = vi.fn();
    el.addEventListener('view-change', onChange);

    (items(el)[2] as HTMLElement).click();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ view: 'alphabetical' });
  });

  it('does not relabel itself on selection — the parent owns the view', async () => {
    // The label follows the property, so a pick that the parent rejects must not move it.
    const el = await mountLit<CardViewOptions>(TAG, { view: 'card' });
    select(el, 'nsf');
    await el.updateComplete;
    expect(el.view).toBe('card');
    expect(label(el)).toBe('Card View');
  });

  it('does not let the composed wa-select escape past view-change', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    select(el, 'card');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });

  it('reflects disabled to an attribute so the host rule can match it', async () => {
    const el = await mountLit<CardViewOptions>(TAG, { disabled: true });
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(trigger(el).getAttribute('aria-disabled')).toBe('true');
  });

  it('announces the trigger as available when it is not disabled', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(trigger(el).getAttribute('aria-disabled')).toBe('false');
  });

  it('gives the trigger an explicit button type so it cannot submit a form', async () => {
    const el = await mountLit<CardViewOptions>(TAG);
    expect(trigger(el).type).toBe('button');
  });
});
