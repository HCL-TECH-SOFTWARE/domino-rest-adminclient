/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-forms-table';
import type FormsTable from '../../../src/components/keep-elements/keep-forms-table';
import type {
  KeepFormOpenDetail,
  KeepFormsTableRow,
} from '../../../src/components/keep-elements/keep-forms-table';
import FormsTableClass from '../../../src/components/keep-elements/keep-forms-table';

/**
 * The two thunks the element dispatches are stubbed: the real `handleDatabaseForms` posts
 * the whole schema back to the API. `importOriginal` rather than a bare factory, so nothing
 * else the element or the store reaches for in that barrel is silently blanked out — the
 * nested `keep-activate-menu` imports `deleteForm` from the same module.
 */
const { addForm, handleDatabaseForms } = vi.hoisted(() => ({
  addForm: vi.fn(() => ({ type: 'TEST_ADD_FORM' })),
  // The rest parameter is load-bearing for types, not for behaviour: a zero-arg `vi.fn`
  // gives `mock.calls[0]` the tuple type `[]`, so reading the success callback off index 5
  // is a compile error rather than a runtime one.
  handleDatabaseForms: vi.fn((..._args: unknown[]) => ({ type: 'TEST_HANDLE_DATABASE_FORMS' })),
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  addForm,
  handleDatabaseForms,
}));

const TAG = 'keep-forms-table';

/**
 * Contact carries *two* modes on purpose. With one, reading `'1'` out of the cell cannot
 * tell `formModes.length` apart from a hardcoded 1 — the same vacuous-fixture trap the
 * alias column had, where a one-element array could not distinguish "renders the first"
 * from "renders all".
 *
 * `dbName` is on each row too: the activation lookup matches
 * `form.formName === formName && form.dbName === dbName`, so a fixture without it makes
 * that lookup miss and nothing is dispatched. Real callers (`TabForms`) always stamp it.
 */
const forms: KeepFormsTableRow[] = [
  {
    formName: 'Contact',
    alias: 'ct',
    dbName: 'testdb',
    formModes: [{ modeName: 'default' }, { modeName: 'edit' }],
  },
  { formName: 'Invoice', alias: '', dbName: 'testdb', formModes: [] },
];

/**
 * A pre-existing form in `schemaData.forms`, so the confirm-activation test below can tell
 * "appended to the existing forms" apart from "replaced the forms array wholesale" — both
 * would look identical if `schemaData.forms` started empty.
 */
const existingForm = {
  formName: 'Legacy',
  alias: 'lg',
  dbName: 'testdb',
  formModes: [{ modeName: 'default' }],
};
const schemaData = { forms: [existingForm] } as never;

const setSchemaData = vi.fn();

/**
 * Exactly what the element builds for a newly activated form. Shared by the two paths that
 * reach it — the activate dialog and the row menu — so both pin the whole payload: a lookup
 * bug that activates the wrong form, or one that drops or corrupts `alias`/`formModes`,
 * fails here where a bare `toHaveBeenCalled()` catches neither.
 */
const activatedForm = (formName: string, alias: string) => ({
  formValue: formName,
  formName,
  alias,
  formModes: [
    {
      modeName: 'default',
      fields: [],
      readAccessFormula: { formulaType: 'domino', formula: '@True' },
      writeAccessFormula: { formulaType: 'domino', formula: '@True' },
      deleteAccessFormula: { formulaType: 'domino', formula: '@False' },
      computeWithForm: false,
    },
  ],
});

const mount = (list = forms, formList = ['Contact', 'Invoice']) =>
  mountLit<FormsTable>(TAG, {
    forms: list,
    dbName: 'testdb',
    formList,
    schemaData,
    setSchemaData,
  });

/** Everything lives in the shadow root now, so every read starts there. */
const headerLabels = (el: FormsTable) =>
  Array.from(el.shadowRoot!.querySelectorAll('thead th, thead td')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

const bodyRows = (el: FormsTable) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr'));

const cellTexts = (row: HTMLTableRowElement) =>
  Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? '');

const menus = (el: FormsTable) => Array.from(el.shadowRoot!.querySelectorAll('keep-activate-menu'));

const editButton = (el: FormsTable, formName: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`.edit-button[title="${formName}"]`)!;

const dialogOf = (el: FormsTable) => el.shadowRoot!.querySelector('dialog')!;

