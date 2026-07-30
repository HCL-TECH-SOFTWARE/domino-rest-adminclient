/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-single-field';
import type SingleField from '../../../src/components/keep-elements/keep-single-field';
import type { KeepFieldAddDetail } from '../../../src/components/keep-elements/keep-single-field';
import { store } from '../../../src/store/store';
import { resetAccessFields, setAccessFields } from '../../../src/store/accessMode/action';

const TAG = 'keep-single-field';

const row = (el: SingleField) => el.shadowRoot!.querySelector<HTMLElement>('.item-container')!;
const addButton = (el: SingleField) => el.shadowRoot!.querySelector<HTMLButtonElement>('.add-field');
const tooltip = (el: SingleField) => el.shadowRoot!.querySelector('keep-tooltip');
const name = (el: SingleField) => el.shadowRoot!.querySelector('.field-name')!.textContent!.trim();
const format = (el: SingleField) =>
  el.shadowRoot!.querySelector('.field-format')!.textContent!.trim();

/** Put these fields in the column an add writes to. */
const columnHolds = (...fields: Array<Record<string, unknown>>) => {
  store.dispatch(resetAccessFields());
  const id = Object.keys(store.getState().accessMode.fields)[0];
  store.dispatch(setAccessFields({ [id]: fields }));
};

/** Mount and listen; returns the element and the details of every `field-add` it fired. */
const mountListening = async (props: Partial<SingleField>) => {
  const fired: KeepFieldAddDetail[] = [];
  const el = await mountLit<SingleField>(TAG, props);
  el.addEventListener('field-add', (event) => fired.push((event as CustomEvent).detail));
  return { el, fired };
};

describe('keep-single-field', () => {
  beforeEach(() => {
    store.dispatch(resetAccessFields());
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch(resetAccessFields());
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the field name and its capitalised format', () => {
    return mountLit<SingleField>(TAG, {
      item: { content: 'Subject', format: 'string', kind: '' },
    }).then((el) => {
      expect(name(el)).toBe('Subject');
      expect(format(el)).toBe('String');
    });
  });

  it('renders no format line rather than crashing when the field has none', async () => {
    // capitalizeFirst indexes [0] on its argument, so an absent or empty format used to
    // throw here — which is how a field list with an incomplete entry took the screen down.
    const el = await mountLit<SingleField>(TAG, { item: { content: 'Subject' } });
    expect(format(el)).toBe('');
    expect(name(el)).toBe('Subject');
  });

  it('renders empty rather than "undefined" with no item at all', async () => {
    const el = await mountLit<SingleField>(TAG);
    expect(name(el)).toBe('');
    expect(format(el)).toBe('');
  });

  it('spells the two run-together kinds out, and passes any other through', async () => {
    const known = await mountLit<SingleField>(TAG, {
      item: { content: 'a', kind: 'computedfordisplay' },
    });
    expect(tooltip(known)!.getAttribute('content')).toBe('This field is computed for display');

    const composed = await mountLit<SingleField>(TAG, {
      item: { content: 'b', kind: 'computedwhencomposed' },
    });
    expect(tooltip(composed)!.getAttribute('content')).toBe('This field is computed when composed');

    const other = await mountLit<SingleField>(TAG, { item: { content: 'c', kind: 'summary' } });
    expect(tooltip(other)!.getAttribute('content')).toBe('This field is summary');
  });

  it('names the kind icon for assistive technology, not just on hover', async () => {
    // A hover-only tooltip is pointer-only information (#713). The icon carries the same
    // text as its accessible name so it is reachable without a mouse.
    const el = await mountLit<SingleField>(TAG, { item: { content: 'a', kind: 'summary' } });
    const icon = tooltip(el)!.querySelector('wa-icon')!;
    expect(icon.getAttribute('label')).toBe('This field is summary');
  });

  it('shows no kind tooltip when the field has no kind', async () => {
    const empty = await mountLit<SingleField>(TAG, { item: { content: 'a', kind: '' } });
    expect(tooltip(empty)).toBeNull();

    const missing = await mountLit<SingleField>(TAG, { item: { content: 'a' } });
    expect(tooltip(missing)).toBeNull();
  });

  it('labels the add button with the field it adds', async () => {
    const el = await mountLit<SingleField>(TAG, { item: { content: 'Subject' } });
    expect(addButton(el)!.getAttribute('aria-label')).toBe('Add Subject to this mode');
    // type="button" so a row inside a form cannot submit it.
    expect(addButton(el)!.type).toBe('button');
  });

  it('emits field-add with the item when the row is clicked', async () => {
    const item = { content: 'Subject', format: 'string' };
    const { el, fired } = await mountListening({ item });

    row(el).click();

    expect(fired).toHaveLength(1);
    expect(fired[0].item).toBe(item);
  });

  it('emits field-add when the add button is clicked', async () => {
    // The button has no handler of its own; the click bubbles to the row. That is what
    // makes the control keyboard-operable, so it is asserted rather than assumed.
    const { el, fired } = await mountListening({ item: { content: 'Subject' } });

    addButton(el)!.click();

    expect(fired).toHaveLength(1);
  });

  it('crosses the shadow boundary, so a React consumer can hear it', async () => {
    const { el, fired } = await mountListening({ item: { content: 'Subject' } });
    const heard = vi.fn();
    document.body.addEventListener('field-add', heard);

    row(el).click();

    expect(fired).toHaveLength(1);
    expect(heard).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('field-add', heard);
  });

  it('stays silent when the field is already in the mode', async () => {
    columnHolds({ content: 'Subject' });
    const { el, fired } = await mountListening({ item: { content: 'Subject' } });

    row(el).click();

    expect(fired).toEqual([]);
  });

  it('still offers a field whose name only resembles one already added', async () => {
    columnHolds({ content: 'SubjectLine' });
    const { el, fired } = await mountListening({ item: { content: 'Subject' } });

    row(el).click();

    expect(fired).toHaveLength(1);
  });

  it('stays silent with no item to add', async () => {
    const { el, fired } = await mountListening({});

    row(el).click();

    expect(fired).toEqual([]);
  });

  describe('as a disabled placeholder', () => {
    it('renders the message with no add button and no tooltip', async () => {
      const el = await mountLit<SingleField>(TAG, {
        disabled: true,
        item: { content: 'No Field Available', kind: 'summary' },
      });

      expect(name(el)).toBe('No Field Available');
      expect(addButton(el)).toBeNull();
      expect(tooltip(el)).toBeNull();
    });

    it('reflects disabled so the host rule that stops the hover outline can match', async () => {
      const el = await mountLit<SingleField>(TAG, { disabled: true, item: { content: 'x' } });
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('emits nothing when clicked', async () => {
      const { el, fired } = await mountListening({
        disabled: true,
        item: { content: 'No Field Available' },
      });

      row(el).click();

      expect(fired).toEqual([]);
    });
  });

  it('marks a dragging row, and leaves a still one alone', async () => {
    const dragging = await mountLit<SingleField>(TAG, {
      item: { content: 'a', isDragging: true },
    });
    expect(row(dragging).className).toContain('item-container--dragging');

    const still = await mountLit<SingleField>(TAG, { item: { content: 'a' } });
    expect(still.shadowRoot!.querySelector('.item-container--dragging')).toBeNull();
  });

  it('re-renders when the item is replaced', async () => {
    const el = await mountLit<SingleField>(TAG, { item: { content: 'first' } });
    el.item = { content: 'second', format: 'number' };
    await el.updateComplete;

    expect(name(el)).toBe('second');
    expect(format(el)).toBe('Number');
  });
});
