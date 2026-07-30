/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';

// wa-textarea observes itself for autosizing, and jsdom has no ResizeObserver. Installed
// before the element module so the class exists by the time the dialog first renders.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import '../../../src/components/keep-elements/keep-script-editor';
import type ScriptEditor from '../../../src/components/keep-elements/keep-script-editor';
import type {
  KeepScriptData,
  KeepScriptsChangeDetail,
  KeepValidationRule,
  KeepValidationRulesChangeDetail,
} from '../../../src/components/keep-elements/keep-script-editor';

const TAG = 'keep-script-editor';

const scripts = (extra: Partial<KeepScriptData> = {}): KeepScriptData => ({
  computeWithForm: true,
  continueOnError: false,
  sign: false,
  readAccessFormula: { formulaType: 'domino', formula: '@All' },
  writeAccessFormula: { formulaType: 'domino', formula: '@UserName' },
  ...extra,
});

const rules: KeepValidationRule[] = [
  { formula: '@Length(Subject) > 0', formulaType: 'domino', message: 'Subject is required' },
];

const mount = (data: KeepScriptData = scripts(), validationRules: KeepValidationRule[] = rules) =>
  mountLit<ScriptEditor>(TAG, { data, validationRules });

const shadow = (el: ScriptEditor) => el.shadowRoot!;

const button = (el: ScriptEditor, label: string) =>
  shadow(el).querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

const dialog = (el: ScriptEditor) => shadow(el).querySelector<HTMLDialogElement>('dialog')!;

const texts = (el: ScriptEditor, selector: string) =>
  Array.from(shadow(el).querySelectorAll(selector)).map((node) => node.textContent?.trim() ?? '');

/** Open the Mode Settings panel, which is where everything but the second header lives. */
const expand = async (el: ScriptEditor) => {
  button(el, 'Expand Mode Settings').click();
  await el.updateComplete;
};

const openFormula = async (el: ScriptEditor, title: string) => {
  await expand(el);
  button(el, `Edit ${title}`).click();
  await el.updateComplete;
};

const recordScripts = (el: ScriptEditor) => {
  const seen: KeepScriptsChangeDetail[] = [];
  el.addEventListener('scripts-change', (event) => seen.push((event as CustomEvent).detail));
  return seen;
};

type SwitchControl = HTMLElement & { checked: boolean; disabled: boolean };
const toggle = (el: ScriptEditor, id: string) => shadow(el).querySelector(`#${id}`) as SwitchControl;

const flip = (field: SwitchControl, checked: boolean) => {
  field.checked = checked;
  field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

describe('keep-script-editor — structure', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<ScriptEditor>(TAG);
    expect(el.data).toEqual({});
    expect(el.validationRules).toEqual([]);
  });

  it('renders both panels', async () => {
    const el = await mount();
    expect(texts(el, '.panel-title')).toEqual(['Mode Settings', 'Validation Rules']);
  });

  it('starts with both panels collapsed', async () => {
    const el = await mount();
    expect(button(el, 'Expand Mode Settings').getAttribute('aria-expanded')).toBe('false');
    expect(button(el, 'Expand Validation Rules').getAttribute('aria-expanded')).toBe('false');
    expect(shadow(el).querySelectorAll('.formula-card')).toHaveLength(0);
    expect(shadow(el).querySelector('keep-textform-array')).toBeNull();
  });

  it('asks for the formulas to be tested', async () => {
    const el = await mount();
    const heard = vi.fn();
    el.addEventListener('test-formulas', heard);
    shadow(el).querySelector<HTMLButtonElement>('.panel-actions button')!.click();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('lists the five formulas once expanded', async () => {
    const el = await mount();
    await expand(el);
    expect(texts(el, '.formula-label')).toEqual([
      'Formula for Read Access',
      'Formula for Write Access',
      'Formula for Delete Access',
      'On Load Formula',
      'On Save Formula',
    ]);
  });

  it('turns the chevron and the label round when expanded', async () => {
    const el = await mount();
    await expand(el);
    const collapse = button(el, 'Collapse Mode Settings');
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(collapse.querySelector('wa-icon')!.getAttribute('name')).toBe('chevron-up');

    collapse.click();
    await el.updateComplete;
    expect(button(el, 'Expand Mode Settings').querySelector('wa-icon')!.getAttribute('name')).toBe(
      'chevron-down',
    );
  });

  it('hands the validation rules to keep-textform-array when that panel is opened', async () => {
    const el = await mount();
    button(el, 'Expand Validation Rules').click();
    await el.updateComplete;

    const list = shadow(el).querySelector('keep-textform-array')!;
    expect(list).toBeTruthy();
    expect(list.data).toEqual(rules);
    // The rule summary is keyed on this property, which the attribute has to reach.
    expect(list.title).toBe('message');
  });

  it('passes an edited rule list straight back out', async () => {
    const el = await mount();
    button(el, 'Expand Validation Rules').click();
    await el.updateComplete;

    const seen: KeepValidationRulesChangeDetail[] = [];
    el.addEventListener('validation-rules-change', (event) =>
      seen.push((event as CustomEvent).detail),
    );

    shadow(el).querySelector('keep-textform-array')!.setData([]);
    expect(seen[0].rules).toEqual([]);
  });
});