const dialogButton = (el: FormsTable, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLElement;

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

/** Record every `form-open` the element emits, in order. */
const listenForOpens = (el: FormsTable) => {
  const opened: KeepFormOpenDetail[] = [];
  el.addEventListener('form-open', (event) =>
    opened.push((event as CustomEvent<KeepFormOpenDetail>).detail),
  );
  return opened;
};

/** The whole `static styles` group as text, for the rules the suite cannot compute. */
const styleText = (FormsTableClass as unknown as { styles: Array<{ cssText: string }> }).styles
  .map((sheet) => sheet.cssText)
  .join('\n');

describe('keep-forms-table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('structure', () => {
    it('labels the columns', async () => {
      const el = await mount();
      expect(headerLabels(el)).toEqual([
        '',
        'Form Name',
        'Form Aliases',
        'Modes Available',
        'Status',
      ]);
    });

    it('renders one row per form', async () => {
      const el = await mount();
      expect(bodyRows(el)).toHaveLength(2);
    });

    it('renders no body rows when there are no forms', async () => {
      const el = await mount([]);
      expect(bodyRows(el)).toHaveLength(0);
    });

    it('shows the form name, alias and mode count', async () => {
      const el = await mount();
      const cells = cellTexts(bodyRows(el)[0]);
      expect(cells[1]).toContain('Contact');
      expect(cells[2]).toBe('ct');
      expect(cells[3]).toBe('2');
    });

    it('counts each form’s own modes', async () => {
      const el = await mount();
      expect(cellTexts(bodyRows(el)[1])[3]).toBe('0');
    });

    it('renders the activate menu per row, handing it the row’s own form', async () => {
      const el = await mount();
      const rendered = menus(el);
      expect(rendered).toHaveLength(2);
      expect(rendered.map((menu) => menu.form)).toEqual(forms);
      // The menu dispatches the deactivate/delete thunk itself, so it needs both.
      expect(rendered.every((menu) => menu.schemaData === schemaData)).toBe(true);
      expect(rendered.every((menu) => menu.setSchemaData === setSchemaData)).toBe(true);
    });

    it('adopts the slotted-table sheet, which a document sheet cannot reach in here', () => {
      // `keep-data-table` styles its slotted table from a document-level sheet. The table
      // is inside this element's shadow root, where that sheet does not apply.
      expect(styleText).toContain('keep-data-table td');
      expect(styleText).toContain('keep-data-table thead th');
    });

    it('keeps the zebra striping the table had', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-data-table')!.hasAttribute('zebra')).toBe(true);
    });
  });

  describe('custom forms', () => {
    it('marks a form that is not in the database form list', async () => {
      const el = await mount(forms, ['Contact']);
      expect(cellTexts(bodyRows(el)[1])[1]).toContain('custom form');
      expect(cellTexts(bodyRows(el)[0])[1]).not.toContain('custom form');
    });

    it('marks nothing when every form is known', async () => {
      const el = await mount();
      expect(el.shadowRoot!.textContent).not.toContain('custom form');
    });

    it('still reserves the marker’s width on a known form, so the names line up', async () => {
      const el = await mount(forms, ['Contact']);
      const markers = Array.from(el.shadowRoot!.querySelectorAll('tbody .marker'));
      expect(markers.map((marker) => marker.classList.contains('marker-spacer'))).toEqual([
        true,
        false,
      ]);
      // Hidden, not removed — display:none would collapse the column's alignment.
      expect(styleText).toContain('visibility: hidden');
    });
  });

  describe('opening a form', () => {
    it('asks the parent to open a configured form', async () => {
      const el = await mount();
      const opened = listenForOpens(el);

      editButton(el, 'Contact').click();
      await el.updateComplete;

      expect(addForm).toHaveBeenCalledWith(false);
      expect(opened).toEqual([{ formName: 'Contact' }]);
      expect(showModal()).not.toHaveBeenCalled();
    });

    it('bubbles form-open out of the shadow root, so the React host can hear it', async () => {
      const el = await mount();
      const seen: string[] = [];
      document.addEventListener('form-open', () => seen.push('form-open'));

      editButton(el, 'Contact').click();

      expect(seen).toEqual(['form-open']);
    });

    it('offers to activate an unconfigured form instead of opening it', async () => {
      const el = await mount();
      const opened = listenForOpens(el);

      editButton(el, 'Invoice').click();
      await el.updateComplete;

      expect(opened).toEqual([]);
      expect(addForm).not.toHaveBeenCalled();
      // jsdom has no modal top layer; setupTests stubs showModal, so assert on the stub.
      expect(showModal()).toHaveBeenCalledTimes(1);
      expect(el.pendingActivation).toBe('Invoice');
    });

    it('stays shut until an edit control asks for it', async () => {
      await mount();
      expect(showModal()).not.toHaveBeenCalled();
    });

    it('does not reopen a dialog that is already open', async () => {
      const el = await mount();
      editButton(el, 'Invoice').click();
      await el.updateComplete;
      // jsdom's showModal() is a stub that leaves `open` alone. Setting it is what makes
      // the next render see an already-open dialog — showModal() on one throws
      // InvalidStateError in a browser.
      dialogOf(el).open = true;
      el.requestUpdate();
      await el.updateComplete;

      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('activates the form when the offer is confirmed, and opens it once saved', async () => {
      const el = await mount();
      const opened = listenForOpens(el);
      editButton(el, 'Invoice').click();
      await el.updateComplete;
      // jsdom's showModal() is a stub that leaves `open` alone, so the element's own
      // "close it if it is open" branch would never run without this.
      dialogOf(el).open = true;

      dialogButton(el, 'OK').click();
      await el.updateComplete;

      // The array pins that the new form is *appended* to schemaData.forms rather than
      // replacing them, which an empty starting array could not distinguish.
      expect(handleDatabaseForms).toHaveBeenCalledWith(
        schemaData,
        'testdb',
        [existingForm, activatedForm('Invoice', '')],
        setSchemaData,
        'Invoice activated successfully.',
        expect.any(Function),
      );
      expect(el.pendingActivation).toBeNull();
      expect(close()).toHaveBeenCalled();

      // Nothing is opened until the save reports success; the callback is what does it.
      expect(opened).toEqual([]);
      (handleDatabaseForms.mock.calls[0][5] as () => void)();
      expect(opened).toEqual([{ formName: 'Invoice' }]);
    });

    it('ignores a confirmation for an offer that is no longer showing', async () => {
      // The dialog is in the shadow tree whether or not it is open, so a stale click —
      // a double activation, or a confirm arriving after Escape — must not activate
      // whatever the last offer happened to be about.
      const el = await mount();
      editButton(el, 'Invoice').click();
      await el.updateComplete;
      el.pendingActivation = null;
      await el.updateComplete;

      dialogButton(el, 'OK').click();
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });

    it('leaves the form alone when the offer is cancelled', async () => {
      const el = await mount();
      editButton(el, 'Invoice').click();
      await el.updateComplete;
      dialogOf(el).open = true;

      dialogButton(el, 'Cancel').click();
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
      expect(el.pendingActivation).toBeNull();
      expect(close()).toHaveBeenCalled();
    });

    it('closes from the dialog’s close button', async () => {
      const el = await mount();
      editButton(el, 'Invoice').click();
      await el.updateComplete;

      el.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
      expect(el.pendingActivation).toBeNull();
    });

    it('closes on Escape, which the React version left desynced', async () => {
      const el = await mount();
      editButton(el, 'Invoice').click();
      await el.updateComplete;

      // The original had no cancel handler: the browser closed the dialog and the name it
      // was offering to activate stayed set, so the offer could not be made again.
      dialogOf(el).dispatchEvent(new Event('cancel'));
      await el.updateComplete;

      expect(el.pendingActivation).toBeNull();
    });
  });

  describe('the row menu', () => {
    /** What the nested element emits when its Activate item is chosen. */
    const chooseActivate = (menu: Element, formName: string) =>
      menu.dispatchEvent(
        new CustomEvent('activate-form', {
          detail: { formName },
          bubbles: true,
          composed: true,
        }),
      );

    it('activates the form the menu names, and stays on the page', async () => {
      const el = await mount();
      const opened = listenForOpens(el);

      // The second row, so a handler that ignored `detail.formName` and activated the
      // first form it could find would fail here.
      chooseActivate(menus(el)[1], 'Invoice');
      await el.updateComplete;

      // Five arguments, not six: the missing success callback is what tells "activate and
      // open the form" apart from "activate it in place", and this is the in-place path.
      expect(handleDatabaseForms).toHaveBeenCalledWith(
        schemaData,
        'testdb',
        [existingForm, activatedForm('Invoice', '')],
        setSchemaData,
        'Invoice activated successfully.',
      );
      expect(opened).toEqual([]);
    });

    it('does nothing for a form that is not in the list', async () => {
      // The lookup matches on name *and* schema. The original indexed straight into the
      // result and threw reading `.alias` of undefined, taking the screen down with it.
      const el = await mount();
      chooseActivate(menus(el)[0], 'Nonexistent');
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });

    it('does nothing for a form belonging to another schema', async () => {
      const el = await mountLit<FormsTable>(TAG, {
        forms: [{ formName: 'Invoice', alias: '', dbName: 'otherdb', formModes: [] }],
        dbName: 'testdb',
        formList: ['Invoice'],
        schemaData,
        setSchemaData,
      });
      chooseActivate(menus(el)[0], 'Invoice');
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });

    it('dispatches nothing when it has no schema to rewrite', async () => {
      const el = await mountLit<FormsTable>(TAG, {
        forms,
        dbName: 'testdb',
        formList: ['Contact', 'Invoice'],
        setSchemaData,
      });
      chooseActivate(menus(el)[0], 'Contact');
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });

    it('dispatches nothing when it has no schema sink to write through', async () => {
      const el = await mountLit<FormsTable>(TAG, {
        forms,
        dbName: 'testdb',
        formList: ['Contact', 'Invoice'],
        schemaData,
      });
      chooseActivate(menus(el)[0], 'Contact');
      await el.updateComplete;

      expect(handleDatabaseForms).not.toHaveBeenCalled();
    });
  });

  describe('accessibility (#713)', () => {
    it('names the edit control after what it does, not just the form', async () => {
      const el = await mount();
      const buttons = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.edit-button'));
      expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
        'Edit form Contact',
        'Edit form Invoice',
      ]);
      // Without type="button" a button inside a form defaults to submit.
      expect(buttons.map((button) => button.type)).toEqual(['button', 'button']);
      // The native tooltip the original showed on hover is kept.
      expect(buttons.map((button) => button.getAttribute('title'))).toEqual([
        'Contact',
        'Invoice',
      ]);
    });

    it('puts the edit control in the keyboard focus order', async () => {
      const el = await mount();
      const button = editButton(el, 'Invoice');
      button.focus();
      expect(el.shadowRoot!.activeElement).toBe(button);
    });

    it('makes the Status help reachable without a mouse', async () => {
      const el = await mount();
      const help = el.shadowRoot!.querySelector<HTMLButtonElement>('button.status-help')!;
      expect(help.type).toBe('button');
      // The same text the tooltip shows, so the explanation is not mouse-only.
      expect(help.getAttribute('aria-label')).toBe(
        el.shadowRoot!.querySelector('keep-tooltip')!.getAttribute('content'),
      );
      help.focus();
      expect(el.shadowRoot!.activeElement).toBe(help);
    });

    it('leaves the glyphs decorative, so no name is announced twice', async () => {
      const el = await mount();
      const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
      // Web Awesome renders an icon aria-hidden unless it is given a label of its own.
      expect(icons.length).toBeGreaterThan(0);
      expect(icons.every((icon) => !icon.hasAttribute('label'))).toBe(true);
      expect(
        Array.from(el.shadowRoot!.querySelectorAll('svg')).every(
          (svg) => svg.getAttribute('aria-hidden') === 'true',
        ),
      ).toBe(true);
    });

    it('marks the header cells as column headers and the edit cells as row headers', async () => {
      const el = await mount();
      expect(
        Array.from(el.shadowRoot!.querySelectorAll('thead th')).map((cell) =>
          cell.getAttribute('scope'),
        ),
      ).toEqual(['col', 'col', 'col', 'col', 'col']);
      expect(
        Array.from(el.shadowRoot!.querySelectorAll('tbody th')).map((cell) =>
          cell.getAttribute('scope'),
        ),
      ).toEqual(['row', 'row']);
    });

    it('names the table after what it holds', async () => {
      // It said "views and agents table", copied from the two tables beside it.
      const el = await mount();
      expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-label')).toBe('forms table');
    });

    it('names and describes the confirmation, and gives it a heading', async () => {
      const el = await mount();
      const dialog = dialogOf(el);
      expect(dialog.getAttribute('aria-label')).toBe('Activate Form?');
      const describedBy = dialog.getAttribute('aria-describedby')!;
      expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain(
        'Activate this form to edit it?',
      );
      expect(el.shadowRoot!.querySelector('h2.title')!.textContent).toBe('Activate Form?');
    });

    it('reads the confirmation’s buttons in the order they appear', async () => {
      // They were laid out reversed, so DOM order and reading order disagreed.
      const el = await mount();
      expect(
        [...el.shadowRoot!.querySelectorAll('.buttons keep-button')].map((button) =>
          button.textContent?.trim(),
        ),
      ).toEqual(['Cancel', 'OK']);
      expect(styleText).not.toContain('row-reverse');
    });
  });

  describe('theming', () => {
    it('restates the dialog chrome the global sheets can no longer reach', async () => {
      // A bare `dialog` selector in the global sheets painted the background, the text and
      // the backdrop. None of the three crosses into a shadow root.
      expect(styleText).toContain('var(--wa-color-surface-raised)');
      expect(styleText).toContain('dialog::backdrop');
    });

    it('uses a mode-aware token for the custom-form label', async () => {
      // It was a light-mode literal with no dark counterpart, so it was near-invisible
      // against the dark surface.
      expect(styleText).toContain('var(--wa-color-text-quiet)');
      expect(styleText).not.toContain('#475155');
    });
  });
});
