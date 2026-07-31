/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-search-input';
import type SearchInput from '../../../src/components/keep-elements/keep-search-input';
import type { KeepSearchChangeDetail } from '../../../src/components/keep-elements/keep-search-input';

const TAG = 'keep-search-input';

const field = (el: SearchInput) => el.shadowRoot!.querySelector('input')!;
const icon = (el: SearchInput) => el.shadowRoot!.querySelector('wa-icon')!;

/** What a keystroke looks like from the element's side: the field's full text, then `input`. */
const type = (el: SearchInput, text: string) => {
  const input = field(el);
  input.value = text;
  input.dispatchEvent(new Event('input'));
};

describe('keep-search-input', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<SearchInput>(TAG);
    expect(el.placeholder).toBe('');
    expect(el.label).toBe('');
    expect(el.disabled).toBe(false);
  });

  it('renders one magnifying glass and one text field', async () => {
    const el = await mountLit<SearchInput>(TAG);
    expect(el.shadowRoot!.querySelectorAll('wa-icon')).toHaveLength(1);
    expect(el.shadowRoot!.querySelectorAll('input')).toHaveLength(1);
    expect(field(el).type).toBe('text');
  });

  it('takes the icon from the bundled library rather than the icon CDN', async () => {
    // A wa-icon with no `library` falls through to WebAwesome's stock resolver, which
    // fetches from Font Awesome's CDN — an external request the deployment CSP blocks.
    const el = await mountLit<SearchInput>(TAG);
    expect(icon(el).getAttribute('name')).toBe('magnifying-glass');
    expect(icon(el).getAttribute('library')).toBe('fa');
  });

  it('gives the icon the 1em canvas the React icon wrapper used, not WebAwesome\'s wider default', async () => {
    // WebAwesome defaults `canvas` to `fixed`, a 1.25em box. Every icon this app replaced
    // rendered 1em wide, so leaving the default would widen the glyph by a quarter.
    const el = await mountLit<SearchInput>(TAG);
    expect(icon(el).getAttribute('canvas')).toBe('auto');
  });

  it('leaves the icon unlabelled so it is announced as decorative', async () => {
    // WebAwesome renders the glyph aria-hidden unless it is given a label. Beside a
    // labelled field the glyph carries no information of its own.
    const el = await mountLit<SearchInput>(TAG);
    expect(icon(el).hasAttribute('label')).toBe(false);
  });

  it('puts the placeholder on the field', async () => {
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Views' });
    expect(field(el).getAttribute('placeholder')).toBe('Search Views');
  });

  it('names the field after its placeholder when no label is given', async () => {
    // The three React originals had no accessible name at all — a placeholder is not a
    // label. This is the fallback branch of `label || placeholder`.
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Agents' });
    expect(field(el).getAttribute('aria-label')).toBe('Search Agents');
  });

  it('prefers an explicit label over the placeholder for the accessible name', async () => {
    const el = await mountLit<SearchInput>(TAG, {
      placeholder: 'Search Agents',
      label: 'Filter the agent list',
    });
    expect(field(el).getAttribute('aria-label')).toBe('Filter the agent list');
  });

  it('emits search-change with the field\'s full text on every keystroke', async () => {
    const el = await mountLit<SearchInput>(TAG);
    const onSearch = vi.fn();
    el.addEventListener('search-change', onSearch);

    type(el, 'inv');

    expect(onSearch).toHaveBeenCalledTimes(1);
    const detail = (onSearch.mock.calls[0][0] as CustomEvent<KeepSearchChangeDetail>).detail;
    expect(detail.value).toBe('inv');
  });

  it('emits an empty value when the field is cleared', async () => {
    // The parents branch on `searchKey === ''` to fall back to the unfiltered list, so
    // clearing has to reach them as a value rather than as no event.
    const el = await mountLit<SearchInput>(TAG);
    const onSearch = vi.fn();
    el.addEventListener('search-change', onSearch);

    type(el, 'inv');
    type(el, '');

    const last = onSearch.mock.calls.at(-1)![0] as CustomEvent<KeepSearchChangeDetail>;
    expect(last.detail.value).toBe('');
  });

  it('lets search-change bubble out of the shadow root to a React parent', async () => {
    const el = await mountLit<SearchInput>(TAG);
    const onBody = vi.fn();
    document.body.addEventListener('search-change', onBody);

    type(el, 'x');

    expect(onBody).toHaveBeenCalledTimes(1);
    const event = onBody.mock.calls[0][0] as CustomEvent<KeepSearchChangeDetail>;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    document.body.removeEventListener('search-change', onBody);
  });

  it('reflects disabled to an attribute, because the rule for it is a host selector', async () => {
    // `:host([disabled]) { pointer-events: none }` only matches with the attribute present,
    // and the wrapper sets the property. Without reflection the gate would never engage.
    const el = await mountLit<SearchInput>(TAG, { disabled: true });
    expect(el.hasAttribute('disabled')).toBe(true);

    el.disabled = false;
    await el.updateComplete;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('keeps the field usable from the keyboard while pointer input is gated', async () => {
    // `disabled` here means what `pointer-none` meant: mouse input is blocked, the field is
    // not the disabled form control. Matching the originals, which never set `disabled`.
    const el = await mountLit<SearchInput>(TAG, { disabled: true });
    expect(field(el).disabled).toBe(false);
  });

  it('exposes no value property, so a parent cannot control the field', async () => {
    // The contract, asserted rather than documented: the wrapper re-applies every declared
    // property on every parent render with no dirty check, so a `value` would be written
    // back over the user's text on the render their own keystroke caused.
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Views' });
    expect('value' in el).toBe(false);
  });

  it('does not clobber typed text when the parent re-renders', async () => {
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Views' });
    type(el, 'half-typed');

    // Stands in for the parent re-rendering and the wrapper re-applying its props.
    el.placeholder = 'Search Views';
    el.label = 'Filter';
    await el.updateComplete;

    expect(field(el).value).toBe('half-typed');
  });

  /*
   * The two below came from `keep-form-search`, the duplicate element built in parallel for
   * `TabForms` and collapsed into this one. They are the assertions it had that this file
   * did not.
   */

  it('puts the field in a search landmark', async () => {
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Forms' });
    expect(el.shadowRoot!.querySelector('[role="search"]')).toBeTruthy();
  });

  it('reports the text verbatim, neither trimmed nor lower-cased', async () => {
    const el = await mountLit<SearchInput>(TAG, { placeholder: 'Search Forms' });
    const onSearch = vi.fn();
    el.addEventListener('search-change', onSearch as EventListener);

    type(el, '  Customer ');

    const detail = (onSearch.mock.calls[0][0] as CustomEvent<KeepSearchChangeDetail>).detail;
    expect(detail.value).toBe('  Customer ');
  });
});
