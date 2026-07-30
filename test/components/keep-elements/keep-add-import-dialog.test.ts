/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import {
  addAvailableDatabase,
  addSchema as seedSchema,
} from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import { loadAppIcons, resetAppIconsForTest } from '../../../src/services/app-icons';
import '../../../src/components/keep-elements/keep-add-import-dialog';
import type AddImportDialog from '../../../src/components/keep-elements/keep-add-import-dialog';
import type Autocomplete from '../../../src/components/keep-elements/keep-autocomplete';

/**
 * `keep-add-import-dialog` — the tier-D conversion of `database/AddImportDialog.tsx`, the
 * "Add New Schema" dialog behind the schema list's Add button.
 *
 * ## What carried over from the React test
 *
 * That file existed for **#905**: the "schema name already exists in this database" rule
 * compared against `state.databases.databases`, a slice field no reducer writes, so it was
 * always comparing against `[]` and a duplicate name reached the server unchallenged. All
 * three of its cases are here — reject a duplicate in the picked database, accept the same
 * name in a different one, accept a fresh name — seeded on `databasesOverview`, which is the
 * list `addSchema` really pushes into. Seeding the dead field is what made the sibling form's
 * version of this test pass while its rule was dead, so it is worth restating: nothing below
 * touches `databases`.
 *
 * The second half of #905 is gone rather than dropped, because the shape it guarded no longer
 * exists. The rule had to read `nsfPath` off `context.parent` because the component kept a
 * copy of it in React state that was a render behind the submit reading it — `setNsfPath()`
 * and `submitForm()` on consecutive lines. There is one `nsfPath` now, in the form, written
 * when the picker reports a change; there is no second copy left to be stale, so
 * `context.parent` is a convenience here rather than the only way through. The rule is still
 * pinned against both databases, which is what it was really claiming.
 *
 * ## What jsdom cannot check
 *
 * Two things, both stated where they bite:
 *
 * - **Form association.** `wa-input`, `wa-textarea` and `wa-select` are form-associated custom
 *   elements, and jsdom implements none of that. Nothing here submits through a form; the
 *   values are read out of the controller, which is the point of the conversion.
 * - **The dialog itself.** jsdom implements no modal behaviour, no top layer and no
 *   `::backdrop`, and `setupTests.ts` stubs `showModal`/`close`. These assert the calls, not
 *   the resulting state, and the backdrop needs a browser.
 */

/** Recorded `addSchema` calls: the request body, and the reset callback it was handed. */
const submitted: Array<{ payload: Record<string, any>; reset?: () => void }> = [];

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  addSchema: (payload: Record<string, any>, reset?: () => void) => {
    submitted.push({ payload, reset });
    return () => Promise.resolve();
  },
}));

// 221 KB of base64 behind a dynamic import (#772). One entry is enough to prove the payload
// is resolved from the name at submit time.
vi.mock('../../../src/styles/app-icons', () => ({ default: { beach: 'BEACH-BASE64' } }));

const TAG = 'keep-add-import-dialog';

type WaField = HTMLElement & { value: string };

const mount = (open = true) => mountLit<AddImportDialog>(TAG, { open });

const dialogOf = (el: AddImportDialog) =>
  el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

const options = (el: AddImportDialog) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.option'));

const optionNamed = (el: AddImportDialog, title: string) =>
  options(el).find((b) => b.querySelector('.option-title')!.textContent!.trim() === title)!;

const nameField = (el: AddImportDialog) => el.shadowRoot!.querySelector('wa-input') as WaField;
const descriptionField = (el: AddImportDialog) =>
  el.shadowRoot!.querySelector('wa-textarea') as WaField;
const picker = (el: AddImportDialog) =>
  el.shadowRoot!.querySelector('keep-autocomplete') as Autocomplete;

const hintOf = (field: Element | null) =>
  field?.querySelector('[slot="hint"]')?.textContent?.trim() ?? '';

const actionNamed = (el: AddImportDialog, label: string) =>
  Array.from(el.shadowRoot!.querySelectorAll('.actions keep-button')).find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement & { disabled: boolean };

/**
 * Validation runs through yup, which is async even for synchronous rules, and only then asks
 * for a render — so one `updateComplete` observes the pre-validation frame. Draining the
 * microtask queue is what makes these assertions about the settled state.
 */
