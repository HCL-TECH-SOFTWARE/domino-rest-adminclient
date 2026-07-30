/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import TabForms from '../../../src/components/forms/TabForms';
import type FormsTableElement from '../../../src/components/keep-elements/keep-forms-table';

/**
 * Where the forms table's navigation went.
 *
 * The table is `keep-forms-table` now (#806). An element cannot reach the router — it is
 * handed to the React tree through context with no module-level instance, and this codebase
 * has no Lit reactive controller for it yet — so the element names the form in a `form-open`
 * event and *this* component turns it into a URL. These are the two URL assertions the
 * table's own suite used to hold, moved to the file that now owns the behaviour; everything
 * else it asserted lives in `test/components/keep-elements/keep-forms-table.test.ts`.
 *
 * The URLs are pinned rather than merely "navigate was called", because the spelling is the
 * whole behaviour: the two paths below used to encode the schema path two different ways,
 * and collapsing them onto one call site is the change this guards.
 */
const navigate = vi.fn();

vi.mock('../../../src/router/react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
  useParams: () => ({ dbName: 'testdb', nsfPath: 'test.nsf' }),
}));

/** The real ones post the schema back to the API; the save thunk is also read back below. */
const { addForm, handleDatabaseForms, pullForms } = vi.hoisted(() => ({
  addForm: vi.fn(() => ({ type: 'TEST_ADD_FORM' })),
  // The rest parameter is load-bearing for types, not for behaviour: a zero-arg `vi.fn`
  // gives `mock.calls[0]` the tuple type `[]`, so reading the success callback off index 5
  // is a compile error rather than a runtime one.
  handleDatabaseForms: vi.fn((..._args: unknown[]) => ({ type: 'TEST_HANDLE_DATABASE_FORMS' })),
  pullForms: vi.fn(() => ({ type: 'TEST_PULL_FORMS' })),
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  addForm,
  handleDatabaseForms,
  pullForms,
}));

const forms = [
  {
    formName: 'Contact',
    alias: 'ct',
    dbName: 'testdb',
    formModes: [{ modeName: 'default' }, { modeName: 'edit' }],
  },
  { formName: 'Invoice', alias: '', dbName: 'testdb', formModes: [] },
];

const schemaData = { forms: [] } as never;

/**
 * Render the tab and flush the table element's first update.
 *
 * Lit's first update is unconditionally async — it awaits inside `__enqueueUpdate()` before
 * `render()` runs — so the shadow root is empty when `render()` returns. `performUpdate()`
 * is public and synchronous, which closes that gap without making every assertion async.
 */
function renderTabForms() {
  renderWithProviders(
    <TabForms
      setData={vi.fn()}
      schemaData={schemaData}
      setSchemaData={vi.fn()}
      formList={['Contact', 'Invoice']}
    />,
    {
      preloadedState: {
        databases: { forms, databasePull: true, folders: [], scopes: [] },
        dialog: { loading: false, deleteDialogVisible: false },
      },
    },
  );

  const table = document.querySelector('keep-forms-table') as FormsTableElement & {
    performUpdate: () => void;
  };
  table.performUpdate();
  return table;
}

const editButton = (table: FormsTableElement, formName: string) =>
  table.shadowRoot!.querySelector<HTMLButtonElement>(`.edit-button[title="${formName}"]`)!;

describe('TabForms — opening a form from the table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates straight to a configured form', () => {
    const table = renderTabForms();

    editButton(table, 'Contact').click();

    expect(addForm).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/schema/test.nsf/testdb/Contact/access');
  });

  it('navigates to a newly activated form only once the save succeeds', () => {
    const table = renderTabForms();

    // Invoice has no modes, so the edit control offers to activate it first.
    editButton(table, 'Invoice').click();
    table.performUpdate();
    const ok = [...table.shadowRoot!.querySelectorAll('keep-button')].find(
      (button) => button.textContent?.trim() === 'OK',
    ) as HTMLElement;
    ok.click();

    expect(navigate).not.toHaveBeenCalled();

    // The sixth argument is the save thunk's success callback — the deferred navigation.
    (handleDatabaseForms.mock.calls[0][5] as () => void)();
    expect(navigate).toHaveBeenCalledWith('/schema/test.nsf/testdb/Invoice/access');
  });

  it('stays on the page when a row is activated in place', () => {
    const table = renderTabForms();

    // What the row menu emits. The in-place path passes no success callback, so there is
    // nothing to navigate with.
    table.shadowRoot!.querySelector('keep-activate-menu')!.dispatchEvent(
      new CustomEvent('activate-form', {
        detail: { formName: 'Contact' },
        bubbles: true,
        composed: true,
      }),
    );

    expect(handleDatabaseForms).toHaveBeenCalledTimes(1);
    expect(handleDatabaseForms.mock.calls[0]).toHaveLength(5);
    expect(navigate).not.toHaveBeenCalled();
  });
});
