/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { INIT_STATE } from '../../../src/store/databases/types';
import { addForm, fetchKeepScopes } from '../../../src/store/databases/reducer';
import { runSaveFunction } from '../../../src/store/navigationGuard/saveFunction';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import '../../../src/components/keep-elements/keep-access-tabs';
import type AccessTabs from '../../../src/components/keep-elements/keep-access-tabs';

/**
 * The three write thunks are replaced; everything else in the module stays real, because the
 * store and the other elements under test import from it too. Each stub records its call and
 * returns a thunk-shaped no-op so `dispatch` is happy.
 */
const calls = vi.hoisted(() => ({
  updateFormMode: [] as any[][],
  deleteFormMode: [] as any[][],
  updateSchema: [] as any[][],
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  updateFormMode: (...args: any[]) => {
    calls.updateFormMode.push(args);
    return () => Promise.resolve();
  },
  deleteFormMode: (...args: any[]) => {
    calls.deleteFormMode.push(args);
    return () => Promise.resolve();
  },
  updateSchema: (...args: any[]) => {
    calls.updateSchema.push(args);
    return () => Promise.resolve();
  },
}));

const TAG = 'keep-access-tabs';

const NSF_PATH = 'orders.nsf';
const SCHEMA_NAME = 'Alpha';
const FORM_NAME = 'Contact';

const mode = (modeName: string, overrides: Record<string, unknown> = {}) =>
  ({
    modeName,
    computeWithForm: false,
    readAccessFormula: { formulaType: 'domino', formula: '@True' },
    writeAccessFormula: { formulaType: 'domino', formula: '@True' },
    deleteAccessFormula: { formulaType: 'domino', formula: '@False' },
    onLoad: { formulaType: 'domino', formula: 'LOAD' },
    onSave: { formulaType: 'domino', formula: 'SAVE' },
    sign: false,
    continueOnError: true,
    required: ['Field1'],
    validationRules: [],
    fields: [{ name: 'Field1', type: 'string', fieldAccess: 'RW' }],
    ...overrides,
  }) as any;

const schema = (modes: any[]) =>
  ({
    '@unid': 'unid',
    apiName: 'alpha',
    schemaName: SCHEMA_NAME,
    nsfPath: NSF_PATH,
    forms: [{ formName: FORM_NAME, alias: [FORM_NAME], formModes: modes }],
    configuredForms: [FORM_NAME],
  }) as any;

const fieldState = () => ({
  ReadAccess: [{ id: '1', content: 'Field1', name: 'Field1', type: 'string', fieldAccess: 'RW' }],
});

const isDirty = () => store.getState().navigationGuard.isDirty;

/** The nested elements this one drives, found by tag inside its shadow root. */
const modeFields = (el: AccessTabs) => el.shadowRoot!.querySelector('keep-mode-fields')!;
const unsavedDialog = (el: AccessTabs) =>
  el.shadowRoot!.querySelector('keep-unsaved-changes-dialog') as HTMLElement & { open: boolean };
const addModeDialog = (el: AccessTabs) =>
  el.shadowRoot!.querySelector('keep-add-mode-dialog') as HTMLElement & {
    open: boolean;
    formError: string;
    clone: boolean;
  };
const drawer = (el: AccessTabs) =>
  el.shadowRoot!.querySelector('keep-drawer') as HTMLElement & { open: boolean };
const testForm = (el: AccessTabs) => el.shadowRoot!.querySelector('keep-test-form')!;

/** Buttons are found by their caption, which is the only thing the user sees. */
const buttonNamed = (el: AccessTabs, caption: string) =>
  [...el.shadowRoot!.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === caption,
  )!;

/** An edit arriving from one of the nested editors, exactly as they raise it. */
const editorEvent = (el: AccessTabs, type: string, detail: unknown) => {
  modeFields(el).dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
};

