/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, headerLabels } from '../../test-utils/tables';
import FormsTable from '../../../src/components/forms/FormsTable';
import { addForm, handleDatabaseForms } from '../../../src/store/databases/action';

const navigate = vi.fn();
vi.mock('../../../src/router/react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));

vi.mock('../../../src/store/databases/action', () => ({
  addForm: vi.fn(() => ({ type: 'ADD_FORM' })),
  handleDatabaseForms: vi.fn(() => ({ type: 'HANDLE_DATABASE_FORMS' })),
}));

// The per-row menu is `keep-activate-menu` now (#806). Its own behaviour is covered by
// test/components/keep-elements/keep-activate-menu.test.ts; stubbing the wrapper keeps this
// file about the table. Mocking the wrapper module rather than the barrel leaves
// KeepDataTable, KeepTooltip and KeepButton real, which this file asserts through.
// The stub still fires `onActivateForm`, because that prop *is* the render-site change: the
// old component took a `toggleActivate` callback and called it with a form name it already
// had, the element emits an event and the table reads `detail.formName` off it. A stub that
// rendered nothing would leave that read untested, and getting it wrong is silent.
vi.mock('../../../src/components/keep-elements/react/KeepActivateMenu', () => ({
  KeepActivateMenu: ({ form, onActivateForm }: any) => (
    <button
      data-testid="activate-menu"
      onClick={() =>
        onActivateForm(new CustomEvent('activate-form', { detail: { formName: form.formName } }))
      }
    />
  ),
}));

// Contact carries *two* modes on purpose. With one, `getByText('1')` cannot tell
// `formModes.length` apart from a hardcoded 1 — the same vacuous-fixture trap the Task 4
// review caught in the alias column, where a one-element array could not distinguish
// "renders the first" from "renders all".
//
// `dbName` must be on each form too: `toggleConfigure` (invoked when the activate dialog
// is confirmed) looks up the clicked form via
// `forms.findIndex((f) => f.formName === formName && f.dbName === dbName)` — a fixture
// without it makes that lookup return -1 and the component throws reading `.alias` of
// undefined. Real callers (see TabForms.tsx) always stamp `dbName` onto every form.
const forms = [
  {
    formName: 'Contact',
    alias: 'ct',
    dbName: 'testdb',
    formModes: [{ modeName: 'default' }, { modeName: 'edit' }],
  },
  { formName: 'Invoice', alias: '', dbName: 'testdb', formModes: [] },
];

// A pre-existing form in `schemaData.forms`, so the confirm-activation test below can
// tell "appended to the existing forms" apart from "replaced the forms array wholesale"
// — both would look identical if `schemaData.forms` started empty.
const existingForm = { formName: 'Legacy', alias: 'lg', dbName: 'testdb', formModes: [{ modeName: 'default' }] };
const schemaData = { forms: [existingForm] } as any;

// Exactly what `toggleConfigure` (FormsTable.tsx) builds for a newly activated form. Shared
// by the two paths that reach it — the activate dialog and the row menu — so both pin the
// whole payload: a lookup bug that activates the wrong form, or one that drops or corrupts
// `alias`/`formModes`, fails here where a bare `toHaveBeenCalled()` catches neither.
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

function renderFormsTable(list = forms, formList = ['Contact', 'Invoice']) {
  const setSchemaData = vi.fn();
  renderWithProviders(
    <FormsTable
      forms={list}
      dbName="testdb"
      nsfPath="test.nsf"
      schemaData={schemaData}
      setSchemaData={setSchemaData}
      formList={formList}
    />,
  );
  return { setSchemaData };
}

describe('FormsTable — structure', () => {
  it('labels the columns', () => {
    renderFormsTable();
    expect(headerLabels()).toEqual(['', 'Form Name', 'Form Aliases', 'Modes Available', 'Status']);
  });

  it('renders one row per form', () => {
    renderFormsTable();
    expect(bodyRows()).toHaveLength(2);
  });

  it('shows the form name, alias and mode count', () => {
    renderFormsTable();
    const row = within(bodyRows()[0]);
    expect(row.getByText('Contact')).toBeInTheDocument();
    expect(row.getByText('ct')).toBeInTheDocument();
    expect(row.getByText('2')).toBeInTheDocument();
  });

  it('counts each form’s own modes', () => {
    renderFormsTable();
    expect(within(bodyRows()[1]).getByText('0')).toBeInTheDocument();
  });

  it('renders the activate menu per row', () => {
    renderFormsTable();
    expect(screen.getAllByTestId('activate-menu')).toHaveLength(2);
  });
});

describe('FormsTable — custom forms', () => {
  it('marks a form that is not in the database form list', () => {
    renderFormsTable(forms, ['Contact']);
    expect(within(bodyRows()[1]).getByText('custom form')).toBeInTheDocument();
    expect(within(bodyRows()[0]).queryByText('custom form')).not.toBeInTheDocument();
  });

  it('marks nothing when every form is known', () => {
    renderFormsTable();
    expect(screen.queryByText('custom form')).not.toBeInTheDocument();
  });
});

describe('FormsTable — opening a form', () => {
  it('navigates straight to a configured form', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Contact'));
    expect(addForm).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/schema/test.nsf/testdb/Contact/access');
  });

  it('offers to activate an unconfigured form instead of navigating', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    expect(navigate).not.toHaveBeenCalled();
    // jsdom has no modal top layer; setupTests stubs showModal, so assert on the stub.
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('activates the form when the offer is confirmed', () => {
    const { setSchemaData } = renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('OK'));

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
  });

  it('leaves the form alone when the offer is cancelled', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleDatabaseForms).not.toHaveBeenCalled();
  });
});

describe('FormsTable — the row menu', () => {
  it('activates the form the menu names, and stays on the page', () => {
    const { setSchemaData } = renderFormsTable();
    // The second row, so a handler that ignored `detail.formName` and activated the first
    // form it could find would fail here.
    fireEvent.click(screen.getAllByTestId('activate-menu')[1]);

    // Five arguments, not six: the missing navigate callback is what tells "activate and
    // open the form" apart from "activate it in place", and this is the in-place path.
    expect(handleDatabaseForms).toHaveBeenCalledWith(
      schemaData,
      'testdb',
      [existingForm, activatedForm('Invoice', '')],
      setSchemaData,
      'Invoice activated successfully.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