describe('keep-script-editor — the formula cards', () => {
  afterEach(cleanupLit);

  it('shows a stored formula', async () => {
    const el = await mount();
    await expand(el);
    expect(texts(el, '.formula-text')).toEqual(['@All', '@UserName']);
  });

  /**
   * The shape that crashed the original: four of the five cards guarded on
   * `formula !== ""`, which is true for a *missing* key, and then dereferenced it.
   */
  it('shows the placeholder for every formula the mode has never had', async () => {
    const el = await mount({ computeWithForm: false });
    await expand(el);
    expect(texts(el, '.formula-placeholder')).toEqual([
      'Enter Formula...',
      'Enter Formula...',
      'Enter Formula...',
      'Enter Formula...',
      'Enter Formula...',
    ]);
  });

  it('shows the placeholder for a stored but empty formula', async () => {
    const el = await mount({ onSave: { formulaType: 'domino', formula: '' } });
    await expand(el);
    expect(texts(el, '.formula-placeholder')).toHaveLength(5);
    expect(texts(el, '.formula-text')).toEqual([]);
  });

  it('disables the edit control until there is something to edit', async () => {
    const el = await mount();
    await expand(el);
    expect(button(el, 'Edit Formula for Read Access').disabled).toBe(false);
    expect(button(el, 'Edit On Save Formula').disabled).toBe(true);
  });

  it('reports that the form computes the write formula', async () => {
    const el = await mount();
    await expand(el);
    expect(texts(el, '.computed-note')).toEqual(['Computed with Form - enabled']);
  });

  it('reports that it does not', async () => {
    const el = await mount(scripts({ computeWithForm: false }));
    await expand(el);
    expect(texts(el, '.computed-note')).toEqual(['Computed with Form - disabled']);
  });
});

