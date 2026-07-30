/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

/**
 * `QuickConfigFormContainer` + `QuickConfigForm` — the first real consumer of
 * `FormController` (#717, #806 tier D).
 *
 * These two files had **no tests at all** before this, which is how the six defects fixed
 * alongside the conversion survived: #892 (Odata and DQL each rendered twice), #893 (the nsfPath
 * error gated on another field's touched flag), #894 (`formik.values.nsfPath` written directly,
 * with the value duplicated in React state), #895 (the same slice subscribed twice), #896 (Enter
 * submitted nothing) and #897/#900 (dead `initialValues` entries, and a ref attached to nothing).
 * Every one is silent — the payload was right, so the only witness was the screen.
 *
 * So this suite asserts the **payload** and the **screen**. `FormController`'s own behaviour is
 * covered by `test/store/FormController*`; nothing here re-tests it.
 */

const quickConfig = vi.fn((payload: unknown) => ({ type: 'QUICK_CONFIG', payload }));
const clearDBError = vi.fn(() => ({ type: 'CLEAR_DB_ERROR' }));
const toggleQuickConfigDrawer = vi.fn(() => ({ type: 'TOGGLE_QUICK_CONFIG_DRAWER' }));

vi.mock('../../../src/store/databases/action', () => ({
  quickConfig: (payload: unknown) => quickConfig(payload),
  clearDBError: () => clearDBError(),
}));

vi.mock('../../../src/store/drawer/action', () => ({
  toggleQuickConfigDrawer: () => toggleQuickConfigDrawer(),
}));

/**
 * Stubbed so the database picker is one button.
 *
 * The real one is `keep-tree` behind `FileContentsTree`, and driving a Lit tree's expand/select
 * through jsdom would be testing the tree. The contract that matters here is exactly
 * `setNsfPath(value)` — which is what #894 broke.
 */
vi.mock('../../../src/components/database/FileContentsTree', () => ({
  default: ({ setNsfPath }: { setNsfPath: (path: string) => void }) => (
    <button type="button" onClick={() => setNsfPath('demo.nsf')}>
      pick demo.nsf
    </button>
  ),
}));

/**
 * Stubbed because of **#902**, not for convenience.
 *
 * `keep-alert` moves itself to `document.body` as soon as `message` lands — deliberately, so it can
 * escape a shadow tree — which takes the node out from under React. React's later removal then
 * throws `NotFoundError: The node to be removed is not a child of this node`, in teardown, for any
 * test that renders it. That is a real production crash on both its React call sites (this one and
 * `LoginPage`), filed separately; stubbing keeps that failure out of this suite rather than hiding
 * it.
 */
vi.mock('../../../src/components/keep-elements/react/KeepAlert', () => ({
  KeepAlert: ({ message }: { message?: string }) => <span data-testid="keep-alert">{message}</span>,
}));

/** The icon payload map is a lazily loaded chunk (#772); two entries are enough. */
vi.mock('../../../src/services/app-icons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/services/app-icons')>()),
  useAppIcons: () => ({ beach: 'BEACH_PAYLOAD', bank: 'BANK_PAYLOAD' }),
}));

const { default: QuickConfigFormContainer } = await import(
  '../../../src/components/database/QuickConfigFormContainer'
);

const STATE = {
  drawer: { quickConfigDrawer: true },
  databases: {
    availableDatabases: [{ title: 'demo.nsf' }, { title: 'other.nsf' }],
    scopes: [{ apiName: 'taken' }],
    databases: [{ nsfPath: 'demo.nsf', schemaName: 'existing' }],
    dbError: false,
    dbErrorMessage: '',
  },
};

const mount = (state: Record<string, unknown> = {}) =>
  renderWithProviders(<QuickConfigFormContainer />, { preloadedState: { ...STATE, ...state } });

const field = (label: string) => screen.getByLabelText(label, { exact: false }) as HTMLInputElement;

/** One `change`, not a keystroke stream — enough for a controlled MUI `TextField`. */
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });

const click = (text: string) => fireEvent.click(screen.getByText(text));

