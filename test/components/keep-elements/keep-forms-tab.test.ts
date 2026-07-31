/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setCurrentForms, setPullDatabase } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import { setApiLoading } from '../../../src/store/dialog/reducer';
import { closeSnackbar } from '../../../src/store/alerts/reducer';
import '../../../src/components/keep-elements/keep-forms-tab';
import type FormsTab from '../../../src/components/keep-elements/keep-forms-tab';
import type {
  KeepFormsTabNavigateDetail,
  KeepFormsTabSchemaChangeDetail,
} from '../../../src/components/keep-elements/keep-forms-tab';
import FormsTabClass from '../../../src/components/keep-elements/keep-forms-tab';
import type FormsTableElement from '../../../src/components/keep-elements/keep-forms-table';

/**
 * The three thunks this element dispatches are stubbed: the real `handleDatabaseForms` and
 * `pullForms` post to the API. `importOriginal` rather than a bare factory, so nothing else
 * the element or the nested table reaches for in that barrel is silently blanked out — the
 * table and its row menu import `deleteForm` and `addForm` from the same module.
 */
const { addForm, handleDatabaseForms, pullForms } = vi.hoisted(() => ({
  addForm: vi.fn(() => ({ type: 'TEST_ADD_FORM' })),
  // The rest parameter is load-bearing for types, not for behaviour: a zero-arg `vi.fn`
  // gives `mock.calls[0]` the tuple type `[]`, so reading the success callback off index 5
  // is a compile error rather than a runtime one.
  handleDatabaseForms: vi.fn((..._args: unknown[]) => ({ type: 'TEST_HANDLE_DATABASE_FORMS' })),
  pullForms: vi.fn((..._args: unknown[]) => ({ type: 'TEST_PULL_FORMS' })),
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  addForm,
  handleDatabaseForms,
  pullForms,
}));

const TAG = 'keep-forms-tab';

/**
 * Contact carries two modes on purpose, so a count read out of the table cannot be confused
 * with a hardcoded 1. `Ledger` is the normalisation case: the API sends `formAccessModes`
 * for a schema that predates the rename, and this element is what maps it onto `formModes`.
 * `Elsewhere` belongs to another schema, so the per-schema narrowing has something to drop.
 */
const forms = [
  {
    dbName: 'testdb',
    formName: 'Contact',
    alias: ['ct'],
    formModes: [{ modeName: 'default' }, { modeName: 'edit' }],
    formAccessModes: [],
  },
  { dbName: 'testdb', formName: 'Invoice', alias: [], formModes: [], formAccessModes: [] },
  {
    dbName: 'testdb',
    formName: 'Ledger',
    alias: ['lg'],
    formAccessModes: [{ modeName: 'default' }],
  },
  { dbName: 'otherdb', formName: 'Elsewhere', alias: [], formModes: [], formAccessModes: [] },
];

/** A pre-existing entry, so "appended to" can be told apart from "replaced". */
const existingForm = { formName: 'Legacy', alias: ['lg'], formModes: [{ modeName: 'default' }] };
const schemaData = { forms: [existingForm] } as never;

const seed = (list: unknown[] = forms) => {
  store.dispatch(setCurrentForms({ db: 'testdb', forms: list as never[] }));
  store.dispatch(setPullDatabase(true));
};

const mount = async (props: Partial<FormsTab> = {}) => {
  const el = await mountLit<FormsTab>(TAG, {
    dbName: 'testdb',
    nsfPath: 'test.nsf',
    formList: ['Contact', 'Invoice', 'Ledger'],
    schemaData,
    ...props,
  });
  // The nested table's own first update is scheduled asynchronously, so its shadow root is
  // empty until it is awaited. Every assertion that reads a row depends on this.
  await table(el).updateComplete;
  return el;
};

const table = (el: FormsTab) =>
  el.shadowRoot!.querySelector('keep-forms-table') as FormsTableElement;

const rowNames = (el: FormsTab) =>
  Array.from(table(el).shadowRoot!.querySelectorAll('tbody .cell-name')).map((cell) =>
    cell.textContent?.trim(),
  );

const modeCounts = (el: FormsTab) =>
  Array.from(table(el).shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr')).map((row) =>
    row.querySelectorAll('td')[2].textContent?.trim(),
  );

const editButton = (el: FormsTab, formName: string) =>
  table(el).shadowRoot!.querySelector<HTMLButtonElement>(`.edit-button[title="${formName}"]`)!;

