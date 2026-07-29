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
  deleteForm: vi.fn(() => ({ type: 'DELETE_FORM' })),
}));

vi.mock('../../../src/components/forms/ActivateMenu', () => ({
  default: () => <span data-testid="activate-menu" />,
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

const schemaData = { forms: [] } as any;

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
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('OK'));
    expect(handleDatabaseForms).toHaveBeenCalled();
  });

  it('leaves the form alone when the offer is cancelled', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleDatabaseForms).not.toHaveBeenCalled();
  });
});
