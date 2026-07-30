/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';

// keep-script-editor renders a wa-textarea, which observes itself for autosizing, and jsdom
// has no ResizeObserver. Installed before the element module so the class exists by the time
// the panel first renders.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import { store } from '../../../src/store/store';
import { toggleAlert } from '../../../src/store/alerts/action';
import '../../../src/components/keep-elements/keep-mode-fields';
import type ModeFields from '../../../src/components/keep-elements/keep-mode-fields';
import type {
  KeepFieldIndexChangeDetail,
  KeepFieldsRemoveDetail,
  KeepModeFieldState,
} from '../../../src/components/keep-elements/keep-mode-fields';
import type { KeepFieldItem } from '../../../src/components/keep-elements/keep-field-container';
import type Checkbox from '../../../src/components/keep-elements/keep-checkbox';

const TAG = 'keep-mode-fields';

/** The panel only ever reads the first key, but it walks every one when it draws rows. */
const READ = 'read-fields';

const FIELDS: KeepFieldItem[] = [
  { name: 'Subject', content: 'Subject', format: 'string', fieldAccess: 'RW' },
  { name: 'Body', content: 'Body', format: 'richtext', fieldAccess: 'RO', fieldGroup: 'Notes' },
];

const modeState = (fields: KeepFieldItem[] = FIELDS): KeepModeFieldState => ({ [READ]: fields });

const mount = (props: Partial<ModeFields> = {}) =>
  mountLit<ModeFields>(TAG, { state: modeState(), required: [], ...props });

const shadow = (el: ModeFields) => el.shadowRoot!;

const rowButtons = (el: ModeFields) =>
  Array.from(shadow(el).querySelectorAll<HTMLButtonElement>('.row-select'));

const metaText = (el: ModeFields) =>
  Array.from(shadow(el).querySelectorAll('.row-meta')).map((node) =>
    node.textContent!.replace(/\s+/g, ' ').trim(),
  );

const textButton = (el: ModeFields, label: string) =>
  Array.from(shadow(el).querySelectorAll<HTMLButtonElement>('.text-button')).find(
    (button) => button.textContent?.trim() === label,
  )!;

/** Only `value` is touched, and the element reads it back off the event target. */
const addInput = (el: ModeFields) =>
  shadow(el).querySelector('wa-input') as unknown as HTMLElement & { value: string };

const addButton = (el: ModeFields) =>
  shadow(el).querySelector<HTMLButtonElement>('button[aria-label="Add Custom Field"]')!;

const dialogEl = (el: ModeFields) => shadow(el).querySelector('dialog')!;

/** Row checkboxes only; the select-all box lives in the batch bar, outside the list. */
const rowCheckboxes = (el: ModeFields) =>
  Array.from(shadow(el).querySelectorAll<Checkbox>('.row keep-checkbox'));

const selectAllBox = (el: ModeFields) =>
  shadow(el).querySelector<Checkbox>('.batch-actions > keep-checkbox')!;

