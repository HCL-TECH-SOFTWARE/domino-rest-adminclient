/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-database-search';
import type DatabaseSearch from '../../../src/components/keep-elements/keep-database-search';

const TAG = 'keep-database-search';

const field = (el: DatabaseSearch) =>
  el.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
const trigger = (el: DatabaseSearch) =>
  el.shadowRoot!.querySelector('button[slot="trigger"]') as HTMLButtonElement;
const typeLabel = (el: DatabaseSearch) =>
  el.shadowRoot!.querySelector('.type-label')!.textContent!.trim();
const items = (el: DatabaseSearch) =>
  Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));
const clearButton = (el: DatabaseSearch) =>
  el.shadowRoot!.querySelector('.clear-button') as HTMLButtonElement | null;

const type = async (el: DatabaseSearch, value: string) => {
  const input = field(el);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
};

/** What Web Awesome sends when an item is chosen, by pointer or by keyboard. */
const select = (el: DatabaseSearch, value: string) =>
  el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
    new CustomEvent('wa-select', {
      detail: { item: { value } },
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

describe('keep-database-search', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(el.searchType).toBe('SCOPE NAME');
    expect(el.nameType).toBe('SCOPE NAME');
    expect(el.disabled).toBe(false);
    expect(el.hasText).toBe(false);
  });

  it('shows the current search type on the trigger', async () => {
    const el = await mountLit<DatabaseSearch>(TAG, { searchType: 'NSF NAME' });
    expect(typeLabel(el)).toBe('NSF NAME');
  });

  it('offers the entity-name column the parent supplies, plus NSF NAME', async () => {
    const el = await mountLit<DatabaseSearch>(TAG, { nameType: 'SCHEMA NAME' });
    expect(items(el).map((item) => item.getAttribute('value'))).toEqual([
      'SCHEMA NAME',
      'NSF NAME',
    ]);
    expect(items(el).map((item) => item.textContent!.trim())).toEqual([
      'SCHEMA NAME',
      'NSF NAME',
    ]);
  });

  it('falls back to the scope column, as the pathname test it replaces did', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(items(el)[0].getAttribute('value')).toBe('SCOPE NAME');
  });

  it('emits search-type-change with the chosen column', async () => {
    const el = await mountLit<DatabaseSearch>(TAG, { nameType: 'SCHEMA NAME' });
    const onChange = vi.fn();
    el.addEventListener('search-type-change', onChange);

    select(el, 'NSF NAME');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ searchType: 'NSF NAME' });
  });

  it('emits search-type-change when a real menu item is activated', async () => {
    // Drives Web Awesome itself rather than a hand-made wa-select, so the value attribute on
    // the item and the shape of detail.item are both proven rather than assumed.
    const el = await mountLit<DatabaseSearch>(TAG, { nameType: 'SCHEMA NAME' });
    const onChange = vi.fn();
    el.addEventListener('search-type-change', onChange);

    (items(el)[0] as HTMLElement).click();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ searchType: 'SCHEMA NAME' });
  });

  it('does not relabel the trigger itself — the parent owns the search type', async () => {
    const el = await mountLit<DatabaseSearch>(TAG, { nameType: 'SCHEMA NAME' });
    select(el, 'NSF NAME');
    await el.updateComplete;
    expect(el.searchType).toBe('SCOPE NAME');
    expect(typeLabel(el)).toBe('SCOPE NAME');
  });

  it('does not let the composed wa-select escape past search-type-change', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    select(el, 'NSF NAME');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });

  it('emits search-change with the text verbatim, untrimmed', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    const onChange = vi.fn();
    el.addEventListener('search-change', onChange);

    await type(el, '  Orders ');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ value: '  Orders ' });
  });

  it('has no clear button while the field is empty', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(clearButton(el)).toBeNull();
  });

  it('shows the clear button once there is text', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    await type(el, 'a');
    expect(el.hasText).toBe(true);
    expect(clearButton(el)).toBeTruthy();
    expect(clearButton(el)!.getAttribute('aria-label')).toBe('clear search bar');
  });

  it('hides the clear button again when the text is deleted by hand', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    await type(el, 'a');
    await type(el, '');
    expect(el.hasText).toBe(false);
    expect(clearButton(el)).toBeNull();
  });

  it('empties the field and reports it when the clear button is used', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    await type(el, 'Orders');
    const onChange = vi.fn();
    el.addEventListener('search-change', onChange);

    clearButton(el)!.click();
    await el.updateComplete;

    expect(field(el).value).toBe('');
    expect(el.hasText).toBe(false);
    expect(clearButton(el)).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({ value: '' });
  });

  it('wraps the clear button in a tooltip', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    await type(el, 'a');
    const tooltip = el.shadowRoot!.querySelector('keep-tooltip')!;
    expect(tooltip.getAttribute('content')).toBe('Clear');
    expect(tooltip.contains(clearButton(el))).toBe(true);
  });

  it('names the field for a screen reader rather than relying on the placeholder', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(field(el).getAttribute('aria-label')).toBe('Search');
    expect(field(el).getAttribute('placeholder')).toBe('Search');
  });

  it('marks the bar as a search landmark', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(el.shadowRoot!.querySelector('.search-container')!.getAttribute('role')).toBe('search');
  });

  it('reflects disabled to an attribute so the host rule can match it', async () => {
    const el = await mountLit<DatabaseSearch>(TAG, { disabled: true });
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(trigger(el).getAttribute('aria-disabled')).toBe('true');
    expect(field(el).getAttribute('aria-disabled')).toBe('true');
  });

  it('announces both controls as available when it is not disabled', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(trigger(el).getAttribute('aria-disabled')).toBe('false');
    expect(field(el).getAttribute('aria-disabled')).toBe('false');
  });

  it('gives both buttons an explicit type so neither can submit a form', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    await type(el, 'a');
    expect(trigger(el).type).toBe('button');
    expect(clearButton(el)!.type).toBe('button');
  });

  it('separates the column picker from the field with a vertical divider', async () => {
    const el = await mountLit<DatabaseSearch>(TAG);
    const divider = el.shadowRoot!.querySelector('wa-divider')!;
    expect(divider.getAttribute('orientation')).toBe('vertical');
  });
});
