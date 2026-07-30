/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import AddImportDialog from '../../../src/components/database/AddImportDialog';

/**
 * #905 — the "schema name already exists in this database" rule can actually fire.
 *
 * The rule used to compare against `state.databases.databases`, which no reducer in the
 * store ever wrote: `[]` from `initialState` for the whole life of the session. So the
 * comparison list was always empty, the yup `.test()` always passed, and a duplicate
 * schema name in the same database reached the server unchallenged. `databasesOverview`
 * is the list that actually holds `{ nsfPath, schemaName }`, and the rule now reads it.
 *
 * **The fixture below is the point of this file.** The sibling rule in the Quick Config
 * form had a test that passed green while the rule was dead, because its fixture seeded
 * `databases` — a field production never populates. Seeding a field the store does not
 * write makes a dead rule look tested. Everything here is seeded on `databasesOverview`,
 * which `addSchema` pushes into and `deleteSchema` splices out of, so a green result
 * means the rule can fire against the state the app really has.
 *
 * Two reads had to change, not one, and the duplicate case fails if either regresses —
 * checked by restoring each in turn:
 *
 * 1. The slice field. Pre-fix source with `databases: []` seeded, which is what
 *    `initialState` leaves it as: no error reported.
 * 2. The database being compared against. The rule reads `nsfPath` off `context.parent`,
 *    the values object being validated, not the `nsfPath` *state* — `handleClickSaveSchema`
 *    calls `setNsfPath()` and `formik.submitForm()` back to back, so validation runs before
 *    the re-render that would let a closure see the picked database. Put the state closure
 *    back and the duplicate goes unreported even with `databasesOverview` seeded.
 *
 * Fault 2 is why seeding the dead field does not rescue the pre-fix code here: with
 * `nsfPath` still `''`, the key it looks up is `':existing'`, which matches nothing.
 */

vi.mock('../../../src/store/databases/action', () => ({
  addSchema: vi.fn(() => ({ type: 'NOOP' })),
}));

// 221 KB of base64 behind a dynamic import. Nothing here asserts on icons.
vi.mock('../../../src/styles/app-icons', () => ({ default: {} }));

const EXISTING = {
  nsfPath: 'demo.nsf',
  schemaName: 'existing',
  description: 'already there',
  icon: '',
  iconName: 'beach',
};

const preloadedState = {
  databases: {
    databasesOverview: [EXISTING],
    // Both are selectable, so a rejection is the unique-name rule and not the separate
    // "Database does not exist!" rule further down the same schema.
    availableDatabases: [
      { title: 'demo.nsf', nsfpath: 'demo.nsf', apinames: ['existing'] },
      { title: 'other.nsf', nsfpath: 'other.nsf', apinames: [] },
    ],
  },
};

/** Open the dialog on its "Create Schema" branch, which is where the form lives. */
const openCreateForm = () => {
  renderWithProviders(<AddImportDialog open handleClose={vi.fn()} />, { preloadedState });
  fireEvent.click(screen.getByText('Create Schema'));
};

const type = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

/**
 * Pick the database. The autocomplete is a Lit element that formik does not own: the
 * component reads its shadow `<input>` on save, so a test drives it the same way.
 */
const pickDatabase = async (nsfPath: string) => {
  const autocomplete = document.querySelector('keep-autocomplete') as HTMLElement & {
    updateComplete: Promise<unknown>;
  };
  await autocomplete.updateComplete;
  autocomplete.shadowRoot!.querySelector('input')!.value = nsfPath;
};

/** `act` because the click starts formik's async validation, which lands as a state update. */
const save = () => act(async () => void fireEvent.click(screen.getByText('Save Schema')));

describe('AddImportDialog — unique schema name (#905)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a schema name already used in the picked database', async () => {
    openCreateForm();
    type('Schema Name', 'existing');
    type('Description', 'a duplicate of the seeded one');
    await pickDatabase('demo.nsf');
    await save();

    expect(
      await screen.findByText(/Schema name already exists in this database/),
    ).toBeInTheDocument();

    const { addSchema } = await import('../../../src/store/databases/action');
    expect(addSchema, 'a rejected form must not reach the server').not.toHaveBeenCalled();
  });

  it('accepts the same name in a different database', async () => {
    openCreateForm();
    type('Schema Name', 'existing');
    type('Description', 'same name, different nsf');
    await pickDatabase('other.nsf');
    await save();

    const { addSchema } = await import('../../../src/store/databases/action');
    await waitFor(() => expect(addSchema).toHaveBeenCalled());
    expect(
      screen.queryByText(/Schema name already exists in this database/),
      'the rule must be scoped to the database, not global',
    ).toBeNull();
  });

  it('accepts a name not used anywhere in that database', async () => {
    openCreateForm();
    type('Schema Name', 'fresh');
    type('Description', 'a name nobody has taken');
    await pickDatabase('demo.nsf');
    await save();

    const { addSchema } = await import('../../../src/store/databases/action');
    await waitFor(() => expect(addSchema).toHaveBeenCalled());
  });
});