/** keep-checkbox re-emits a composed `change` from the host once its own state has moved. */
const toggle = async (box: Checkbox, checked: boolean) => {
  box.checked = checked;
  box.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Type into the add box the way the element reads it: off `event.target.value`. */
const type = async (el: ModeFields, value: string) => {
  const input = addInput(el);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
};

const listen = <T>(el: ModeFields, type_: string) => {
  const seen: T[] = [];
  el.addEventListener(type_, (event) => seen.push((event as CustomEvent<T>).detail));
  return seen;
};

describe('keep-mode-fields', () => {
  beforeEach(() => {
    // The dialog methods are vi.fn() stand-ins from setupTests, so `open` never moves on
    // its own. Spying per test keeps the call counts isolated.
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(() => {});
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanupLit();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<ModeFields>(TAG);
    expect(el.state).toEqual({});
    expect(el.scripts).toEqual({});
    expect(el.validationRules).toEqual([]);
    expect(el.required).toEqual([]);
    expect(el.fieldIndex).toBe(0);
    expect(el.addField('read', {})).toBe('');
  });

  describe('the field list', () => {
    it('renders one row per field, over every droppable key', async () => {
      const el = await mount({ state: { [READ]: [FIELDS[0]], write: [FIELDS[1]] } });
      expect(rowButtons(el).map((button) => button.querySelector('.row-name')!.textContent)).toEqual(
        ['Subject', 'Body'],
      );
    });

    it('shows the placeholder instead of a list when the mode has no fields', async () => {
      const el = await mount({ state: modeState([]) });
      expect(shadow(el).querySelector('.field-list')).toBeNull();
      expect(shadow(el).querySelector('.empty-text')!.textContent).toContain('Please add field/s');
    });

    it('describes each field by format, access flag, group and required marker', async () => {
      const el = await mount({ required: ['Subject'] });
      expect(metaText(el)).toEqual(['String • R / W • Required', 'Richtext • R / O • Notes']);
    });

    it('derives the access flag from readOnly/writeOnly when fieldAccess is blank', async () => {
      const el = await mount({
        state: modeState([
          { name: 'Ro', content: 'Ro', format: 'string', fieldAccess: '  ', readOnly: true },
          { name: 'Wo', content: 'Wo', format: 'string', writeOnly: true },
          { name: 'Rw', content: 'Rw', format: 'string', readOnly: true, writeOnly: true },
        ]),
      });
      expect(metaText(el)).toEqual([
        'String • R / O',
        'String • W / O',
        'String • R / W',
      ]);
    });

    it('reads an array field its format out of items, and survives one that has none', async () => {
      const el = await mount({
        state: modeState([
          { name: 'Cc', content: 'Cc', type: 'array', items: { format: 'names' } },
          { name: 'Bcc', content: 'Bcc', type: 'array' },
        ]),
      });
      // The original called capitalizeFirst on the missing format and threw, taking the
      // whole list with it; the second row is the regression guard. It renders the access
      // flag alone, which is what the surrounding bullet guards already implied.
      expect(metaText(el)).toEqual(['Names • R / W', 'R / W']);
    });
  });

  describe('selection', () => {
    it('emits field-index-change and marks the row current when one is clicked', async () => {
      const el = await mount();
      const seen = listen<KeepFieldIndexChangeDetail>(el, 'field-index-change');

      rowButtons(el)[1].click();
      await el.updateComplete;

      expect(seen).toEqual([{ fieldIndex: 1 }]);
      expect(rowButtons(el)[1].getAttribute('aria-current')).toBe('true');
      expect(rowButtons(el)[0].hasAttribute('aria-current')).toBe(false);
    });

    it('hands the selected field to keep-field-container with its index and mode key', async () => {
      const el = await mount({ fieldIndex: 1, required: ['Body'] });
      const pane = shadow(el).querySelector('keep-field-container')!;
      expect((pane as unknown as { item: KeepFieldItem }).item.name).toBe('Body');
      expect((pane as unknown as { itemIndex: number }).itemIndex).toBe(1);
      expect((pane as unknown as { droppableIndex: string }).droppableIndex).toBe(READ);
      expect((pane as unknown as { required: string[] }).required).toEqual(['Body']);
    });

    it('re-seeds the selection when the list shrinks past the selected index', async () => {
      const el = await mount({ fieldIndex: 1 });
      el.state = modeState([FIELDS[0]]);
      await el.updateComplete;
      const pane = shadow(el).querySelector('keep-field-container')!;
      expect((pane as unknown as { item: KeepFieldItem }).item.name).toBe('Subject');
    });

    it('shows the empty settings pane, and no keep-field-container, with no fields', async () => {
      const el = await mount({ state: modeState([]) });
      expect(shadow(el).querySelector('keep-field-container')).toBeNull();
      expect(shadow(el).querySelector('.no-field-message')!.textContent).toContain(
        'No field found',
      );
    });
  });

  describe('adding a custom field', () => {
    it('builds the new field record and clears no error when the add succeeds', async () => {
      const addField = vi.fn(() => '');
      const el = await mount({ addField });

      await type(el, 'Approver');
      addButton(el).click();
      await el.updateComplete;

      expect(addField).toHaveBeenCalledWith('read', {
        content: 'Approver',
        externalName: 'Approver',
        type: 'string',
        format: 'string',
        isMultiValue: false,
        name: 'Approver',
        fieldAccess: 'RW',
        fieldGroup: '',
      });
      expect(shadow(el).querySelector('.error-text')).toBeNull();
    });

    it('renders the reason the add was refused, in a live region', async () => {
      const el = await mount({ addField: () => 'The name already exists.' });

      await type(el, 'Subject');
      addButton(el).click();
      await el.updateComplete;

      const error = shadow(el).querySelector('.error-text')!;
      expect(error.textContent).toContain('The name already exists.');
      expect(error.getAttribute('role')).toBe('alert');
    });

    it('clears the message again on the next keystroke', async () => {
      const el = await mount({ addField: () => 'The name already exists.' });
      await type(el, 'Subject');
      addButton(el).click();
      await el.updateComplete;

      await type(el, 'Subjectt');
      expect(shadow(el).querySelector('.error-text')).toBeNull();
    });

    it('rejects whitespace without calling addField', async () => {
      const addField = vi.fn(() => '');
      const el = await mount({ addField });

      await type(el, '   ');
      addButton(el).click();
      await el.updateComplete;

      expect(addField).not.toHaveBeenCalled();
      expect(shadow(el).querySelector('.error-text')!.textContent).toContain(
        'Field name cannot be empty.',
      );
    });

    it('does nothing at all when the box is empty', async () => {
      const addField = vi.fn(() => '');
      const el = await mount({ addField });

      addButton(el).click();
      await el.updateComplete;

      expect(addField).not.toHaveBeenCalled();
      expect(shadow(el).querySelector('.error-text')).toBeNull();
    });
  });

  describe('batch delete', () => {
    it('disables the entry point when the mode has no fields', async () => {
      const el = await mount({ state: modeState([]) });
      expect(textButton(el, 'Delete Field(s)').disabled).toBe(true);
    });

    it('shows a named checkbox on every row once batch mode is on', async () => {
      const el = await mount();
      expect(rowCheckboxes(el)).toHaveLength(0);

      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      expect(rowCheckboxes(el)).toHaveLength(2);
      expect(rowCheckboxes(el)[0].textContent).toContain('Select Subject');
      expect(selectAllBox(el).textContent).toContain('Select all fields');
    });

    it('explains the disabled Remove button while nothing is ticked', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      const tooltip = shadow(el).querySelector('keep-tooltip')!;
      expect(tooltip.getAttribute('content')).toBe(
        'Please select which field/s to remove first.',
      );

      await toggle(rowCheckboxes(el)[0], true);
      await el.updateComplete;
      expect(shadow(el).querySelector('keep-tooltip')!.getAttribute('content')).toBe('');
    });

    it('does not open the dialog when nothing is ticked', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      textButton(el, 'Remove').click();
      await el.updateComplete;

      expect(dialogEl(el).showModal).not.toHaveBeenCalled();
    });

    it('lists the ticked fields in the dialog it opens', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      await toggle(rowCheckboxes(el)[1], true);
      await el.updateComplete;
      textButton(el, 'Remove').click();
      await el.updateComplete;

      expect(dialogEl(el).showModal).toHaveBeenCalledTimes(1);
      expect(
        Array.from(shadow(el).querySelectorAll('.dialog-field-name')).map((n) => n.textContent),
      ).toEqual(['Body']);
    });

    it('unticking a row takes it back out of the basket', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      await toggle(rowCheckboxes(el)[0], true);
      await el.updateComplete;
      await toggle(rowCheckboxes(el)[0], false);
      await el.updateComplete;

      textButton(el, 'Remove').click();
      await el.updateComplete;
      expect(dialogEl(el).showModal).not.toHaveBeenCalled();
    });

    it('ticks and clears every field from the select-all box', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      await toggle(selectAllBox(el), true);
      await el.updateComplete;
      expect(rowCheckboxes(el).every((box) => box.checked)).toBe(true);

      await toggle(selectAllBox(el), false);
      await el.updateComplete;
      expect(rowCheckboxes(el).some((box) => box.checked)).toBe(false);
    });

    it('emits fields-remove, leaves batch mode, closes the dialog and reports success', async () => {
      const dispatch = vi.spyOn(store, 'dispatch');
      const el = await mount();
      const seen = listen<KeepFieldsRemoveDetail>(el, 'fields-remove');

      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;
      await toggle(rowCheckboxes(el)[0], true);
      await el.updateComplete;
      textButton(el, 'Remove').click();
      await el.updateComplete;

      shadow(el).querySelectorAll('keep-button')[1].dispatchEvent(new Event('click'));
      await el.updateComplete;

      // The normalised row, not the raw field — the same object the click handler saw, as
      // before. `remove()` upstream matches on id and content, both of which survive.
      expect(seen).toEqual([
        { fields: [{ ...FIELDS[0], isMultiValue: false, delete: false }] },
      ]);
      expect(rowCheckboxes(el)).toHaveLength(0);
      expect(textButton(el, 'Delete Field(s)')).toBeTruthy();
      // The original built this action and threw it away; it is dispatched now.
      expect(dispatch).toHaveBeenCalledWith(
        toggleAlert('Successfully deleted fields from the current mode.'),
      );
    });

    it('keeps the basket when batch mode is cancelled and empties it on re-entry', async () => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;
      await toggle(rowCheckboxes(el)[0], true);
      await el.updateComplete;

      // Leaving keeps what was ticked — the original's guard read the pre-toggle flag.
      textButton(el, 'Cancel').click();
      await el.updateComplete;
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;

      // …and re-entering starts from empty, so Remove has nothing to open the dialog for.
      textButton(el, 'Remove').click();
      await el.updateComplete;
      expect(dialogEl(el).showModal).not.toHaveBeenCalled();
    });

    /**
     * `showModal` is a stand-in in this environment, so it never sets `open` and the guard
     * in `updated()` would short-circuit before reaching `close()`. Each case therefore
     * mirrors by hand what a real `showModal` would have done to the attribute, which is the
     * only way to exercise the closing half at all.
     */
    it.each([
      ['the header close button', (el: ModeFields) =>
        shadow(el)
          .querySelector('keep-form-dialog-header')!
          .dispatchEvent(new CustomEvent('header-close', { bubbles: true, composed: true }))],
      ['Cancel', (el: ModeFields) =>
        shadow(el).querySelectorAll('keep-button')[0].dispatchEvent(new Event('click'))],
      ['the Escape key', (el: ModeFields) => dialogEl(el).dispatchEvent(new Event('cancel'))],
    ])('closes the dialog from %s', async (_name, close) => {
      const el = await mount();
      textButton(el, 'Delete Field(s)').click();
      await el.updateComplete;
      await toggle(rowCheckboxes(el)[0], true);
      await el.updateComplete;
      textButton(el, 'Remove').click();
      await el.updateComplete;
      dialogEl(el).open = true;

      close(el);
      await el.updateComplete;

      expect(dialogEl(el).close).toHaveBeenCalledTimes(1);
    });
  });

  describe('the two nested elements', () => {
    it('passes the scripts and the validation rules straight through', async () => {
      const rules = [{ formula: '@All', formulaType: 'domino', message: 'nope' }];
      const el = await mount({ scripts: { computeWithForm: true }, validationRules: rules });
      const editor = shadow(el).querySelector('keep-script-editor')!;
      expect((editor as unknown as { data: { computeWithForm?: boolean } }).data).toEqual({
        computeWithForm: true,
      });
      expect((editor as unknown as { validationRules: unknown[] }).validationRules).toBe(rules);
    });

    it('lets their events cross the boundary without re-emitting them', async () => {
      const el = await mount();
      const seen: string[] = [];
      for (const name of [
        'field-update',
        'required-change',
        'scripts-change',
        'validation-rules-change',
        'test-formulas',
      ]) {
        el.addEventListener(name, () => seen.push(name));
      }

      shadow(el)
        .querySelector('keep-field-container')!
        .dispatchEvent(new CustomEvent('field-update', { bubbles: true, composed: true }));
      shadow(el)
        .querySelector('keep-field-container')!
        .dispatchEvent(new CustomEvent('required-change', { bubbles: true, composed: true }));
      const editor = shadow(el).querySelector('keep-script-editor')!;
      editor.dispatchEvent(new CustomEvent('scripts-change', { bubbles: true, composed: true }));
      editor.dispatchEvent(
        new CustomEvent('validation-rules-change', { bubbles: true, composed: true }),
      );
      editor.dispatchEvent(new CustomEvent('test-formulas', { bubbles: true, composed: true }));

      // Exactly once each: a re-emit on top of the bubbling original would double every edit.
      expect(seen).toEqual([
        'field-update',
        'required-change',
        'scripts-change',
        'validation-rules-change',
        'test-formulas',
      ]);
    });
  });
});
