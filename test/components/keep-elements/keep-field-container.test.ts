/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-field-container';
import type FieldContainer from '../../../src/components/keep-elements/keep-field-container';
import type {
  KeepFieldItem,
  KeepFieldUpdateDetail,
  KeepRequiredChangeDetail,
} from '../../../src/components/keep-elements/keep-field-container';

const TAG = 'keep-field-container';

/**
 * `FieldDndContainer` always hands over a field that has been through its own normalising
 * pass, so this is the realistic shape: a scalar string field in a read mode.
 */
const scalarField = (): KeepFieldItem => ({
  name: 'Body',
  content: 'Body',
  externalName: 'Body',
  type: 'string',
  format: 'string',
  isMultiValue: false,
  fieldAccess: 'RW',
  fieldGroup: '',
});

const mount = (item: KeepFieldItem = scalarField(), required: string[] = []) =>
  mountLit<FieldContainer>(TAG, { item, itemIndex: 2, droppableIndex: 'read', required });

type ValueControl = HTMLElement & { value: string; disabled: boolean };
type SwitchControl = HTMLElement & { checked: boolean; disabled: boolean };

const shadow = (el: FieldContainer) => el.shadowRoot!;
const control = (el: FieldContainer, id: string) => shadow(el).querySelector(`#${id}`) as ValueControl;
const toggle = (el: FieldContainer, id: string) => shadow(el).querySelector(`#${id}`) as SwitchControl;
const text = (el: FieldContainer, selector: string) =>
  shadow(el).querySelector(selector)?.textContent?.trim() ?? '';

/** Type into a field the way the element sees it: set the value, then fire `input`. */
const type = (field: ValueControl, value: string) => {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

/** Pick from a select the way the element sees it: set the value, then fire `change`. */
const choose = (field: ValueControl, value: string) => {
  field.value = value;
  field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

/** Flip a switch the way the element sees it. */
const flip = (field: SwitchControl, checked: boolean) => {
  field.checked = checked;
  field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

/** Collect the details of every `field-update` the element emits from here on. */
const recordUpdates = (el: FieldContainer) => {
  const seen: KeepFieldUpdateDetail[] = [];
  el.addEventListener('field-update', (event) => seen.push((event as CustomEvent).detail));
  return seen;
};

const recordRequired = (el: FieldContainer) => {
  const seen: KeepRequiredChangeDetail[] = [];
  el.addEventListener('required-change', (event) => seen.push((event as CustomEvent).detail));
  return seen;
};

describe('keep-field-container — structure', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<FieldContainer>(TAG);
    expect(el.item).toEqual({});
    expect(el.itemIndex).toBe(-1);
    expect(el.droppableIndex).toBe('');
    expect(el.required).toEqual([]);
  });

  it('renders the item name and the two section headings', async () => {
    const el = await mount();
    expect(text(el, '.item-name-label')).toBe('Item Name');
    expect(text(el, '.item-name-value')).toBe('Body');
    expect(text(el, '.settings-title')).toBe('Field Setting');
  });

  it('renders nothing for the name when the field has none', async () => {
    const el = await mount({ content: 'x' });
    expect(text(el, '.item-name-value')).toBe('');
  });

  it('offers the fifteen field formats, in order', async () => {
    const el = await mount();
    const options = Array.from(
      shadow(el).querySelectorAll('#field-type wa-option'),
    ).map((option) => option.getAttribute('value'));
    expect(options).toEqual([
      'authors',
      'binary',
      'boolean',
      'byte',
      'date',
      'date-time',
      'double',
      'float',
      'int32',
      'int64',
      'names',
      'password',
      'readers',
      'richtext',
      'string',
    ]);
  });

  it('offers the three access modes with their labels', async () => {
    const el = await mount();
    const options = Array.from(shadow(el).querySelectorAll('#field-access wa-option')).map(
      (option) => [option.getAttribute('value'), option.textContent?.trim()],
    );
    expect(options).toEqual([
      ['RW', 'Read/Write'],
      ['RO', 'Read Only'],
      ['WO', 'Write Only'],
    ]);
  });

  it('seeds every control from the field', async () => {
    const el = await mount({ ...scalarField(), format: 'date', fieldAccess: 'RO' });
    expect(control(el, 'field-name').value).toBe('Body');
    expect(control(el, 'field-type').value).toBe('date');
    expect(control(el, 'field-access').value).toBe('RO');
  });

  it('falls back to the content when there is no external name', async () => {
    const el = await mount({ content: 'Subject' });
    expect(control(el, 'field-name').value).toBe('Subject');
  });

  it('shows an empty field name when the field has neither', async () => {
    const el = await mount({ name: 'x' });
    expect(control(el, 'field-name').value).toBe('');
  });

  it('reads the format out of items when the field is an array', async () => {
    const el = await mount({ type: 'array', items: { format: 'names' }, format: 'string' });
    expect(control(el, 'field-type').value).toBe('names');
  });

  it('falls back to the scalar format for an array with no items', async () => {
    const el = await mount({ type: 'array', format: 'boolean' });
    expect(control(el, 'field-type').value).toBe('boolean');
  });

  it('falls back to string when the field declares no format at all', async () => {
    const el = await mount({ name: 'Body' });
    expect(control(el, 'field-type').value).toBe('string');
  });

  it('selects no access mode when the field has none', async () => {
    // Web Awesome reports null, not '', when no option matches — the control shows its
    // placeholder. The original rendered a blank Material select for the same shape.
    const el = await mount({ name: 'Body' });
    expect(control(el, 'field-access').value).toBeNull();
  });
});