describe('keep-access-tabs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.dispatch({ type: INIT_STATE });
    calls.updateFormMode.length = 0;
    calls.deleteFormMode.length = 0;
    calls.updateSchema.length = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.useRealTimers();
  });

  const mount = (props: Partial<AccessTabs> = {}) =>
    mountLit<AccessTabs>(TAG, {
      state: fieldState(),
      modes: [mode('default')],
      currentModeIndex: 0,
      schemaData: schema([mode('default')]),
      nsfPath: NSF_PATH,
      schemaName: SCHEMA_NAME,
      formName: FORM_NAME,
      ...props,
    } as Partial<AccessTabs>);

  /** Let the mount-time dirty-tracking pause expire, so later edits count as edits. */
  const settle = async (el: AccessTabs) => {
    await vi.advanceTimersByTimeAsync(600);
    await el.updateComplete;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('seeding from the current mode', () => {
    it('hands the mode scripts, required list and rules to the field panel', async () => {
      const modes = [mode('default'), mode('draft', { required: ['Other'] })];
      const el = await mount({ modes, currentModeIndex: 1 } as Partial<AccessTabs>);
      const panel = modeFields(el) as any;
      expect(panel.required).toEqual(['Other']);
      expect(panel.scripts.onLoad.formula).toBe('LOAD');
      expect(panel.scripts.continueOnError).toBe(true);
    });

    it('shows the current mode name on the picker', async () => {
      const modes = [mode('default'), mode('draft')];
      const el = await mount({ modes, currentModeIndex: 1 } as Partial<AccessTabs>);
      expect(el.shadowRoot!.querySelector('.mode-trigger')!.textContent).toContain('draft');
    });

    it('lists every mode in the picker, sorted by name', async () => {
      const el = await mount({
        modes: [mode('zeta'), mode('alpha'), mode('default')],
      } as Partial<AccessTabs>);
      const items = [...el.shadowRoot!.querySelectorAll('wa-dropdown-item')].map(
        (item) => item.getAttribute('value'),
      );
      expect(items).toEqual(['alpha', 'default', 'zeta']);
    });

    it('does not throw for a mode index that outran the list', async () => {
      const el = await mount({ modes: [mode('default')], currentModeIndex: 7 } as Partial<AccessTabs>);
      expect(el.shadowRoot!.querySelector('.mode-trigger')!.textContent?.trim()).toBe('');
    });

    it('does not throw for an empty field map', async () => {
      const el = await mount({ state: {} } as Partial<AccessTabs>);
      expect(modeFields(el)).toBeTruthy();
    });
  });

  /*
   * Carried from TabsAccess.test.tsx. Every case there drove the six edits through a stand-in
   * for the field panel; they arrive here as the events that panel actually raises.
   */
  describe('dirty tracking', () => {
    it('does not mark dirty on mount', async () => {
      const el = await mount();
      await settle(el);
      expect(isDirty()).toBe(false);
    });

    it('marks dirty when a script setting is toggled', async () => {
      const el = await mount();
      await settle(el);
      editorEvent(el, 'scripts-change', {
        scripts: { ...(modeFields(el) as any).scripts, computeWithForm: true },
      });
      await el.updateComplete;
      expect(isDirty()).toBe(true);
    });

    it('clears dirty when the scripts are put back', async () => {
      const el = await mount();
      await settle(el);
      const original = { ...(modeFields(el) as any).scripts };
      editorEvent(el, 'scripts-change', { scripts: { ...original, computeWithForm: true } });
      await el.updateComplete;
      expect(isDirty()).toBe(true);

      editorEvent(el, 'scripts-change', { scripts: original });
      await el.updateComplete;
      expect(isDirty()).toBe(false);
    });

    it('marks dirty when a required field is added, and clean when it is removed', async () => {
      const el = await mount();
      await settle(el);
      editorEvent(el, 'required-change', { required: ['Field1', 'NewField'] });
      await el.updateComplete;
      expect(isDirty()).toBe(true);

      editorEvent(el, 'required-change', { required: ['Field1'] });
      await el.updateComplete;
      expect(isDirty()).toBe(false);
    });

    it('marks dirty when validation rules change, and clean when they revert', async () => {
      const el = await mount();
      await settle(el);
      editorEvent(el, 'validation-rules-change', {
        rules: [{ formula: '@True', formulaType: 'domino', message: 'no' }],
      });
      await el.updateComplete;
      expect(isDirty()).toBe(true);

      editorEvent(el, 'validation-rules-change', { rules: [] });
      await el.updateComplete;
      expect(isDirty()).toBe(false);
    });

    it('ignores an edit that lands while the element is still settling', async () => {
      // The pause is what stops the seeding cascade being read as a user edit; without it
      // every mount would mark the screen dirty.
      const el = await mount();
      editorEvent(el, 'required-change', { required: ['Field1', 'NewField'] });
      await el.updateComplete;
      expect(isDirty()).toBe(false);
    });

    it('marks dirty when the field list itself changes', async () => {
      const el = await mount();
      await settle(el);
      el.state = { ReadAccess: [] };
      await el.updateComplete;
      expect(isDirty()).toBe(true);
    });
  });

  describe('the unsaved-changes gate', () => {
    const twoModes = [mode('default'), mode('readOnly')];

    /** Switch to `name` through the picker, the way `wa-dropdown` reports a selection. */
    const pick = async (el: AccessTabs, name: string) => {
      el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
        new CustomEvent('wa-select', {
          detail: { item: { value: name } },
          bubbles: true,
          composed: true,
        }),
      );
      await el.updateComplete;
    };

    const makeDirty = async (el: AccessTabs) => {
      await settle(el);
      editorEvent(el, 'required-change', { required: ['Field1', 'NewField'] });
      await el.updateComplete;
      expect(isDirty()).toBe(true);
    };

    it('switches straight away when the screen is clean', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', (event) => {
        seen.push((event as CustomEvent<{ index: number }>).detail.index);
      });
      await settle(el);
      await pick(el, 'readOnly');
      expect(seen).toEqual([1]);
      expect(unsavedDialog(el).open).toBe(false);
    });

    it('reseeds the field map and resets the field selection on a switch', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const pageIndex: number[] = [];
      const fieldIndex: number[] = [];
      el.addEventListener('page-index-change', (event) => {
        pageIndex.push((event as CustomEvent<{ index: number }>).detail.index);
      });
      el.addEventListener('field-index-change', (event) => {
        fieldIndex.push((event as CustomEvent<{ fieldIndex: number }>).detail.fieldIndex);
      });
      await settle(el);
      await pick(el, 'readOnly');
      expect(pageIndex).toEqual([1]);
      expect(fieldIndex).toEqual([0]);
    });

    it('does nothing when the mode already on screen is picked again', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', () => seen.push(1));
      await makeDirty(el);
      await pick(el, 'default');
      expect(seen).toHaveLength(0);
      expect(unsavedDialog(el).open).toBe(false);
    });

    it('holds a mode switch behind the dialog when there is unsaved work', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', () => seen.push(1));
      await makeDirty(el);
      await pick(el, 'readOnly');
      expect(unsavedDialog(el).open).toBe(true);
      expect(seen).toHaveLength(0);
    });

    it('holds Clone Mode behind the dialog', async () => {
      const el = await mount();
      await makeDirty(el);
      buttonNamed(el, 'Clone Mode').click();
      await el.updateComplete;
      expect(unsavedDialog(el).open).toBe(true);
      expect(addModeDialog(el).open).toBe(false);
    });

    it('holds Add Mode behind the dialog', async () => {
      const el = await mount();
      await makeDirty(el);
      buttonNamed(el, 'Add Mode').click();
      await el.updateComplete;
      expect(unsavedDialog(el).open).toBe(true);
      expect(addModeDialog(el).open).toBe(false);
    });

    it('Cancel closes the dialog and stays on the current mode', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', () => seen.push(1));
      await makeDirty(el);
      await pick(el, 'readOnly');

      unsavedDialog(el).dispatchEvent(
        new CustomEvent('dialog-cancel', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(unsavedDialog(el).open).toBe(false);
      expect(seen).toHaveLength(0);
      expect(isDirty()).toBe(true);
    });

    it('Discard closes the dialog, clears dirty and performs the switch', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', (event) => {
        seen.push((event as CustomEvent<{ index: number }>).detail.index);
      });
      await makeDirty(el);
      await pick(el, 'readOnly');

      unsavedDialog(el).dispatchEvent(
        new CustomEvent('dialog-discard', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(unsavedDialog(el).open).toBe(false);
      expect(isDirty()).toBe(false);
      expect(seen).toEqual([1]);
    });

    it('Discard puts the edited settings back to what the mode holds', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      await makeDirty(el);
      await pick(el, 'readOnly');
      unsavedDialog(el).dispatchEvent(
        new CustomEvent('dialog-discard', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect((modeFields(el) as any).required).toEqual(['Field1']);
    });

    it('Save writes the mode, then switches once the renders have landed', async () => {
      const el = await mount({ modes: twoModes } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', (event) => {
        seen.push((event as CustomEvent<{ index: number }>).detail.index);
      });
      await makeDirty(el);
      await pick(el, 'readOnly');

      unsavedDialog(el).dispatchEvent(
        new CustomEvent('dialog-save', { bubbles: true, composed: true }),
      );
      await vi.advanceTimersByTimeAsync(400);
      await el.updateComplete;

      expect(calls.updateFormMode).toHaveLength(1);
      expect(unsavedDialog(el).open).toBe(false);
      expect(isDirty()).toBe(false);
      // 0 from the save restoring the picker, then 1 for the deferred switch.
      expect(seen).toEqual([0, 1]);
    });

    it('Save hands an add or clone up, so it survives the save spinner', async () => {
      const el = await mount();
      const stashed: Array<'add' | 'clone' | null> = [];
      el.addEventListener('post-save-action', (event) => {
        stashed.push((event as CustomEvent<{ action: 'add' | 'clone' | null }>).detail.action);
      });
      await makeDirty(el);
      buttonNamed(el, 'Add Mode').click();
      await el.updateComplete;

      unsavedDialog(el).dispatchEvent(
        new CustomEvent('dialog-save', { bubbles: true, composed: true }),
      );
      await vi.advanceTimersByTimeAsync(400);
      expect(stashed).toEqual(['add']);
    });
  });

  describe('the post-save intent', () => {
    it('opens the add-mode dialog on the next mount and clears the stash', async () => {
      const el = await mount({ postSaveAction: 'clone' } as Partial<AccessTabs>);
      const cleared: Array<'add' | 'clone' | null> = [];
      el.addEventListener('post-save-action', (event) => {
        cleared.push((event as CustomEvent<{ action: 'add' | 'clone' | null }>).detail.action);
      });
      // The clearing emit is raised in firstUpdated, before any listener could be attached;
      // what is observable here is the dialog it opens.
      await vi.advanceTimersByTimeAsync(400);
      await el.updateComplete;
      expect(addModeDialog(el).open).toBe(true);
      expect(addModeDialog(el).clone).toBe(true);
    });

    it('opens nothing when nothing was stashed', async () => {
      const el = await mount();
      await vi.advanceTimersByTimeAsync(400);
      await el.updateComplete;
      expect(addModeDialog(el).open).toBe(false);
    });
  });

  describe('adding a mode', () => {
    const typeName = async (el: AccessTabs, value: string) => {
      addModeDialog(el).dispatchEvent(
        new CustomEvent('mode-name-change', { detail: value, bubbles: true, composed: true }),
      );
      await el.updateComplete;
    };

    const save = async (el: AccessTabs) => {
      addModeDialog(el).dispatchEvent(
        new CustomEvent('dialog-save', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
    };

    it('refuses an empty name', async () => {
      const el = await mount();
      await typeName(el, '   ');
      await save(el);
      expect(addModeDialog(el).formError).toBe('Mode Name is Required.');
      expect(calls.updateFormMode).toHaveLength(0);
    });

    it('refuses a name with punctuation in it', async () => {
      const el = await mount();
      await typeName(el, 'no-dashes!');
      await save(el);
      expect(addModeDialog(el).formError).toContain('digits, letters, underscores');
      expect(calls.updateFormMode).toHaveLength(0);
    });

    it('refuses a name the form already has', async () => {
      const el = await mount({ modes: [mode('default'), mode('draft')] } as Partial<AccessTabs>);
      await typeName(el, 'draft');
      await save(el);
      expect(addModeDialog(el).formError).toBe('Mode Already Exist.');
      expect(calls.updateFormMode).toHaveLength(0);
    });

    it('writes a blank mode and closes', async () => {
      const el = await mount();
      buttonNamed(el, 'Add Mode').click();
      await el.updateComplete;
      await typeName(el, 'draft');
      await save(el);
      expect(calls.updateFormMode).toHaveLength(1);
      expect(calls.updateFormMode[0][3]).toMatchObject({ modeName: 'draft', fields: [] });
      expect(addModeDialog(el).open).toBe(false);
    });

    it('writes a copy of the current mode when cloning', async () => {
      const el = await mount();
      buttonNamed(el, 'Clone Mode').click();
      await el.updateComplete;
      expect(addModeDialog(el).clone).toBe(true);
      await typeName(el, 'copy');
      await save(el);
      expect(calls.updateFormMode[0][3]).toMatchObject({
        modeName: 'copy',
        onLoad: { formulaType: 'domino', formula: 'LOAD' },
      });
      expect(calls.updateFormMode[0][5]).toBe(true);
    });

    it('clears the message as soon as the name is edited again', async () => {
      const el = await mount();
      await typeName(el, '');
      await save(el);
      expect(addModeDialog(el).formError).toBe('Mode Name is Required.');
      await typeName(el, 'd');
      expect(addModeDialog(el).formError).toBe('');
    });
  });

  describe('deleting a mode', () => {
    it('offers Delete Mode only for a mode other than default', async () => {
      const onDefault = await mount();
      expect(buttonNamed(onDefault, 'Delete Mode')).toBeUndefined();

      const onDraft = await mount({
        modes: [mode('default'), mode('draft')],
        currentModeIndex: 1,
      } as Partial<AccessTabs>);
      expect(buttonNamed(onDraft, 'Delete Mode')).toBeTruthy();
    });

    it('opens the confirmation rather than deleting straight away', async () => {
      const el = await mount({
        modes: [mode('default'), mode('draft')],
        currentModeIndex: 1,
      } as Partial<AccessTabs>);
      buttonNamed(el, 'Delete Mode').click();
      await el.updateComplete;
      expect(store.getState().apps.deleteDialogOpen).toBe(true);
      expect(calls.deleteFormMode).toHaveLength(0);
    });

    it('deletes and returns to the first mode once confirmed', async () => {
      const el = await mount({
        modes: [mode('default'), mode('draft')],
        currentModeIndex: 1,
      } as Partial<AccessTabs>);
      const seen: number[] = [];
      el.addEventListener('mode-index-change', (event) => {
        seen.push((event as CustomEvent<{ index: number }>).detail.index);
      });
      el.shadowRoot!.querySelector('keep-confirm-delete-dialog')!.dispatchEvent(
        new CustomEvent('confirm-delete', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(calls.deleteFormMode[0][2]).toBe('draft');
      expect(seen).toEqual([0]);
    });
  });

  describe('saving', () => {
    it('writes the mode being edited', async () => {
      const el = await mount();
      buttonNamed(el, 'Save').click();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls.updateFormMode).toHaveLength(1);
      expect(calls.updateFormMode[0][3]).toMatchObject({
        modeName: 'default',
        strictInput: true,
        required: ['Field1'],
      });
      // The decoration the field list adds is stripped before the mode is sent.
      expect(calls.updateFormMode[0][3].fields[0]).not.toHaveProperty('id');
      expect(calls.updateFormMode[0][3].fields[0]).not.toHaveProperty('content');
    });

    it('does nothing for a schema that does not carry this form', async () => {
      const el = await mount({ formName: 'Missing' } as Partial<AccessTabs>);
      buttonNamed(el, 'Save').click();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls.updateFormMode).toHaveLength(0);
    });

    it('refuses to write a brand-new form that has no fields', async () => {
      store.dispatch(addForm({ enabled: true }));
      const el = await mount({ state: { ReadAccess: [] } } as Partial<AccessTabs>);
      buttonNamed(el, 'Save').click();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls.updateFormMode).toHaveLength(0);
      expect(calls.updateSchema).toHaveLength(0);
    });

    it('writes a brand-new form as a whole schema and leaves the page', async () => {
      store.dispatch(addForm({ enabled: true, form: { formName: 'Invoice' } }));
      // Installed rather than passed as a property: the element carries its own
      // `RouterController` over the module singleton since #926.
      const router = setRouterForTest(
        new Router({ history: memoryHistory(['/schema/a/b/Invoice/access']) }),
      );
      const el = await mount();
      buttonNamed(el, 'Save').click();
      await vi.advanceTimersByTimeAsync(0);

      expect(calls.updateSchema).toHaveLength(1);
      const written = calls.updateSchema[0][0];
      expect(written.forms.at(-1)).toMatchObject({ formName: 'Invoice' });
      expect(written.forms.at(-1).formModes[0].fields[0]).toMatchObject({
        name: 'Field1',
        externalName: 'Field1',
        itemFlags: ['SUMMARY'],
      });
      expect(router.location().pathname).toBe(`/schema/${NSF_PATH}/${SCHEMA_NAME}`);
    });

    it('reports the schema the server hands back', async () => {
      const el = await mount();
      const seen: unknown[] = [];
      el.addEventListener('schema-data-change', (event) => {
        seen.push((event as CustomEvent<{ schemaData: unknown }>).detail.schemaData);
      });
      buttonNamed(el, 'Save').click();
      await vi.advanceTimersByTimeAsync(0);
      // The thunk is handed the callback as its last argument; the element turns it into
      // the event above.
      calls.updateFormMode[0][6]({ schemaName: 'after-save' });
      expect(seen).toEqual([{ schemaName: 'after-save' }]);
    });

    it('registers its save with the navigation guard while it is on screen', async () => {
      const el = await mount();
      await runSaveFunction();
      expect(calls.updateFormMode).toHaveLength(1);

      el.remove();
      calls.updateFormMode.length = 0;
      await runSaveFunction();
      expect(calls.updateFormMode).toHaveLength(0);
    });
  });

  describe('the Test Formulas drawer', () => {
    const giveScope = () =>
      store.dispatch(
        fetchKeepScopes([
          { apiName: 'alpha-scope', schemaName: SCHEMA_NAME, nsfPath: NSF_PATH } as any,
        ]),
      );

    it('refuses to open for a schema with no scope, and says why', async () => {
      const el = await mount();
      editorEvent(el, 'test-formulas', undefined);
      await el.updateComplete;
      expect(drawer(el).open).toBe(false);
      expect(store.getState().alert.message).toContain('configured with scopes');
    });

    it('opens the drawer carrying the mode formulas', async () => {
      giveScope();
      const el = await mount();
      editorEvent(el, 'test-formulas', undefined);
      await el.updateComplete;
      expect(drawer(el).open).toBe(true);
      expect(testForm(el).readFormulaText).toBe('@True');
      expect(testForm(el).deleteFormulaText).toBe('@False');
      expect(testForm(el).loadFormulaText).toBe('LOAD');
      expect(testForm(el).saveFormulaText).toBe('SAVE');
      expect(testForm(el).nsfPath).toBe(NSF_PATH);
      expect(testForm(el).schemaName).toBe(SCHEMA_NAME);
    });

    it('sends an empty string for a formula the mode does not carry', async () => {
      giveScope();
      const el = await mount({
        modes: [mode('default', { onSave: undefined })],
      } as Partial<AccessTabs>);
      editorEvent(el, 'test-formulas', undefined);
      await el.updateComplete;
      expect(testForm(el).saveFormulaText).toBe('');
    });
  });

  describe('a form that does not exist on the server yet', () => {
    it('disables Clone Mode and Add Mode', async () => {
      store.dispatch(addForm({ enabled: true }));
      const el = await mount();
      expect(buttonNamed(el, 'Clone Mode').disabled).toBe(true);
      expect(buttonNamed(el, 'Add Mode').disabled).toBe(true);
    });

    it('greys the Save glyph until the mode has a field', async () => {
      store.dispatch(addForm({ enabled: true }));
      const el = await mount({ state: { ReadAccess: [] } } as Partial<AccessTabs>);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.save-icon-disabled')).toBeTruthy();

      el.state = fieldState();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.save-icon-enabled')).toBeTruthy();
    });
  });
});
