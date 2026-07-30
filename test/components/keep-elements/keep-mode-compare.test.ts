/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-mode-compare';
import type ModeCompare from '../../../src/components/keep-elements/keep-mode-compare';
import type { Mode } from '../../../src/store/databases/types';

const TAG = 'keep-mode-compare';

/**
 * `keep-mode-compare` replaces `access/ModeCompare.tsx`, which had no test at all — the
 * four predicates behind its highlighting were pulled out into `access/mode-diff.ts` by
 * #827 precisely because nothing could reach them without rendering a 651-line dialog, and
 * `test/components/access/mode-diff.test.ts` covers them there. What is asserted here is
 * everything that was left: the column model, the filter, the differences-only toggle, the
 * dialog contract, and the accessibility work the conversion folded in (#713).
 */

const formula = (text: string) => ({ formulaType: 'domino', formula: text });

/** A mode with just enough shape for the comparison and the render. */
const makeMode = (modeName: string, fields: Array<Record<string, unknown>>, onLoad = ''): Mode =>
  ({
    formName: 'Contact',
    modeName,
    fields,
    computeWithForm: false,
    onLoad: formula(onLoad),
    onSave: formula(''),
    readAccessFormula: formula('@True'),
    writeAccessFormula: formula('@True'),
    deleteAccessFormula: formula('@False'),
  }) as unknown as Mode;

const FIRST = makeMode('default', [
  { name: 'FirstName', type: 'string', fieldAccess: 'RW' },
  { name: 'Age', type: 'number', fieldAccess: 'RW' },
]);

/** Differs from FIRST in two ways: Age has another type, and there is no LastName in FIRST. */
const SECOND = makeMode(
  'draft',
  [
    { name: 'FirstName', type: 'string', fieldAccess: 'RW' },
    { name: 'Age', type: 'string', fieldAccess: 'RW' },
    { name: 'LastName', type: 'string', fieldAccess: 'RW' },
  ],
  '@Now',
);

const THIRD = makeMode('archive', [{ name: 'FirstName', type: 'string', fieldAccess: 'RW' }]);

const MODES = [FIRST, SECOND, THIRD];

const open = (props: Partial<ModeCompare> = {}) =>
  mountLit<ModeCompare>(TAG, { open: true, formName: 'Contact', modes: MODES, ...props });

const dialog = (el: ModeCompare) => el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

const selects = (el: ModeCompare) => [...el.shadowRoot!.querySelectorAll('wa-select')];

const cards = (el: ModeCompare) => [...el.shadowRoot!.querySelectorAll('.card-top')];

/** Every field row, including the formulas row, whether visible or not. */
const rows = (el: ModeCompare) => [...el.shadowRoot!.querySelectorAll('.field-row')];

const visibleRows = (el: ModeCompare) => rows(el).filter((row) => !row.classList.contains('hidden'));

/**
 * The field-name headings of the per-field rows, in order.
 *
 * Scoped to `.stack`, because a column that does not have the field renders its own
 * `.field-name` reading "*Field not existing" — and that cell can come first in the row.
 */
const fieldNames = (el: ModeCompare) =>
  rows(el)
    .slice(1)
    .map((row) => row.querySelector('.stack .field-name')?.textContent?.trim());