describe('keep-field-container — editing', () => {
  afterEach(cleanupLit);

  it('echoes the index and the mode key back with every update', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    type(control(el, 'field-name'), 'Body2');
    expect(seen[0].itemIndex).toBe(2);
    expect(seen[0].droppableIndex).toBe('read');
  });

  it('writes a new field name into both externalName and content', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    type(control(el, 'field-name'), 'Subject');
    expect(seen).toHaveLength(1);
    expect(seen[0].item).toMatchObject({ externalName: 'Subject', content: 'Subject' });
  });

  it('clears both when the field name is emptied', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    type(control(el, 'field-name'), '');
    expect(seen[0].item).toMatchObject({ externalName: '', content: '' });
  });

  it('maps a scalar format onto its field type', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    choose(control(el, 'field-type'), 'int32');
    expect(seen[0].item).toMatchObject({ format: 'int32', type: 'integer', isMultiValue: false });
  });

  it('forces multi-value when readers is chosen', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    choose(control(el, 'field-type'), 'readers');
    expect(seen[0].item).toMatchObject({
      type: 'array',
      isMultiValue: true,
      items: { format: 'readers', type: 'string' },
    });
    await el.updateComplete;
    expect(toggle(el, 'multi-value').checked).toBe(true);
  });

  it('forces multi-value when authors is chosen', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    choose(control(el, 'field-type'), 'authors');
    expect(seen[0].item).toMatchObject({ type: 'array', isMultiValue: true });
  });

  it('keeps an array field an array whatever format is chosen', async () => {
    const el = await mount({ type: 'array', items: { format: 'date' }, isMultiValue: true });
    const seen = recordUpdates(el);
    choose(control(el, 'field-type'), 'boolean');
    expect(seen[0].item).toMatchObject({
      type: 'array',
      isMultiValue: true,
      // The original wrote the *previous* items.format into items.type, and that is kept:
      // it is what the saved schema has looked like for as long as the control has existed.
      items: { format: 'boolean', type: 'date' },
    });
  });

  it('defaults the carried items type to string when the array had no items', async () => {
    const el = await mount({ type: 'array', format: 'string' });
    const seen = recordUpdates(el);
    choose(control(el, 'field-type'), 'binary');
    expect(seen[0].item).toMatchObject({ items: { format: 'binary', type: 'string' } });
  });

  it('sends the chosen access mode', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    choose(control(el, 'field-access'), 'WO');
    expect(seen[0].item).toMatchObject({ fieldAccess: 'WO' });
  });

  it('sends the typed field group', async () => {
    const el = await mount({ ...scalarField(), isMultiValue: true, type: 'array' });
    const seen = recordUpdates(el);
    type(control(el, 'field-group'), 'Names');
    expect(seen[0].item).toMatchObject({ fieldGroup: 'Names' });
  });

  it('disables the field group until the field is multi-value', async () => {
    const el = await mount();
    expect(control(el, 'field-group').disabled).toBe(true);
  });

  it('enables the field group for a multi-value field', async () => {
    const el = await mount({ ...scalarField(), isMultiValue: true });
    expect(control(el, 'field-group').disabled).toBe(false);
  });
});