describe('keep-script-editor — the edit dialog', () => {
  afterEach(cleanupLit);

  it('opens as a modal, named after the formula', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(dialog(el).getAttribute('aria-label')).toBe('Formula for Read Access');
  });

  it('seeds the box with the stored formula', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    const box = shadow(el).querySelector('#formula') as HTMLElement & { value: string };
    expect(box.value).toBe('@All');
  });

  it('opens empty when the stored formula object has no formula in it', async () => {
    // A shape the schema allows: the key exists, so the Edit control is enabled, but the
    // string is not there.
    const el = await mount(scripts({ onSave: { formulaType: 'domino' } }));
    await openFormula(el, 'On Save Formula');
    const box = shadow(el).querySelector('#formula') as HTMLElement & { value: string };
    expect(box.value).toBe('');
  });

  it('does not call showModal on a dialog that is already open', async () => {
    // The guard exists because showModal() on an open dialog throws InvalidStateError.
    // jsdom's showModal is a stub that never sets `open`, so the flag is set by hand.
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    dialog(el).open = true;

    button(el, 'Edit Formula for Write Access').click();
    await el.updateComplete;
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
  });

  it('offers the two compute toggles for write access only', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Write Access');
    expect(shadow(el).querySelectorAll('.compute-line')).toHaveLength(2);
  });

  it('offers neither for any other formula', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    expect(shadow(el).querySelectorAll('.compute-line')).toHaveLength(0);
  });

  it('lets continue-on-error be set only while the form computes', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Write Access');
    expect(toggle(el, 'continue-on-error').disabled).toBe(false);

    flip(toggle(el, 'compute-with-form'), false);
    await el.updateComplete;
    expect(toggle(el, 'continue-on-error').disabled).toBe(true);
    expect(shadow(el).querySelector('.compute-line.continue')!.classList).toContain('disabled');
  });

  it('saves the typed formula under the right key', async () => {
    const el = await mount(scripts({ onLoad: { formulaType: 'domino', formula: '@Now' } }));
    await openFormula(el, 'On Load Formula');
    const box = shadow(el).querySelector('#formula') as HTMLElement & { value: string };
    box.value = '@Created';
    box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const seen = recordScripts(el);
    shadow(el).querySelectorAll<HTMLElement>('.dialog-actions keep-button')[1].click();

    expect(seen[0].scripts).toMatchObject({
      onLoad: { formulaType: 'domino', formula: '@Created' },
      computeWithForm: true,
      continueOnError: false,
    });
  });

  it('carries the compute toggles into the save', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Write Access');
    flip(toggle(el, 'continue-on-error'), true);

    const seen = recordScripts(el);
    shadow(el).querySelectorAll<HTMLElement>('.dialog-actions keep-button')[1].click();
    expect(seen[0].scripts).toMatchObject({ computeWithForm: true, continueOnError: true });
  });

  it('saves nothing when no formula is being edited', async () => {
    // The dialog stays in the template while the panel is open, so its buttons are
    // reachable with nothing open. The original wrote a `""` key into the mode here.
    const el = await mount();
    await expand(el);
    const seen = recordScripts(el);
    shadow(el).querySelectorAll<HTMLElement>('.dialog-actions keep-button')[1].click();
    expect(seen).toHaveLength(0);
  });

  it('closes on save', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    shadow(el).querySelectorAll<HTMLElement>('.dialog-actions keep-button')[1].click();
    await el.updateComplete;
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('discards the compute edits on cancel', async () => {
    const el = await mount(scripts({ computeWithForm: true, continueOnError: true }));
    await openFormula(el, 'Formula for Write Access');
    flip(toggle(el, 'compute-with-form'), false);
    await el.updateComplete;

    const seen = recordScripts(el);
    shadow(el).querySelectorAll<HTMLElement>('.dialog-actions keep-button')[0].click();
    await el.updateComplete;

    expect(seen).toHaveLength(0);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();

    // Reopening shows what the mode still says, not what was cancelled.
    button(el, 'Edit Formula for Write Access').click();
    await el.updateComplete;
    expect(toggle(el, 'compute-with-form').checked).toBe(true);
  });

  it('closes from the header', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    const header = shadow(el).querySelector('keep-form-dialog-header')!;
    header.dispatchEvent(new CustomEvent('header-close', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  /**
   * Escape closes a modal natively and fires `close`. Without a listener the key stayed
   * set behind a shut dialog, and since the open is driven by a *change* to that key the
   * same card could never be reopened.
   */
  it('can reopen the same formula after it was dismissed with Escape', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    dialog(el).dispatchEvent(new Event('close'));
    await el.updateComplete;

    button(el, 'Edit Formula for Read Access').click();
    await el.updateComplete;
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(2);
  });
});

describe('keep-script-editor — signing', () => {
  afterEach(cleanupLit);

  it('seeds the switch from the mode', async () => {
    const el = await mount(scripts({ sign: true }));
    await expand(el);
    expect(toggle(el, 'sign').checked).toBe(true);
  });

  it('reports the new value immediately, without waiting for a save', async () => {
    const el = await mount();
    await expand(el);
    const seen = recordScripts(el);
    flip(toggle(el, 'sign'), true);
    expect(seen[0].scripts).toMatchObject({ sign: true });
  });

  it('warns about signing beside the switch', async () => {
    const el = await mount();
    await expand(el);
    expect(texts(el, '.sign-note')).toEqual(['Please understand this option before enabling']);
  });

  it('does not toggle signing when the help glyph is clicked', async () => {
    const el = await mount();
    await expand(el);
    const sign = toggle(el, 'sign');
    const reached = vi.fn();
    sign.addEventListener('click', reached);

    sign.querySelector('keep-tooltip')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    expect(reached).not.toHaveBeenCalled();
  });
});

describe('keep-script-editor — accessibility (#713)', () => {
  afterEach(cleanupLit);

  it('names every edit control after the formula it edits', async () => {
    const el = await mount();
    await expand(el);
    const labels = Array.from(shadow(el).querySelectorAll('.formula-card button')).map((node) =>
      node.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Edit Formula for Read Access',
      'Edit Formula for Write Access',
      'Edit Formula for Delete Access',
      'Edit On Load Formula',
      'Edit On Save Formula',
    ]);
  });

  it('points each collapse control at the region it collapses', async () => {
    const el = await mount();
    expect(button(el, 'Expand Mode Settings').getAttribute('aria-controls')).toBe('mode-settings');
    expect(button(el, 'Expand Validation Rules').getAttribute('aria-controls')).toBe(
      'validation-rules',
    );
    expect(shadow(el).querySelector('#mode-settings')).toBeTruthy();
    expect(shadow(el).querySelector('#validation-rules')).toBeTruthy();
  });

  it('labels the formula box, which had no label at all before', async () => {
    const el = await mount();
    await openFormula(el, 'Formula for Read Access');
    const box = shadow(el).querySelector('#formula')!;
    expect(box.getAttribute('label')).toBe('Formula');
    expect(box.getAttribute('placeholder')).toBe('Enter Formula...');
  });

  it('gives the sign switch a label of its own', async () => {
    const el = await mount();
    await expand(el);
    expect(toggle(el, 'sign').textContent?.trim().split('\n')[0].trim()).toBe('Sign Document');
  });

  it('bundles its own Font Awesome library rather than reaching for the CDN', async () => {
    const el = await mount();
    await expand(el);
    const icons = Array.from(shadow(el).querySelectorAll('wa-icon'));
    expect(icons).not.toHaveLength(0);
    expect(icons.every((icon) => icon.getAttribute('library') === 'fa')).toBe(true);
  });
});

describe('keep-script-editor — reacting to the parent', () => {
  afterEach(cleanupLit);

  it('re-seeds the compute toggles when the mode changes underneath it', async () => {
    const el = await mount(scripts({ computeWithForm: false, continueOnError: false }));
    await openFormula(el, 'Formula for Write Access');
    expect(toggle(el, 'compute-with-form').checked).toBe(false);

    el.data = scripts({ computeWithForm: true, continueOnError: true });
    await el.updateComplete;
    expect(toggle(el, 'compute-with-form').checked).toBe(true);
    expect(toggle(el, 'continue-on-error').checked).toBe(true);
  });

  it('keeps everything it renders out of the light DOM', async () => {
    const el = await mount();
    expect(el.children).toHaveLength(0);
  });
});