/**
 * Click Add and let the submit settle.
 *
 * `FormController.submit()` is async — it awaits `validate()` before `onSubmit` — so a bare
 * `fireEvent.click` returns before either has run and every payload assertion reads an empty mock.
 * Formik's `submitForm()` was async too; the difference is that nothing used to assert on it.
 */
const submitViaAdd = async () => {
  await act(async () => {
    click('Add');
  });
};

const submitViaForm = async () => {
  await act(async () => {
    fireEvent.submit(theForm());
  });
};

/**
 * The icon picker's button, not the menu.
 *
 * The `Menu` is `keepMounted`, so every entry in `APP_ICON_NAMES` is in the document from the
 * first render — a bare `getByText('beach')` matches the button *and* the menu item.
 */
const iconButton = () => document.querySelector('.icon-select') as HTMLElement;

const pickDatabase = () => click('pick demo.nsf');

const fillValidForm = () => {
  pickDatabase();
  type('Schema Name', 'myschema');
  type('Scope Name', 'myscope');
  type('Description', 'a description');
};

/** The form element itself — the only way to reach a submit in jsdom. See the note below. */
const theForm = () => document.querySelector('form') as HTMLFormElement;

const modesGroup = () => screen.getByText('Additional Modes').parentElement as HTMLElement;

const payload = () => quickConfig.mock.calls[0][0] as Record<string, unknown>;