describe('keep-field-container — the multi-value toggle', () => {
  afterEach(cleanupLit);

  it('moves the format into items when switched on', async () => {
    const el = await mount({ ...scalarField(), format: 'date' });
    const seen = recordUpdates(el);
    flip(toggle(el, 'multi-value'), true);
    expect(seen[0].item).toMatchObject({
      isMultiValue: true,
      type: 'array',
      items: { format: 'date' },
    });
    await el.updateComplete;
    expect(control(el, 'field-type').value).toBe('date');
  });

  it('moves items.format back out when switched off', async () => {
    const el = await mount({
      ...scalarField(),
      type: 'array',
      isMultiValue: true,
      items: { format: 'boolean' },
    });
    const seen = recordUpdates(el);
    flip(toggle(el, 'multi-value'), false);
    expect(seen[0].item).toMatchObject({
      isMultiValue: false,
      format: 'boolean',
      type: 'boolean',
    });
  });

  /**
   * The original read `editedItem.items.format` here with no guard, so this exact shape —
   * an array field the schema never gave an `items` object — threw a TypeError out of the
   * change handler.
   */
  it('falls back to the scalar format when an array field has no items', async () => {
    const el = await mount({ ...scalarField(), type: 'array', isMultiValue: true, format: 'float' });
    const seen = recordUpdates(el);
    flip(toggle(el, 'multi-value'), false);
    expect(seen[0].item).toMatchObject({ isMultiValue: false, format: 'float', type: 'number' });
  });

  it('falls back to string when neither end carries a format', async () => {
    const el = await mount({ type: 'array', isMultiValue: true });
    const seen = recordUpdates(el);
    flip(toggle(el, 'multi-value'), false);
    expect(seen[0].item).toMatchObject({ format: 'string', type: 'string' });
  });

  it('defaults to string when switching on a field with no format', async () => {
    const el = await mount({ name: 'Body' });
    const seen = recordUpdates(el);
    flip(toggle(el, 'multi-value'), true);
    expect(seen[0].item).toMatchObject({ items: { format: 'string' }, type: 'array' });
  });

  it('locks the toggle for a readers field', async () => {
    const el = await mount({ ...scalarField(), format: 'readers' });
    expect(toggle(el, 'multi-value').disabled).toBe(true);
  });

  it('locks the toggle for an authors field', async () => {
    const el = await mount({ ...scalarField(), format: 'authors' });
    expect(toggle(el, 'multi-value').disabled).toBe(true);
  });

  it('locks the toggle while a field group is set, and says why', async () => {
    const el = await mount({ ...scalarField(), isMultiValue: true, fieldGroup: 'Names' });
    expect(toggle(el, 'multi-value').disabled).toBe(true);
    const tooltip = shadow(el).querySelectorAll('keep-tooltip')[0];
    expect(tooltip.getAttribute('content')).toBe(
      'Field group should be empty to toggle off multi-value',
    );
  });

  it('says nothing when there is no field group', async () => {
    const el = await mount();
    expect(shadow(el).querySelectorAll('keep-tooltip')[0].getAttribute('content')).toBe('');
  });

  it('explains the disabled field group, and stops once it is enabled', async () => {
    const el = await mount();
    expect(shadow(el).querySelectorAll('keep-tooltip')[1].getAttribute('content')).toBe(
      'Enable multi-value to input a field group',
    );

    el.item = { ...scalarField(), isMultiValue: true };
    await el.updateComplete;
    expect(shadow(el).querySelectorAll('keep-tooltip')[1].getAttribute('content')).toBe('');
  });
});