const listen = (el: ModeCompare, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

/** Choose a mode in column `index`, the way the inner control reports it. */
const chooseMode = async (el: ModeCompare, index: number, value: string) => {
  const select = selects(el)[index] as HTMLElement & { value: string };
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  await el.updateComplete;
};

// jsdom implements no <dialog> modal behaviour; setupTests.ts stubs showModal/close.
const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

describe('keep-mode-compare', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('stays closed by default', async () => {
    await mountLit<ModeCompare>(TAG, { modes: MODES });
    expect(showModal()).not.toHaveBeenCalled();
  });

  it('opens modally and closes again with the open property', async () => {
    const el = await mountLit<ModeCompare>(TAG, { modes: MODES });
    el.open = true;
    await el.updateComplete;
    expect(showModal()).toHaveBeenCalledTimes(1);

    const before = close().mock.calls.length;
    el.open = false;
    await el.updateComplete;
    expect(close().mock.calls.length).toBe(before + 1);
  });

  it('names the form in the heading and in the dialog label', async () => {
    const el = await open();
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header')!;
    expect(header.getAttribute('heading')).toBe('Mode Compare - Contact Form');
    // aria-label, not aria-labelledby: the heading is inside the header's own shadow root
    // and an IDREF cannot cross a shadow boundary (#713).
    expect(dialog(el).getAttribute('aria-label')).toBe('Mode Compare - Contact Form');
  });

  it('opens on the current mode plus one other', async () => {
    const el = await open({ currentModeIndex: 1 });
    // Current mode first, then the first mode in the list as its counterpart.
    expect(el.selectedModeNames).toEqual(['draft', 'default']);
    expect(cards(el)).toHaveLength(2);
  });

  it('pairs the first mode with the second when it is the current one', async () => {
    const el = await open({ currentModeIndex: 0 });
    expect(el.selectedModeNames).toEqual(['default', 'draft']);
  });

  it('opens on one column rather than crashing when the form has a single mode', async () => {
    // The original read `allModes[1].modeName` unguarded in exactly this case. The parent
    // disables the button that opens the dialog when there is one mode, but it counts a
    // different list than the one the dialog reads, so the read was reachable.
    const el = await open({ modes: [FIRST], currentModeIndex: 0 });
    expect(el.selectedModeNames).toEqual(['default']);
  });

  it('selects nothing when the current index addresses no mode', async () => {
    const el = await open({ currentModeIndex: 9 });
    expect(el.selectedModeNames).toEqual([]);
    expect(cards(el)).toHaveLength(0);
  });

  it('offers every mode of the form in each column picker', async () => {
    const el = await open();
    const options = [...selects(el)[0].querySelectorAll('wa-option')].map((o) =>
      o.getAttribute('value'),
    );
    expect(options).toEqual(['default', 'draft', 'archive']);
  });

  it('lists every field name across the compared modes', async () => {
    const el = await open({ currentModeIndex: 0 });
    expect(fieldNames(el)).toEqual(['FirstName', 'Age', 'LastName']);
  });

  it('marks the rows whose fields differ, and leaves the identical ones unmarked', async () => {
    const el = await open({ currentModeIndex: 0 });
    const [firstName, age] = rows(el).slice(1);
    expect(firstName.querySelector('.diff')).toBeNull();
    // Age is a number in one mode and a string in the other.
    expect(age.querySelector('.diff')).toBeTruthy();
  });

  it('says so when a field is missing from one of the compared modes', async () => {
    const el = await open({ currentModeIndex: 0 });
    const lastName = rows(el)[3];
    expect(lastName.textContent).toContain('*Field not existing');
  });

  it('never shows the identity keys as comparable values', async () => {
    // `name` and `externalName` identify the row; showing them as differences would mark
    // every row that exists in one mode and not another.
    const el = await open({ currentModeIndex: 0 });
    const labels = [...rows(el)[1].querySelectorAll('.formula-name span')].map((s) =>
      s.textContent?.trim(),
    );
    expect(labels).not.toContain('Name:');
    expect(labels).not.toContain('External Name:');
  });

  it('spaces out the camel-case key names', async () => {
    const el = await open({ currentModeIndex: 0 });
    const labels = [...rows(el)[1].querySelectorAll('.formula-name span')].map((s) =>
      s.textContent?.trim(),
    );
    expect(labels).toContain('Field Access:');
  });

  it('reports the differing formulas and marks the formulas row', async () => {
    const el = await open({ currentModeIndex: 0 });
    // onLoad is "@Now" in draft and empty in default; the other four match.
    expect(el.diffFormulas).toEqual(['onLoad']);
    expect(rows(el)[0].querySelector('.field-detail')!.classList.contains('diff')).toBe(true);
  });

  it('counts each mode fields and labels the empty column N/A', async () => {
    const el = await open({ currentModeIndex: 0 });
    const counts = () =>
      cards(el).map((card) => card.querySelector('.fields-number')?.textContent?.trim());
    expect(counts()).toEqual(['2', '3']);

    el.shadowRoot!.querySelector<HTMLElement>('keep-button')!.click();
    await el.updateComplete;
    expect(counts()).toEqual(['2', '3', 'N/A']);
  });

  it('adds an empty column and lets a mode be chosen into it', async () => {
    const el = await open({ currentModeIndex: 0 });
    el.shadowRoot!.querySelector<HTMLElement>('keep-button')!.click();
    await el.updateComplete;
    expect(el.selectedModeNames).toEqual(['default', 'draft', '']);

    await chooseMode(el, 2, 'archive');
    expect(el.selectedModeNames).toEqual(['default', 'draft', 'archive']);
  });

  it('marks only the empty column as draggable, as the original did', async () => {
    // No dragstart/dragover/drop handler exists here or ever did — column reordering was
    // started and abandoned. Carried over so the conversion changes nothing.
    const el = await open({ currentModeIndex: 0 });
    el.shadowRoot!.querySelector<HTMLElement>('keep-button')!.click();
    await el.updateComplete;
    expect(cards(el).map((card) => (card as HTMLElement).draggable)).toEqual([false, false, true]);
  });

  it('replaces the mode in the column that changed and no other', async () => {
    const el = await open({ currentModeIndex: 0 });
    await chooseMode(el, 1, 'archive');
    expect(el.selectedModeNames).toEqual(['default', 'archive']);
  });

  it('does not let the inner change event out as a change of the dialog', async () => {
    const el = await open({ currentModeIndex: 0 });
    const raw = listen(el, 'change');
    await chooseMode(el, 1, 'archive');
    expect(raw).toHaveLength(0);
  });

  it('offers no remove control while only two modes are compared', async () => {
    const el = await open({ currentModeIndex: 0 });
    expect(el.shadowRoot!.querySelectorAll('.remove-mode')).toHaveLength(0);
  });

  it('offers a labelled remove button once a third column exists', async () => {
    const el = await open({ currentModeIndex: 0 });
    el.shadowRoot!.querySelector<HTMLElement>('keep-button')!.click();
    await el.updateComplete;

    const buttons = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.remove-mode')];
    expect(buttons).toHaveLength(3);
    // The control was a div with a click handler: unfocusable and unnamed (#713).
    expect(buttons[0].tagName).toBe('BUTTON');
    expect(buttons[0].getAttribute('aria-label')).toBe('Remove mode from comparison');
    expect(buttons[2].getAttribute('aria-label')).toBe('Delete empty mode card');

    buttons[2].click();
    await el.updateComplete;
    expect(el.selectedModeNames).toEqual(['default', 'draft']);
  });

  it('survives a first column that names no mode', async () => {
    // Every diff predicate indexes the mode list by the first selected name without
    // checking the result. Reachable by adding a column and removing the ones before it.
    const el = await open({ currentModeIndex: 0 });
    el.shadowRoot!.querySelector<HTMLElement>('keep-button')!.click();
    await el.updateComplete;
    const buttons = () => [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.remove-mode')];
    buttons()[0].click();
    await el.updateComplete;
    el.selectedModeNames = ['', ''];
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('dialog')).toBeTruthy();
  });

  it('filters the field rows by the search field', async () => {
    const el = await open({ currentModeIndex: 0 });
    const search = el.shadowRoot!.querySelector('keep-search-input')!;
    search.dispatchEvent(
      new CustomEvent('search-change', {
        detail: { value: 'name' },
        bubbles: true,
        composed: true,
      }),
    );
    await el.updateComplete;
    expect(fieldNames(el)).toEqual(['FirstName', 'LastName']);
  });

  it('matches the search case-insensitively', async () => {
    const el = await open({ currentModeIndex: 0 });
    const search = el.shadowRoot!.querySelector('keep-search-input')!;
    search.dispatchEvent(
      new CustomEvent('search-change', { detail: { value: 'AGE' }, bubbles: true, composed: true }),
    );
    await el.updateComplete;
    expect(fieldNames(el)).toEqual(['Age']);
  });

  it('hides the matching rows without differences when the toggle is on', async () => {
    const el = await open({ currentModeIndex: 0 });
    // Formulas row plus three field rows, all visible.
    expect(visibleRows(el)).toHaveLength(4);

    const toggle = el.shadowRoot!.querySelector('wa-switch') as HTMLElement & { checked: boolean };
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.showDiffOnly).toBe(true);
    // FirstName is identical in both modes, so it goes; formulas, Age and LastName stay.
    expect(visibleRows(el)).toHaveLength(3);
  });

  it('keeps the formulas row when the toggle is on only if a formula differs', async () => {
    const el = await open({ currentModeIndex: 0, modes: [FIRST, THIRD] });
    expect(el.diffFormulas).toEqual([]);

    const toggle = el.shadowRoot!.querySelector('wa-switch') as HTMLElement & { checked: boolean };
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(rows(el)[0].classList.contains('hidden')).toBe(true);
  });

  it('recomputes the comparison when the mode list is replaced', async () => {
    const el = await open({ currentModeIndex: 0 });
    expect(fieldNames(el)).toEqual(['FirstName', 'Age', 'LastName']);
    el.modes = [FIRST, THIRD];
    await el.updateComplete;
    expect(fieldNames(el)).toEqual(['FirstName', 'Age']);
  });

  it('resets the comparison each time it reopens', async () => {
    const el = await open({ currentModeIndex: 0 });
    await chooseMode(el, 1, 'archive');
    expect(el.selectedModeNames).toEqual(['default', 'archive']);

    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;
    expect(el.selectedModeNames).toEqual(['default', 'draft']);
  });

  it('emits dialog-close from the header close button', async () => {
    const el = await open();
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    const seen = listen(el, 'dialog-close');
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(seen).toHaveLength(1);
  });

  it('forwards the native cancel event, so Escape does not desync the parent', async () => {
    // The original wired nothing to the dialog's own close path, so Escape closed the
    // native dialog while the parent still believed it open — and it never reopened.
    const el = await open();
    const seen = listen(el, 'dialog-close');
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(seen).toHaveLength(1);
  });

  it('does not emit the native dialog event names', async () => {
    // The outbound event is `dialog-close`, not `close`, precisely so a consumer can tell it
    // apart from the native <dialog> events. Neither of those escapes this element: the
    // inner dialog's own events do not compose, and nothing here re-fires them on the host.
    const el = await open();
    const closes = listen(el, 'close');
    const cancels = listen(el, 'cancel');
    dialog(el).dispatchEvent(new Event('cancel'));
    dialog(el).dispatchEvent(new Event('close'));
    expect(closes).toHaveLength(0);
    expect(cancels).toHaveLength(0);
  });

  it('gives the mode picker and the search field real accessible names', async () => {
    const el = await open();
    expect(selects(el)[0].getAttribute('label')).toBe('Mode');
    const search = el.shadowRoot!.querySelector('keep-search-input')!;
    expect(search.getAttribute('label')).toBe('Search Field');
  });

  it('takes no value property, so nothing can overwrite the chosen columns', async () => {
    const el = await open();
    expect('value' in el).toBe(false);
  });
});