describe('QuickConfigForm', () => {
  beforeEach(() => {
    quickConfig.mockClear();
    clearDBError.mockClear();
    toggleQuickConfigDrawer.mockClear();
  });

  it('renders exactly one Odata and one DQL checkbox (#892)', () => {
    mount();
    // Four were rendered: the Odata/DQL pair appeared twice, verbatim. Both members of each pair
    // bound to the same value, so they agreed and the payload stayed correct — the drawer simply
    // read "Odata / DQL / Odata / DQL", and nothing looked at the drawer.
    const modes = modesGroup();
    expect(within(modes).getAllByText('Odata')).toHaveLength(1);
    expect(within(modes).getAllByText('DQL')).toHaveLength(1);
    // Counted as elements too, because the labels are plain spans beside the controls: a
    // duplicated control under a single label would pass the two checks above.
    expect(modes.querySelectorAll('keep-checkbox')).toHaveLength(2);
  });

  it('starts with the default icon (#897)', () => {
    mount();
    // `iconName` is a form field now. It was React state in the container *and* a dead entry in
    // `initialValues`, resolved through an icon map that could not have loaded on first render.
    expect(iconButton().textContent).toContain('beach');
  });

  // ---- the payload ---------------------------------------------------------------------------

  it('submits the schema with the picked database and no modes enabled', async () => {
    mount();
    fillValidForm();
    await submitViaAdd();

    expect(quickConfig).toHaveBeenCalledTimes(1);
    expect(payload()).toMatchObject({
      schemaName: 'myschema',
      scopeName: 'myscope',
      description: 'a description',
      // Reaches the payload from the form, not from a second copy in React state that
      // `handleNsfPath` used to write into `formik.values` by hand (#894).
      nsfPath: 'demo.nsf',
      isActive: true,
      iconName: 'beach',
      icon: 'BEACH_PAYLOAD',
      create: true,
      server: '',
    });
    // The enabled mode *names*, not the record the checkboxes bind to.
    expect(payload().additionalModes).toEqual([]);
  });

  it('sends the enabled mode names when a mode is checked', async () => {
    mount();
    fillValidForm();
    // keep-checkbox re-emits a composed `change`; the handler reads `event.target.checked`.
    const odata = modesGroup().querySelectorAll('keep-checkbox')[0] as HTMLElement & {
      checked: boolean;
    };
    odata.checked = true;
    fireEvent.change(odata);
    await submitViaAdd();

    expect(payload().additionalModes).toEqual(['odata']);
  });

  it('lowercases and strips the schema and scope names', async () => {
    mount();
    pickDatabase();
    type('Schema Name', 'My Schema-1!');
    type('Scope Name', 'My Scope_2');
    type('Description', 'd');
    await submitViaAdd();

    expect(payload()).toMatchObject({ schemaName: 'myschema1', scopeName: 'myscope2' });
  });

  it('replaces the additionalModes record with a name list', async () => {
    // `{ odata, dql }` is destructured out and replaced. A payload carrying both shapes under one
    // key is what the JSON round-trip this replaced made easy to miss.
    mount();
    fillValidForm();
    await submitViaAdd();
    expect(Array.isArray(payload().additionalModes)).toBe(true);
  });

  // ---- validation ----------------------------------------------------------------------------

  it('shows every yup error at once and submits nothing', async () => {
    mount();
    // Typing then clearing enables Add, which is gated on `isDisabled`, not on validity.
    type('Description', 'x');
    type('Description', '');
    await submitViaAdd();

    expect(quickConfig).not.toHaveBeenCalled();
    expect(screen.getByText('Schema Name is required.')).toBeTruthy();
    // Not "Scope Name is required." — `.min(4)` is declared before `.required()`, validation runs
    // with `abortEarly: false`, and the first message per field wins. Formik's `yupToFormErrors`
    // kept the first too, so this is unchanged behaviour, and it is wrong: a field the user has
    // not filled in is reported as too short. Filed as #903, deliberately not fixed here — this
    // suite pins what the drawer actually says today.
    expect(screen.getByText('Scope Name is too short (minimum is 4 characters)')).toBeTruthy();
    expect(screen.getByText('Please select a database!')).toBeTruthy();
  });

  it('shows the nsfPath error only after a submit, and never renders "undefined" (#893)', async () => {
    mount();
    // Nothing shown before a submit, even though nsfPath is empty and therefore invalid.
    expect(screen.queryByText('Please select a database!')).toBeNull();
    expect(screen.queryByText('undefined')).toBeNull();

    type('Description', 'x');
    await submitViaAdd();
    expect(screen.getByText('Please select a database!')).toBeTruthy();

    // The condition was `!nsfPath && formik.touched.schemaName` displaying `errors.nsfPath` — the
    // wrong field's flag, and the prop rather than the error. Picking a database while the schema
    // is still invalid is the shape that could print the interpolated string.
    pickDatabase();
    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('Please select a database!')).toBeNull();
  });

  it('clears a field error as soon as that field is edited', async () => {
    mount();
    type('Description', 'x');
    await submitViaAdd();
    expect(screen.getByText('Schema Name is required.')).toBeTruthy();

    type('Schema Name', 'abc');
    expect(screen.queryByText('Schema Name is required.')).toBeNull();
    // the untouched fields keep theirs — see #903 for why this one says "too short"
    expect(screen.getByText('Scope Name is too short (minimum is 4 characters)')).toBeTruthy();
  });

  it('rejects a schema name that already exists in the picked database', async () => {
    mount();
    pickDatabase();
    type('Schema Name', 'existing');
    type('Scope Name', 'myscope');
    type('Description', 'd');
    await submitViaAdd();

    expect(quickConfig).not.toHaveBeenCalled();
    expect(screen.getByText('The schema name already exists in this database.')).toBeTruthy();
  });

  it('rejects a scope name that already exists', async () => {
    mount();
    pickDatabase();
    type('Schema Name', 'fresh');
    type('Scope Name', 'taken');
    type('Description', 'd');
    await submitViaAdd();

    expect(quickConfig).not.toHaveBeenCalled();
    expect(screen.getByText('The name already exists.')).toBeTruthy();
  });

  // ---- Enter, which had never submitted anything (#896) --------------------------------------
  //
  // **jsdom does not implement implicit form submission**, so pressing Enter in a field cannot be
  // simulated here — `fireEvent.keyDown(input, { key: 'Enter' })` does nothing to the form, in a
  // fixed jsdom exactly as in a broken one. A test written that way would assert nothing.
  //
  // What is testable is the two halves separately: the **mechanism** (the form has an enabled
  // `type="submit"` control, without which no browser submits it) and the **destination** (a
  // submit event routes through the duplicate-name checks). A real Enter needs a browser, as #809
  // also found on the login page.

  it('has an enabled submit control, which is what implicit submission looks for', () => {
    mount();
    const submitter = theForm().querySelector('button[type="submit"]') as HTMLButtonElement;
    // Present: the Add button is a `keep-button`, not form-associated, and its `<wa-button>` is in
    // a shadow root — so it is never in `form.elements` and can never be the submitter.
    expect(submitter).toBeTruthy();
    // Enabled: implicit submission skips a disabled control, which would put this straight back
    // where it started.
    expect(submitter.disabled).toBe(false);
    // And in `form.elements`, which is the list the browser actually searches.
    expect(Array.from(theForm().elements)).toContain(submitter);
  });

  it('a submit event goes through the duplicate-name checks, not straight to submit()', async () => {
    // Wiring `onSubmit` to `form.submit()` would let Enter skip the uniqueness checks the Add
    // button honours — the same two names, two different outcomes.
    mount();
    pickDatabase();
    type('Schema Name', 'existing');
    type('Scope Name', 'myscope');
    type('Description', 'd');
    await submitViaForm();

    expect(quickConfig).not.toHaveBeenCalled();
    expect(screen.getByText('The schema name already exists in this database.')).toBeTruthy();
  });

  it('a submit event creates the schema when the form is valid', async () => {
    mount();
    fillValidForm();
    await submitViaForm();
    expect(quickConfig).toHaveBeenCalledTimes(1);
  });

  it('a submit event does nothing while the Add button is disabled', async () => {
    mount();
    // Nothing edited, so Add is disabled — a submit must mirror it rather than route around it.
    await submitViaForm();
    expect(quickConfig).not.toHaveBeenCalled();
  });

  it('Enter in the database search box is prevented', () => {
    // The search field is inside the form but not part of the schema, and the form now has a
    // submitter. Without this guard, Enter while filtering databases would create the schema.
    mount();
    const notPrevented = fireEvent.keyDown(field('Search Databases'), {
      key: 'Enter',
      code: 'Enter',
    });
    expect(notPrevented).toBe(false);
  });

  // ---- #887's guard, in the real form -------------------------------------------------------

  it('a double-clicked Add is one write', async () => {
    mount();
    fillValidForm();
    const add = screen.getByText('Add');
    await act(async () => {
      add.click();
      add.click();
    });
    expect(quickConfig).toHaveBeenCalledTimes(1);
  });

  // ---- close and reset ----------------------------------------------------------------------

  it('Close resets the form and closes the drawer', () => {
    mount();
    type('Schema Name', 'draft');
    click('Close');

    expect(clearDBError).toHaveBeenCalled();
    expect(toggleQuickConfigDrawer).toHaveBeenCalled();
    expect(field('Schema Name').value).toBe('');
  });

  it('reset restores the picked database and the icon, which were separate state before', () => {
    mount();
    pickDatabase();
    expect(screen.getByText('Database: demo.nsf')).toBeTruthy();

    click('Close');
    // `formik.resetForm()` could not do this: nsfPath and the icon lived outside the form, so
    // every reset site had to remember to clear them by hand — and one of them did it by
    // assigning into `formik.values` (#894).
    expect(screen.getByText('Database:')).toBeTruthy();
    expect(iconButton().textContent).toContain('beach');
  });

  it('shows the database error banner from the store', () => {
    mount({
      databases: { ...STATE.databases, dbError: true, dbErrorMessage: 'schema is locked' },
    });
    // Two banners appear for one error: the container's `KeepAlert` (stubbed here, see #902) and
    // the leaf's own MUI `Alert`. Both are pre-existing; asserted as-is rather than deduplicated,
    // because removing one is a visible change and this PR is a Formik migration.
    expect(screen.getByTestId('keep-alert').textContent).toBe('schema is locked');
    expect(screen.getByText('Quick config error:')).toBeTruthy();
  });
});