const settle = async (el: AddImportDialog) => {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
    await el.updateComplete;
  }
};

/** Type into a WebAwesome field the way the control does: set the value, fire `input`. */
const type = async (el: AddImportDialog, field: WaField, value: string) => {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
};

const blur = async (el: AddImportDialog, field: WaField) => {
  field.dispatchEvent(new Event('blur', { bubbles: false }));
  await settle(el);
};

/** Pick a database the way `keep-autocomplete` reports one: set the value, emit `change`. */
const pickDatabase = async (el: AddImportDialog, nsfPath: string) => {
  const autocomplete = picker(el);
  autocomplete.selectedOption = nsfPath;
  autocomplete.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
  await el.updateComplete;
};

const save = async (el: AddImportDialog) => {
  actionNamed(el, 'Save Schema').click();
  await settle(el);
};

/** Open the Create branch, which is where the form lives. */
const openForm = async (el: AddImportDialog) => {
  optionNamed(el, 'Create Schema').click();
  await el.updateComplete;
};

/**
 * Drive the file picker the element opens. jsdom runs no file chooser, so this finds the
 * throwaway input, gives it a file and fires the `change` the browser would have.
 *
 * jsdom's `FileReader` walks loadstart / progress / load / loadend across several macrotasks,
 * so one `setTimeout(0)` is not enough — with a single hop this observed the pre-read frame
 * about half the time. Ten hops is deterministic and costs nothing.
 */
const chooseFile = async (el: AddImportDialog, contents: string) => {
  optionNamed(el, 'Import Schema').click();
  await el.updateComplete;

  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([contents], 'schema.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));

  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  }
  await settle(el);
  return input;
};

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

const seed = () => {
  store.dispatch(addAvailableDatabase({ title: 'demo.nsf', nsfpath: 'demo.nsf', apinames: [] }));
  store.dispatch(addAvailableDatabase({ title: 'other.nsf', nsfpath: 'other.nsf', apinames: [] }));
  store.dispatch(seedSchema({ nsfPath: 'demo.nsf', schemaName: 'existing' }));
};