const bulkButton = (el: FormsTab, className: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button.${className}`)!;

const dialogOf = (el: FormsTab, className: string) =>
  el.shadowRoot!.querySelector<HTMLDialogElement>(`dialog.${className}`)!;

const dialogButton = (el: FormsTab, className: string, label: string) =>
  [...dialogOf(el, className).querySelectorAll('keep-button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLElement;

const nameField = (el: FormsTab) =>
  el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };

/** Record every path the element asks its host to navigate to, in order. */
const listenForNavigations = (el: FormsTab) => {
  const paths: string[] = [];
  el.addEventListener('form-navigate', (event) =>
    paths.push((event as CustomEvent<KeepFormsTabNavigateDetail>).detail.path),
  );
  return paths;
};

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

/** The whole `static styles` group as text, for the rules the suite cannot compute. */
const styleText = (FormsTabClass as unknown as { styles: Array<{ cssText: string }> }).styles
  .map((sheet) => sheet.cssText)
  .join('\n');

describe('keep-forms-tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.dispatch({ type: INIT_STATE });
    // The alert slice has no INIT_STATE case, so a message raised by one test would still
    // be visible in the next.
    store.dispatch(closeSnackbar());
    seed();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('the form list', () => {
    it('shows only the forms of this schema', async () => {
      const el = await mount();
      expect(rowNames(el)).toEqual(['Contact', 'Invoice', 'Ledger']);
    });

    it('normalises the older formAccessModes spelling onto formModes', async () => {
      // Without it the Modes Available column reads 0 for a schema that predates the rename.
      const el = await mount();
      expect(modeCounts(el)).toEqual(['2', '0', '1']);
    });

    it('renders nothing when the store has no forms', async () => {
      store.dispatch(setCurrentForms({ db: 'testdb', forms: [] }));
      const el = await mount();
      expect(rowNames(el)).toEqual([]);
    });

    it('narrows the list to what the search box matched, case-insensitively', async () => {
      const el = await mount();

      el.shadowRoot!.querySelector('keep-search-input')!.dispatchEvent(
        new CustomEvent('search-change', { detail: { value: 'IN' }, bubbles: true, composed: true }),
      );
      await el.updateComplete;
      await table(el).updateComplete;

      expect(rowNames(el)).toEqual(['Invoice']);
    });

    it('keeps the modes count right inside a search, which the React version did not', async () => {
      // `filtered` was built from the raw store list, so a searched row lost the
      // formAccessModes fallback and reported 0 modes.
      const el = await mount();
      el.searchKey = 'ledger';
      await el.updateComplete;
      await table(el).updateComplete;

      expect(modeCounts(el)).toEqual(['1']);
    });

    it('applies Show Active inside a search, which the React version also did not', async () => {
      const el = await mount();
      el.searchKey = 'o';
      await el.updateComplete;
      await table(el).updateComplete;
      expect(rowNames(el)).toEqual(['Contact', 'Invoice']);

      el.showActive = true;
      await el.updateComplete;
      await table(el).updateComplete;

      // Invoice still matches the letter, but it has no modes.
      expect(rowNames(el)).toEqual(['Contact']);
    });

    it('drops the forms with no modes when Show Active is turned on', async () => {
      const el = await mount();
      el.shadowRoot!.querySelector('keep-switch')!.onToggle!(new Event('change'));
      await el.updateComplete;
      await table(el).updateComplete;

      expect(el.showActive).toBe(true);
      // Ledger is absent on purpose. Show Active tests `formModes` on the raw store record,
      // *before* the formAccessModes fallback is applied, so a schema written with the older
      // spelling is hidden by the filter. Carried over rather than fixed — see the #806
      // wave 5 report; a fix belongs in its own issue with a decision behind it.
      expect(rowNames(el)).toEqual(['Contact']);
    });

    it('turns Show Active back off', async () => {
      const el = await mount();
      const toggle = el.shadowRoot!.querySelector('keep-switch')!;
      toggle.onToggle!(new Event('change'));
      await el.updateComplete;
      toggle.onToggle!(new Event('change'));
      await el.updateComplete;
      await table(el).updateComplete;

      expect(rowNames(el)).toEqual(['Contact', 'Invoice', 'Ledger']);
    });

    it('hands the table the schema and the database form list', async () => {
      const el = await mount();
      expect(table(el).dbName).toBe('testdb');
      expect(table(el).schemaData).toBe(schemaData);
      expect(table(el).formList).toEqual(['Contact', 'Invoice', 'Ledger']);
    });
  });

  describe('the search box', () => {
    it('is live once the schema list has been pulled', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-search-input')!.hasAttribute('disabled')).toBe(
        false,
      );
    });

    it('is inert while it is still being pulled', async () => {
      store.dispatch(setPullDatabase(false));
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-search-input')!.hasAttribute('disabled')).toBe(true);
    });

    it('names itself after what it filters', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-search-input')!.getAttribute('placeholder')).toBe(
        'Search Forms',
      );
    });
  });

  describe('opening a form', () => {
    it('navigates straight to a configured form', async () => {
      // Carried over from the React suite: the URL is pinned rather than merely "navigated",
      // because the spelling is the whole behaviour.
      const el = await mount();
      const paths = listenForNavigations(el);

      editButton(el, 'Contact').click();
      await el.updateComplete;

      expect(addForm).toHaveBeenCalledWith(false);
      expect(paths).toEqual(['/schema/test.nsf/testdb/Contact/access']);
    });

    it('navigates to a newly activated form only once the save succeeds', async () => {
      const el = await mount();
      const paths = listenForNavigations(el);

      // Invoice has no modes, so the table's edit control offers to activate it first.
      editButton(el, 'Invoice').click();
      await table(el).updateComplete;
      const ok = [...table(el).shadowRoot!.querySelectorAll('keep-button')].find(
        (button) => button.textContent?.trim() === 'OK',
      ) as HTMLElement;
      ok.click();
      await table(el).updateComplete;

      expect(paths).toEqual([]);

      // The sixth argument is the save thunk's success callback — the deferred navigation.
      (handleDatabaseForms.mock.calls[0][5] as () => void)();
      expect(paths).toEqual(['/schema/test.nsf/testdb/Invoice/access']);
    });

    it('stays on the page when a row is activated in place', async () => {
      const el = await mount();
      const paths = listenForNavigations(el);

      // What the row menu emits. The in-place path passes no success callback, so there is
      // nothing to navigate with.
      table(el).shadowRoot!.querySelector('keep-activate-menu')!.dispatchEvent(
        new CustomEvent('activate-form', {
          detail: { formName: 'Contact' },
          bubbles: true,
          composed: true,
        }),
      );
      await table(el).updateComplete;

      expect(handleDatabaseForms).toHaveBeenCalledTimes(1);
      expect(handleDatabaseForms.mock.calls[0]).toHaveLength(5);
      expect(paths).toEqual([]);
    });

    it('encodes the form name with the app’s own encoder', async () => {
      // fullEncode escapes parentheses; the standard encoder leaves them alone. Both
      // spellings are carried over exactly as the component this replaces had them.
      seed([
        { dbName: 'testdb', formName: 'Order(1)', alias: [], formModes: [{}], formAccessModes: [] },
      ]);
      const el = await mount({ formList: ['Order(1)'] });
      const paths = listenForNavigations(el);

      editButton(el, 'Order(1)').click();
      await el.updateComplete;

      expect(paths).toEqual(['/schema/test.nsf/testdb/Order%281%29/access']);
    });

    it('does not let the table’s own form-open escape alongside the path', async () => {
      // Both events bubble and compose. Without the handler stopping the inner one, a host
      // listening on this element would see two events with two different payloads.
      const el = await mount();
      const seen: string[] = [];
      document.addEventListener('form-open', () => seen.push('form-open'));

      editButton(el, 'Contact').click();
      await el.updateComplete;

      expect(seen).toEqual([]);
    });
  });

  describe('activating every form', () => {
    it('sends the whole store list, then re-pulls the design', async () => {
      const el = await mount();
      bulkButton(el, 'activate').click();

      expect(handleDatabaseForms).toHaveBeenCalledWith(
        schemaData,
        'testdb',
        // The raw list, not the filtered one — including the form of another schema, which
        // is how the component this replaces behaved.
        store.getState().databases.forms,
        expect.any(Function),
        'Successfully activated all forms.',
      );
      expect(pullForms).toHaveBeenCalledWith('test.nsf');
    });

    it('reports the saved schema upwards rather than taking a setter', async () => {
      const el = await mount();
      const changes: KeepFormsTabSchemaChangeDetail[] = [];
      el.addEventListener('schema-change', (event) =>
        changes.push((event as CustomEvent<KeepFormsTabSchemaChangeDetail>).detail),
      );

      bulkButton(el, 'activate').click();
      const saved = { forms: [] } as never;
      (handleDatabaseForms.mock.calls[0][3] as (data: unknown) => void)(saved);

      expect(changes).toEqual([{ schemaData: saved }]);
    });

    it('does nothing when there is no schema to rewrite', async () => {
      // The component this replaces posted `undefined` to the API instead.
      const el = await mount({ schemaData: undefined });
      bulkButton(el, 'activate').click();

      expect(handleDatabaseForms).not.toHaveBeenCalled();
      expect(pullForms).not.toHaveBeenCalled();
    });

    it('is unavailable when there is nothing to activate', async () => {
      store.dispatch(setCurrentForms({ db: 'testdb', forms: [] }));
      const el = await mount();
      expect(bulkButton(el, 'activate').disabled).toBe(true);
      expect(bulkButton(el, 'deactivate').disabled).toBe(true);
    });

    it('is unavailable while the API is busy', async () => {
      const el = await mount();
      expect(bulkButton(el, 'activate').disabled).toBe(false);

      store.dispatch(setApiLoading(true));
      await el.updateComplete;

      expect(bulkButton(el, 'activate').disabled).toBe(true);
      expect(bulkButton(el, 'deactivate').disabled).toBe(true);
    });
  });

  describe('deactivating every designer form', () => {
    it('asks first', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      expect(el.resetAllForms).toBe(true);
      expect(showModal()).toHaveBeenCalledTimes(1);
      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });

    it('keeps the custom forms and drops the designer ones', async () => {
      // The database knows Contact, Invoice and Ledger; Elsewhere is a custom form, so it
      // is the only entry that survives the reset.
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;
      dialogOf(el, 'warning-dialog').open = true;

      dialogButton(el, 'warning-dialog', 'Yes').click();
      await el.updateComplete;

      expect(handleDatabaseForms).toHaveBeenCalledWith(
        schemaData,
        'testdb',
        [forms[3]],
        expect.any(Function),
        'Successfully deactivated all designer forms.',
      );
      expect(pullForms).toHaveBeenCalledWith('test.nsf');
      expect(el.resetAllForms).toBe(false);
      expect(close()).toHaveBeenCalled();
    });

    it('leaves everything alone when the answer is No', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogButton(el, 'warning-dialog', 'No').click();
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
      expect(el.resetAllForms).toBe(false);
    });

    it('closes from the header’s close button', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogOf(el, 'warning-dialog')
        .querySelector('keep-form-dialog-header')!
        .dispatchEvent(new CustomEvent('header-close', { bubbles: true, composed: true }));
      await el.updateComplete;

      expect(el.resetAllForms).toBe(false);
    });

    it('closes on Escape, which the React version left desynced', async () => {
      // The original had no close handler here at all: the browser closed the dialog and
      // `resetAllForms` stayed set, so the confirmation could not be raised again.
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogOf(el, 'warning-dialog').dispatchEvent(new Event('cancel'));
      await el.updateComplete;

      expect(el.resetAllForms).toBe(false);
    });

    it('closes without dispatching when there is no schema to rewrite', async () => {
      const el = await mount({ schemaData: undefined });
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;
      dialogButton(el, 'warning-dialog', 'Yes').click();
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
      expect(el.resetAllForms).toBe(false);
    });
  });

  describe('creating a form schema', () => {
    const open = async (el: FormsTab) => {
      [...el.shadowRoot!.querySelectorAll('.top-nav keep-button')]
        .find((button) => button.textContent?.trim() === 'Add New Form Schema')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await el.updateComplete;
    };

    const type = async (el: FormsTab, value: string) => {
      const field = nameField(el);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await el.updateComplete;
    };

    it('opens the prompt', async () => {
      const el = await mount();
      await open(el);

      expect(el.createFormOpen).toBe(true);
      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('creates the form and opens its access screen', async () => {
      const el = await mount();
      const paths = listenForNavigations(el);
      await open(el);
      await type(el, 'Order(1)');

      dialogButton(el, 'create-dialog', 'Create').click();
      await el.updateComplete;

      const created = addForm.mock.calls[0] as unknown as [boolean, Record<string, unknown>];
      expect(created[0]).toBe(true);
      expect(created[1]).toMatchObject({
        alias: ['Order(1)'],
        dbName: 'testdb',
        formName: 'Order(1)',
        formValue: 'Order(1)',
      });
      // Two lists of one mode each, and not the same object twice.
      expect(created[1].formModes).toHaveLength(1);
      expect(created[1].formAccessModes).toHaveLength(1);
      expect((created[1].formModes as unknown[])[0]).not.toBe(
        (created[1].formAccessModes as unknown[])[0],
      );

      // The standard encoder here, unlike the table's path above — carried over unchanged.
      expect(paths).toEqual(['/schema/test.nsf/testdb/Order(1)/access']);
    });

    it('refuses an empty name and says so', async () => {
      const el = await mount();
      const paths = listenForNavigations(el);
      await open(el);

      dialogButton(el, 'create-dialog', 'Create').click();
      await el.updateComplete;

      expect(addForm).not.toHaveBeenCalled();
      expect(paths).toEqual([]);
      expect(store.getState().alert).toMatchObject({
        visible: true,
        message: 'Please enter a valid form schema name!',
      });
    });

    it('marks a name that is already taken', async () => {
      const el = await mount();
      await open(el);
      await type(el, 'Contact');

      expect(nameField(el).getAttribute('aria-invalid')).toBe('true');
      expect(nameField(el).getAttribute('hint')).toBe('The form name Contact already exists!');
    });

    it('clears the mark once the name is free', async () => {
      const el = await mount();
      await open(el);
      await type(el, 'Contact');
      await type(el, 'Contacts');

      expect(nameField(el).getAttribute('aria-invalid')).toBe('false');
      expect(nameField(el).getAttribute('hint')).toBe('');
    });

    it('cancels, resetting the pending new form', async () => {
      const el = await mount();
      await open(el);
      await type(el, 'Draft');

      dialogButton(el, 'create-dialog', 'Cancel').click();
      await el.updateComplete;

      expect(addForm).toHaveBeenCalledWith(false);
      expect(el.createFormOpen).toBe(false);
    });

    it('empties the field when the prompt is reopened', async () => {
      // It was only reset by Cancel, so dismissing with the close button and reopening
      // showed the previous attempt, error message and all.
      const el = await mount();
      await open(el);
      await type(el, 'Draft');

      dialogOf(el, 'create-dialog')
        .querySelector('keep-form-dialog-header')!
        .dispatchEvent(new CustomEvent('header-close', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.createFormOpen).toBe(false);

      await open(el);
      expect(el.formName).toBe('');
      expect(el.formNameErrorMessage).toBe('');
    });

    it('closes on Escape', async () => {
      const el = await mount();
      await open(el);

      dialogOf(el, 'create-dialog').dispatchEvent(new Event('cancel'));
      await el.updateComplete;

      expect(el.createFormOpen).toBe(false);
    });

    it('does not reopen a dialog that is already open', async () => {
      const el = await mount();
      await open(el);
      // jsdom's showModal() is a stub that leaves `open` alone. Setting it is what makes the
      // next render see an already-open dialog — showModal() on one throws in a browser.
      dialogOf(el, 'create-dialog').open = true;
      el.requestUpdate();
      await el.updateComplete;

      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('opens no dialog until something asks for one', async () => {
      await mount();
      expect(showModal()).not.toHaveBeenCalled();
    });
  });

  describe('accessibility (#713)', () => {
    it('labels the form-name field, which had only a placeholder', async () => {
      const el = await mount();
      expect(nameField(el).getAttribute('label')).toBe('Form Schema Name');
    });

    it('names both dialogs, and describes the destructive one', async () => {
      const el = await mount();
      expect(dialogOf(el, 'create-dialog').getAttribute('aria-label')).toBe('Add New Form Schema');

      const warning = dialogOf(el, 'warning-dialog');
      expect(warning.getAttribute('aria-label')).toBe('WARNING: Deactivate ALL forms?');
      const describedBy = warning.getAttribute('aria-describedby')!;
      expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain(
        'Do you wish to proceed?',
      );
    });

    it('writes the warning as a paragraph, not as a non-HTML element name', async () => {
      const el = await mount();
      expect(el.shadowRoot!.getElementById('reset-form-contents')!.tagName).toBe('P');
      expect(el.shadowRoot!.querySelector('text')).toBeNull();
    });

    it('gives the bulk controls a type and a focus ring', async () => {
      const el = await mount();
      expect([bulkButton(el, 'activate').type, bulkButton(el, 'deactivate').type]).toEqual([
        'button',
        'button',
      ]);
      bulkButton(el, 'activate').focus();
      expect(el.shadowRoot!.activeElement).toBe(bulkButton(el, 'activate'));
      expect(styleText).toContain('--wa-focus-ring');
    });
  });

  describe('theming', () => {
    it('restates the dialog chrome the global sheets can no longer reach', async () => {
      // Background, colour and backdrop all came from bare `dialog` selectors.
      expect(styleText).toContain('var(--wa-color-surface-raised)');
      expect(styleText).toContain('var(--wa-color-text-normal)');
      expect(styleText).toContain('dialog::backdrop');
    });

    it('restates the invalid-field paint the document sheet applies to every text field', () => {
      expect(styleText).toContain("wa-input[aria-invalid='true']::part(base)");
    });

    it('restates the box-sizing reset, which a universal selector cannot carry in', () => {
      expect(styleText).toContain('box-sizing: border-box');
      expect(styleText).not.toContain('box-sizing: inherit');
    });
  });
});