describe('keep-field-container — encrypt and required', () => {
  afterEach(cleanupLit);

  it('seeds the encrypt switch from the field', async () => {
    const el = await mount({ ...scalarField(), encryptedField: true });
    expect(toggle(el, 'encrypt').checked).toBe(true);
  });

  it('sends the new encrypt flag', async () => {
    const el = await mount();
    const seen = recordUpdates(el);
    flip(toggle(el, 'encrypt'), true);
    expect(seen[0].item).toMatchObject({ encryptedField: true });
  });

  it('warns about encryption beside the switch', async () => {
    const el = await mount();
    expect(text(el, '.warning-text')).toBe('Please understand this option before enabling');
  });

  it('does not toggle encryption when the help glyph is clicked', async () => {
    const el = await mount();
    const encrypt = toggle(el, 'encrypt');
    const reached = vi.fn();
    encrypt.addEventListener('click', reached);

    const help = encrypt.querySelector('keep-tooltip')!;
    help.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(reached).not.toHaveBeenCalled();
  });

  it('checks the required switch when the field is in the list', async () => {
    const el = await mount(scalarField(), ['Body']);
    expect(toggle(el, 'required').checked).toBe(true);
  });

  it('adds the field to the required list', async () => {
    const el = await mount(scalarField(), ['Subject']);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), true);
    expect(seen[0].required).toEqual(['Subject', 'Body']);
  });

  it('removes the field from the required list', async () => {
    const el = await mount(scalarField(), ['Subject', 'Body']);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), false);
    expect(seen[0].required).toEqual(['Subject']);
  });

  it('sends the list unchanged when the field is already required', async () => {
    const el = await mount(scalarField(), ['Body']);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), true);
    expect(seen[0].required).toEqual(['Body']);
  });

  it('sends the list unchanged when the field was not required anyway', async () => {
    const el = await mount(scalarField(), ['Subject']);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), false);
    expect(seen[0].required).toEqual(['Subject']);
  });

  it('keys the required list on the content, not the name', async () => {
    const el = await mount({ name: 'Body', content: 'body_external' }, []);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), true);
    expect(seen[0].required).toEqual(['body_external']);
  });

  it('treats a field with no content as the empty name the original did', async () => {
    const el = await mount({ name: 'Body' }, []);
    const seen = recordRequired(el);
    flip(toggle(el, 'required'), true);
    expect(seen[0].required).toEqual(['']);
  });
});

describe('keep-field-container — accessibility (#713)', () => {
  afterEach(cleanupLit);

  it('gives every switch a visible label of its own', async () => {
    const el = await mount();
    const labels = Array.from(shadow(el).querySelectorAll('wa-switch')).map((sw) =>
      // firstChild rather than textContent: the encrypt switch also slots a help glyph.
      sw.textContent?.trim().split('\n')[0].trim(),
    );
    expect(labels).toEqual(['Multi-Value?', 'Encrypt', 'Required?']);
  });

  it('labels the three text controls', async () => {
    const el = await mount();
    expect(control(el, 'field-name').getAttribute('label')).toBe('Field Name');
    expect(control(el, 'field-type').getAttribute('label')).toBe('Field Type');
    expect(control(el, 'field-access').getAttribute('label')).toBe('Access');
    expect(control(el, 'field-group').getAttribute('label')).toBe('Field Group');
  });

  it('bundles its own Font Awesome library rather than reaching for the CDN', async () => {
    const el = await mount();
    const icons = Array.from(shadow(el).querySelectorAll('wa-icon'));
    expect(icons).not.toHaveLength(0);
    expect(icons.every((icon) => icon.getAttribute('library') === 'fa')).toBe(true);
  });
});

describe('keep-field-container — reacting to the parent', () => {
  afterEach(cleanupLit);

  it('re-seeds the working copy when a different field arrives', async () => {
    const el = await mount();
    el.item = { name: 'Subject', content: 'Subject', format: 'date', fieldAccess: 'RO' };
    await el.updateComplete;

    expect(text(el, '.item-name-value')).toBe('Subject');
    expect(control(el, 'field-name').value).toBe('Subject');
    expect(control(el, 'field-type').value).toBe('date');
    expect(control(el, 'field-access').value).toBe('RO');
  });

  it('does not discard an in-progress edit when the same object is re-applied', async () => {
    const item = scalarField();
    const el = await mount(item);
    type(control(el, 'field-name'), 'half-typed');

    // What the React bridge does on every parent render: assign the identical object.
    el.item = item;
    await el.updateComplete;

    expect(control(el, 'field-name').value).toBe('half-typed');
  });

  it('re-checks the required switch when the parent accepts the change', async () => {
    const el = await mount(scalarField(), []);
    expect(toggle(el, 'required').checked).toBe(false);

    el.required = ['Body'];
    await el.updateComplete;
    expect(toggle(el, 'required').checked).toBe(true);
  });

  it('keeps its edits out of the light DOM', async () => {
    const el = await mount();
    expect(el.children).toHaveLength(0);
  });
});