describe('keep-add-import-dialog', () => {
  beforeEach(async () => {
    store.dispatch({ type: INIT_STATE });
    submitted.length = 0;
    resetAppIconsForTest();
    // The request body carries the icon bytes next to the name, and they live behind a
    // dynamic import. Landing them up front is what `index.tsx` does at boot.
    await loadAppIcons();
    seed();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.clearAllMocks();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- opening and closing -------------------------------------------------------------

  it('stays closed until the parent raises the flag', async () => {
    await mount(false);
    expect(showModal()).not.toHaveBeenCalled();
  });

  it('opens modally when open is set', async () => {
    const el = await mount(false);
    el.open = true;
    await el.updateComplete;
    expect(showModal()).toHaveBeenCalledTimes(1);
  });

  it('closes again when open goes false', async () => {
    const el = await mount();
    const before = close().mock.calls.length;
    el.open = false;
    await el.updateComplete;
    expect(close().mock.calls.length).toBe(before + 1);
  });

  it('emits dialog-close from the header close button', async () => {
    const el = await mount();
    const seen: Event[] = [];
    el.addEventListener('dialog-close', (e) => seen.push(e));
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-close when the native dialog is cancelled, so Escape does not desync', async () => {
    const el = await mount();
    const seen: Event[] = [];
    el.addEventListener('dialog-close', (e) => seen.push(e));
    dialogOf(el).dispatchEvent(new Event('cancel'));
    expect(seen).toHaveLength(1);
  });

  // ---- the chooser ---------------------------------------------------------------------

  it('offers both branches as real buttons, so each is reachable from the keyboard', async () => {
    // The original was two divs with click handlers and no role, tabindex or key handling,
    // so neither option could be operated without a pointer (WCAG 2.1.1).
    const el = await mount();
    const titles = options(el).map((b) => b.querySelector('.option-title')!.textContent!.trim());
    expect(titles).toEqual(['Import Schema', 'Create Schema']);
    expect(options(el).every((b) => b.tagName === 'BUTTON' && b.type === 'button')).toBe(true);
  });

  it('names the dialog for the branch the user is on', async () => {
    const el = await mount();
    const heading = () =>
      el.shadowRoot!.querySelector('keep-form-dialog-header')!.getAttribute('heading');

    expect(heading()).toBe('Add New Schema');
    // aria-label rather than aria-labelledby: the heading is inside the header's own shadow
    // root and an IDREF cannot cross a shadow boundary (#713).
    expect(dialogOf(el).getAttribute('aria-label')).toBe('Add New Schema');

    await openForm(el);
    expect(heading()).toBe('Create Schema');
    expect(dialogOf(el).getAttribute('aria-label')).toBe('Create Schema');
  });

  it('captions the database field "Database" on the create branch', async () => {
    const el = await mount();
    await openForm(el);
    expect(el.shadowRoot!.querySelector('.section .medium-text')!.textContent!.trim()).toBe(
      'Database',
    );
  });

  it('captions it "Import Into Database" on the import branch', async () => {
    const el = await mount();
    await chooseFile(el, JSON.stringify({ schemaName: 'imported', nsfPath: 'demo.nsf' }));
    expect(el.shadowRoot!.querySelector('.section .medium-text')!.textContent!.trim()).toBe(
      'Import Into Database',
    );
  });

  it('goes back to the chooser and throws away what was typed', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'people');

    Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.back'))[0].click();
    await el.updateComplete;
    expect(options(el)).toHaveLength(2);

    await openForm(el);
    expect(nameField(el).value).toBe('');
  });

  it('clears everything when it is reopened', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'people');
    el.open = false;
    await el.updateComplete;

    el.open = true;
    await el.updateComplete;
    // Back on the chooser, and the form behind it is empty.
    expect(options(el)).toHaveLength(2);
    await openForm(el);
    expect(nameField(el).value).toBe('');
  });

  // ---- fields ---------------------------------------------------------------------------

  it('labels every field rather than naming it with a placeholder', async () => {
    // A placeholder is the accessible name only until something is typed into it (WCAG 3.3.2).
    const el = await mount();
    await openForm(el);
    const labels = Array.from(el.shadowRoot!.querySelectorAll('[slot="label"]')).map((n) =>
      n.textContent!.trim(),
    );
    expect(labels).toEqual(['Schema Name', 'Schema Description', 'Formula Engine']);
  });

  it('strips uppercase and punctuation from the schema name, and keeps underscores', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'My Schema-01_x!');
    expect(nameField(el).value).toBe('myschema01_x');
  });

  it('reports a required field when the user leaves it', async () => {
    const el = await mount();
    await openForm(el);
    await blur(el, nameField(el));

    expect(nameField(el).getAttribute('aria-invalid')).toBe('true');
    // An empty name fails `min(3)` and `required` at once, and with abortEarly false yup does
    // not promise which of the two lands in `inner` first — it is the length rule here. That is
    // the schema as it was written, carried over unchanged; pinned so a reword is a visible
    // decision rather than a surprise.
    expect(hintOf(nameField(el))).toBe('Schema name should contain at least 3 characters.');
    // and only that field
    expect(descriptionField(el).getAttribute('aria-invalid')).toBe('false');
  });

  it('clears a field message as soon as that field is edited', async () => {
    const el = await mount();
    await openForm(el);
    await blur(el, nameField(el));
    expect(hintOf(nameField(el))).not.toBe('');

    await type(el, nameField(el), 'people');
    expect(hintOf(nameField(el))).toBe('');
    expect(nameField(el).getAttribute('aria-invalid')).toBe('false');
  });

  it('reports every remaining field on the first Save press', async () => {
    const el = await mount();
    await openForm(el);
    await save(el);

    // The length rule wins over `required` for both text fields, for the reason given above.
    expect(hintOf(nameField(el))).toBe('Schema name should contain at least 3 characters.');
    expect(hintOf(descriptionField(el))).toBe(
      'Schema description should contain at least 3 characters.',
    );
    expect(picker(el).errorMessage).toBe('Please select a database!');
    expect(picker(el).error).toBe(true);
    expect(submitted).toHaveLength(0);
  });

  it('never renders the word "undefined" in place of an absent message', async () => {
    const el = await mount();
    await openForm(el);
    await save(el);
    expect(el.shadowRoot!.textContent).not.toContain('undefined');
  });

  it('rejects a database that is not in the list', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'people');
    await type(el, descriptionField(el), 'the people schema');
    await pickDatabase(el, 'nowhere.nsf');
    await save(el);

    expect(picker(el).errorMessage).toBe('Database does not exist!');
    expect(submitted).toHaveLength(0);
  });

  // ---- #905: the uniqueness rule can fire ------------------------------------------------

  it('rejects a schema name already used in the picked database', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'existing');
    await type(el, descriptionField(el), 'a duplicate of the seeded one');
    await pickDatabase(el, 'demo.nsf');
    await save(el);

    expect(hintOf(nameField(el))).toContain('Schema name already exists in this database');
    expect(submitted, 'a rejected form must not reach the server').toHaveLength(0);
  });

  it('accepts the same name in a different database', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'existing');
    await type(el, descriptionField(el), 'same name, different nsf');
    await pickDatabase(el, 'other.nsf');
    await save(el);

    expect(submitted).toHaveLength(1);
    expect(
      hintOf(nameField(el)),
      'the rule must be scoped to the database, not global',
    ).not.toContain('already exists');
  });

  it('accepts a name nobody has taken in that database', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');
    await save(el);

    expect(submitted).toHaveLength(1);
  });

  // ---- the request body ------------------------------------------------------------------

  it('sends the schema name as apiName and the icon bytes beside the icon name', async () => {
    // Both were carried in the form's initial values and overwritten on the way out every
    // time — `icon` from a chunk that had usually not loaded when they were read (#772, #897).
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');
    await save(el);

    expect(submitted[0].payload).toMatchObject({
      schemaName: 'fresh',
      apiName: 'fresh',
      nsfPath: 'demo.nsf',
      description: 'a name nobody has taken',
      formulaEngine: 'domino',
      iconName: 'beach',
      icon: 'BEACH-BASE64',
      isActive: true,
      dqlFormula: { formulaType: 'domino', formula: '@True' },
    });
  });

  it('does not create the schema twice when Save is pressed twice', async () => {
    // #887: both presses can land before the render that would disable the button, and this
    // request is a create — two of them are two schemas.
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');

    actionNamed(el, 'Save Schema').click();
    actionNamed(el, 'Save Schema').click();
    await settle(el);

    expect(submitted).toHaveLength(1);
  });

  it('closes itself once the save is dispatched', async () => {
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');

    const seen: Event[] = [];
    el.addEventListener('dialog-close', (e) => seen.push(e));
    await save(el);
    expect(seen).toHaveLength(1);
  });

  it('empties the form when the create succeeds', async () => {
    // `addSchema` calls this back on a 200. It runs while the submit is still settling, which
    // is the case FormController guards with its generation counter.
    const el = await mount();
    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');
    await save(el);

    submitted[0].reset!();
    await settle(el);
    await openForm(el);
    expect(nameField(el).value).toBe('');
    expect(descriptionField(el).value).toBe('');
  });

  // ---- importing a file --------------------------------------------------------------------

  it('fills the form from a chosen file and opens it', async () => {
    const el = await mount();
    await chooseFile(
      el,
      JSON.stringify({
        schemaName: 'imported',
        description: 'from a file',
        nsfPath: 'demo.nsf',
        iconName: 'beach',
      }),
    );

    expect(nameField(el).value).toBe('imported');
    expect(descriptionField(el).value).toBe('from a file');
    expect(picker(el).initialOption).toBe('demo.nsf');
  });

  it('keeps a key the form does not own and sends it on', async () => {
    // The original spread the whole parsed file into the values and the values into the body,
    // so an export's extra fields travelled through untouched. They still do — they are just
    // no longer validated against fields that do not exist.
    const el = await mount();
    await chooseFile(
      el,
      JSON.stringify({
        schemaName: 'imported',
        description: 'from a file',
        nsfPath: 'demo.nsf',
        formAccessModes: { default: 'rw' },
      }),
    );
    await save(el);

    expect(submitted).toHaveLength(1);
    expect(submitted[0].payload.formAccessModes).toEqual({ default: 'rw' });
  });

  /**
   * The import replaces the values over `INITIAL_VALUES` rather than merging into whatever the
   * form held (#947).
   *
   * Called directly, and deliberately: this is **not** reachable through the UI, because the
   * Import button lives in the chooser, the chooser only renders while `formOpen` is false, and
   * `handleBack()` — the sole route back to it — resets. So the merge was correct, but only
   * because of what its callers happen to do, and nothing in the import path said so. These pin
   * that it is now correct on its own, which is the whole point of the change.
   */
  describe('an import does not depend on a caller having reset first', () => {
    const importDirectly = async (el: AddImportDialog, parsed: unknown) => {
      (el as unknown as { applyImportedSchema(parsed: unknown): void }).applyImportedSchema(parsed);
      await el.updateComplete;
    };

    it('does not keep a field the second file omits', async () => {
      const el = await mount();
      await importDirectly(el, {
        schemaName: 'first',
        description: 'from the first file',
        nsfPath: 'demo.nsf',
      });
      expect(descriptionField(el).value).toBe('from the first file');

      await importDirectly(el, { schemaName: 'second', nsfPath: 'demo.nsf' });

      expect(nameField(el).value).toBe('second');
      expect(descriptionField(el).value).toBe('');
    });

    // Passes against the old private bag too — that assigned rather than merged, so the unowned
    // keys never accumulated. Kept as a control on `setExtras` keeping the same promise: if it
    // ever started merging, the values half above would still pass and only this would catch it.
    it('does not accumulate the unowned keys either', async () => {
      const el = await mount();
      await importDirectly(el, {
        schemaName: 'first',
        description: 'from a file',
        nsfPath: 'demo.nsf',
        formAccessModes: { default: 'rw' },
      });
      await importDirectly(el, {
        schemaName: 'second',
        description: 'from a file',
        nsfPath: 'demo.nsf',
        agents: ['one'],
      });
      await save(el);

      expect(submitted[0].payload.agents).toEqual(['one']);
      expect(submitted[0].payload.formAccessModes).toBeUndefined();
    });
  });

  it('leaves a key the file omits at its initial value rather than sending a hole', async () => {
    const el = await mount();
    await chooseFile(
      el,
      JSON.stringify({ schemaName: 'imported', description: 'from a file', nsfPath: 'demo.nsf' }),
    );
    await save(el);

    expect(submitted[0].payload.dqlFormula).toEqual({ formulaType: 'domino', formula: '@True' });
    expect(submitted[0].payload.owners).toEqual([]);
  });

  it('reports a file that is not a schema instead of throwing out of the reader', async () => {
    const el = await mount();
    await chooseFile(el, 'this is not json');

    const alert = el.shadowRoot!.querySelector('.import-error')!;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('could not be read as a schema');
    // still on the chooser, so the user can pick another file
    expect(options(el)).toHaveLength(2);
  });

  it('rejects a JSON file that is not an object', async () => {
    const el = await mount();
    await chooseFile(el, '[1, 2, 3]');
    expect(el.shadowRoot!.querySelector('.import-error')).not.toBeNull();
    expect(options(el)).toHaveLength(2);
  });

  it('takes the throwaway file input back out of the document either way', async () => {
    // It used to be built on every render and removed only on the success path, so cancelling
    // the picker or choosing an unreadable file left one in the body for the life of the page.
    const el = await mount();
    await chooseFile(el, 'this is not json');
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });

  it('drops the leftovers from an import when the dialog is reopened', async () => {
    const el = await mount();
    await chooseFile(
      el,
      JSON.stringify({
        schemaName: 'imported',
        description: 'from a file',
        nsfPath: 'demo.nsf',
        formAccessModes: { default: 'rw' },
      }),
    );

    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;

    await openForm(el);
    await type(el, nameField(el), 'fresh');
    await type(el, descriptionField(el), 'a name nobody has taken');
    await pickDatabase(el, 'demo.nsf');
    await save(el);

    expect(submitted[0].payload.formAccessModes).toBeUndefined();
  });

  // ---- outbound contract -------------------------------------------------------------------

  it('reports nothing but dialog-close, so the picker events stay inside', async () => {
    const el = await mount();
    await openForm(el);
    const leaked: string[] = [];
    for (const name of ['change', 'input', 'icon-select']) {
      el.addEventListener(name, (e) => leaked.push(e.type));
    }

    await type(el, nameField(el), 'people');
    await pickDatabase(el, 'demo.nsf');
    el.shadowRoot!.querySelector('keep-icon-dropdown')!.dispatchEvent(
      new CustomEvent('icon-select', {
        detail: { iconName: 'beach' },
        bubbles: true,
        composed: true,
      }),
    );
    await el.updateComplete;

    expect(leaked).toEqual([]);
  });
});
