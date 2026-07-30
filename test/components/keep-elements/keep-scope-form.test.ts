/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { fetchKeepScopes, setPullDatabase } from '../../../src/store/databases/reducer';
import { toggleDrawer } from '../../../src/store/drawer/reducer';
import {
  FETCH_AVAILABLE_DATABASES,
  INIT_STATE,
  SET_DB_ERROR,
} from '../../../src/store/databases/types';
import { loadAppIcons } from '../../../src/services/app-icons';
import '../../../src/components/keep-elements/keep-scope-form';
import type ScopeForm from '../../../src/components/keep-elements/keep-scope-form';
import type { ScopeRow } from '../../../src/components/keep-elements/keep-scope-form';

/**
 * Only `changeScope` is replaced — everything else in the action module is left real, because
 * the store and the other elements under test import from it too. The stub records the payload
 * and returns a thunk-shaped no-op so `dispatch` is happy.
 */
const submitted: Array<{ data: Record<string, any>; isEdit?: boolean }> = [];
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  changeScope: (data: Record<string, any>, isEdit?: boolean) => {
    submitted.push({ data, isEdit });
    return () => Promise.resolve();
  },
}));

const TAG = 'keep-scope-form';

/** The scope the list view hands over when a card is opened. */
const ROW: ScopeRow = {
  apiName: 'hrscope',
  description: 'The HR scope',
  server: 'Server/Org',
  nsfPath: 'apps/hr.nsf',
  schemaName: 'people',
  isActive: false,
  iconName: 'anchor',
  maximumAccessLevel: 'Manager',
};

const DATABASES = [
  { title: 'HR', nsfpath: 'apps/hr.nsf', apinames: ['people', 'payroll'] },
  { title: 'Applications', nsfpath: 'apps/apps.nsf', apinames: ['candidates'] },
  { title: 'Empty', nsfpath: 'apps/empty.nsf', apinames: [] },
];

/**
 * The scope drawer's form, which took `ScopeForm.tsx`'s markup and `ScopeFormContainer.tsx`'s
 * form state (#806 wave 5 · #807).
 *
 * The React pair had no test of its own, so nothing here is a port. What it does pin is the
 * behaviour the conversion changed on purpose:
 *
 * - the icon and the access level were held in container state that was seeded once, at mount,
 *   with no scope selected — and the submit read those copies, so Update wrote the default
 *   icon and `Editor` over whatever the scope actually had;
 * - the schema message was gated on the scope-name field's touched flag;
 * - the duplicate-name check was a guard inside the Add handler, so it could not report on
 *   blur and had to be cleared by hand on every keystroke;
 * - the Add button was disabled by a flag that was never put back, so a failed save disabled
 *   it until the screen was remounted.
 */
describe('keep-scope-form', () => {
  // The base64 payloads live in a lazily loaded chunk. Awaiting it once here means the
  // element's own snapshot is populated from construction, so the submitted `icon` is real.
  beforeAll(async () => {
    await loadAppIcons();
  });

  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch({ type: FETCH_AVAILABLE_DATABASES, payload: DATABASES });
    store.dispatch(setPullDatabase(true));
    submitted.length = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.restoreAllMocks();
  });

  const mount = (props: Partial<ScopeForm> = {}) => mountLit<ScopeForm>(TAG, props);

  const inputs = (el: ScopeForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-input')) as Array<
      HTMLElement & { value: string; disabled: boolean }
    >;

  const inputFor = (el: ScopeForm, label: string) =>
    inputs(el).find((i) => i.getAttribute('label') === label)!;

  const errors = (el: ScopeForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.field-error')).map((n) => n.textContent!.trim());

  const buttons = (el: ScopeForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.actions keep-button')) as Array<
      HTMLElement & { disabled: boolean }
    >;

  const saveButton = (el: ScopeForm) => buttons(el)[1];

  /**
   * Validation runs through yup, which is async even for synchronous rules, and only then
   * requests an update — so a single `updateComplete` observes the pre-validation render.
   * Draining the microtask queue first is what makes these assertions about the settled state.
   */
  const settle = async (el: ScopeForm) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  /** Type into a wa-input the way the element sees it: set value, fire `input`. */
  const type = async (el: ScopeForm, label: string, value: string) => {
    const input = inputFor(el, label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
  };

  const blur = async (el: ScopeForm, label: string) => {
    inputFor(el, label).dispatchEvent(new Event('blur', { bubbles: false }));
    await settle(el);
  };

  const press = async (el: ScopeForm) => {
    saveButton(el).click();
    await settle(el);
  };

  const selectSchema = async (el: ScopeForm, nsfPath: string, schemaName: string) => {
    el.shadowRoot!.querySelector('keep-schema-contents-tree')!.dispatchEvent(
      new CustomEvent('schema-select', {
        detail: { nsfPath, schemaName },
        bubbles: true,
        composed: true,
      }),
    );
    await settle(el);
  };

  const pickIcon = async (el: ScopeForm, iconName: string) => {
    el.shadowRoot!.querySelector('keep-icon-dropdown')!.dispatchEvent(
      new CustomEvent('icon-select', { detail: { iconName }, bubbles: true, composed: true }),
    );
    await settle(el);
  };

  const aclItems = (el: ScopeForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item')) as Array<
      HTMLElement & { value: string; checked: boolean }
    >;

  const pickAcl = async (el: ScopeForm, level: string) => {
    const item = aclItems(el).find((i) => i.getAttribute('value') === level)!;
    // Web Awesome flips a checkbox item's own `checked` before it emits.
    item.checked = !item.checked;
    el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
      new CustomEvent('wa-select', { detail: { item }, bubbles: true, composed: true }),
    );
    await settle(el);
    return item;
  };

  /** Fill in a valid Add. */
  const fillAdd = async (el: ScopeForm) => {
    await selectSchema(el, 'apps/hr.nsf', 'people');
    await type(el, 'Scope Name', 'hrscope');
    await type(el, 'Description', 'The HR scope');
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- headings and mode ---------------------------------------------------------------

  it('titles itself for an add', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent).toContain('Add New Scope');
  });

  it('titles itself for an edit', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent).toContain('Edit Scope');
  });

  it('names a library on every icon, so nothing is fetched from a CDN', async () => {
    const el = await mount();
    const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.every((i) => i.getAttribute('library') === 'fa')).toBe(true);
  });

  // ---- seeding -------------------------------------------------------------------------

  it('starts an add blank, active, with the default icon and access level', async () => {
    const el = await mount();
    expect(inputFor(el, 'Scope Name').value).toBe('');
    expect(inputFor(el, 'Description').value).toBe('');
    expect(inputFor(el, 'Server').value).toBe('');
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Editor');
    expect(
      (el.shadowRoot!.querySelector('keep-icon-dropdown') as HTMLElement & { iconName: string })
        .iconName,
    ).toBe('beach');
    expect(
      (el.shadowRoot!.querySelector('keep-checkbox') as HTMLElement & { checked: boolean })
        .checked,
    ).toBe(true);
  });

  it('seeds every field from the row being edited', async () => {
    // The two that were held in container state seeded once at mount are the point of this
    // test: the icon and the access level are the scope's own, not the defaults.
    const el = await mount({ database: ROW, isEdit: true });
    expect(inputFor(el, 'Scope Name').value).toBe('hrscope');
    expect(inputFor(el, 'Description').value).toBe('The HR scope');
    expect(inputFor(el, 'Server').value).toBe('Server/Org');
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Manager');
    expect(
      (el.shadowRoot!.querySelector('keep-icon-dropdown') as HTMLElement & { iconName: string })
        .iconName,
    ).toBe('anchor');
    expect(
      (el.shadowRoot!.querySelector('keep-checkbox') as HTMLElement & { checked: boolean })
        .checked,
    ).toBe(false);
    expect(el.shadowRoot!.textContent).toContain('apps/hr.nsf');
    expect(el.shadowRoot!.textContent).toContain('people');
  });

  it('locks the scope name while editing and leaves it open for an add', async () => {
    const editing = await mount({ database: ROW, isEdit: true });
    expect(inputFor(editing, 'Scope Name').hasAttribute('disabled')).toBe(true);
    cleanupLit();
    const adding = await mount();
    expect(inputFor(adding, 'Scope Name').hasAttribute('disabled')).toBe(false);
  });

  it('re-seeds when the drawer opens, discarding an abandoned edit', async () => {
    // The list view sets its React state and toggles the drawer flag in the same handler, so
    // which of the two reaches this element first is not something it can rely on. The edge
    // is the trigger that covers a second visit to the same row.
    const el = await mount({ database: ROW, isEdit: true });
    await type(el, 'Description', 'half-typed');
    expect(inputFor(el, 'Description').value).toBe('half-typed');

    store.dispatch(toggleDrawer());
    await settle(el);
    expect(inputFor(el, 'Description').value).toBe('The HR scope');
  });

  it('re-seeds when the mode flips without the row changing', async () => {
    // Add straight after an Edit: the selection object is still the last-opened scope.
    const el = await mount({ database: ROW, isEdit: true });
    el.isEdit = false;
    await settle(el);
    expect(inputFor(el, 'Scope Name').value).toBe('');
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Editor');
  });

  it('re-seeds when a different row arrives', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    el.database = { ...ROW, apiName: 'other', description: 'Another scope' };
    await settle(el);
    expect(inputFor(el, 'Scope Name').value).toBe('other');
  });

  it('tolerates an edit of a row with nothing in it', async () => {
    const el = await mount({ database: {}, isEdit: true });
    expect(inputFor(el, 'Scope Name').value).toBe('');
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Editor');
    expect(
      (el.shadowRoot!.querySelector('keep-icon-dropdown') as HTMLElement & { iconName: string })
        .iconName,
    ).toBe('beach');
  });

  // ---- validation ----------------------------------------------------------------------

  it('shows no error before the user has been anywhere', async () => {
    const el = await mount();
    expect(errors(el)).toEqual([]);
  });

  it('reports a required field when the user leaves it, and only that field', async () => {
    const el = await mount();
    await blur(el, 'Description');
    // Description reports its `min(4)` rule rather than `required` on an empty string: with
    // abortEarly false both fail and yup does not promise which lands in `inner` first. That
    // is the pre-existing schema, carried over unchanged -- pinned here so a reword is a
    // visible decision rather than a surprise.
    expect(errors(el)).toEqual(['Description is too short (minimum is 4 characters)']);
  });

  it('does not gate the schema message on the scope-name field', async () => {
    // The bug: the schema message was rendered behind `formik.touched.apiName`, so leaving
    // the scope name reported a schema the user had not been asked for yet.
    const el = await mount();
    await blur(el, 'Scope Name');
    expect(errors(el)).not.toContain('Please select a schema!');
  });

  it('a submit attempt reports every remaining field at once', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el).sort()).toEqual(
      [
        'Description is too short (minimum is 4 characters)',
        'Please select a schema!',
        'Scope Name is too short (minimum is 4 characters)',
      ].sort(),
    );
  });

  it('never renders the string "undefined"', async () => {
    const el = await mount();
    await press(el);
    expect(el.shadowRoot!.textContent).not.toContain('undefined');
    expect(errors(el).every((e) => e.length > 0)).toBe(true);
  });

  it('rejects a scope name that does not start with a letter', async () => {
    const el = await mount();
    await type(el, 'Scope Name', '1abc');
    await blur(el, 'Scope Name');
    expect(errors(el)).toContain('Scope Name must begin with a letter');
  });

  it('clears a field error as soon as the user edits it', async () => {
    const el = await mount();
    await blur(el, 'Description');
    expect(errors(el)).toHaveLength(1);
    await type(el, 'Description', 'A description');
    expect(errors(el)).toEqual([]);
  });

  it('clears the schema message when a schema is chosen', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el)).toContain('Please select a schema!');
    await selectSchema(el, 'apps/hr.nsf', 'people');
    expect(errors(el)).not.toContain('Please select a schema!');
  });

  // ---- the duplicate-name rule ---------------------------------------------------------

  it('rejects a scope name that already exists, on blur', async () => {
    // It used to be a guard inside the Add handler, so it could only report on a press.
    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    const el = await mount();
    await type(el, 'Scope Name', 'hrscope');
    await blur(el, 'Scope Name');
    expect(errors(el)).toContain('The name already exists.');
  });

  it('does not hold an edit against its own name', async () => {
    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    const el = await mount({ database: ROW, isEdit: true });
    await blur(el, 'Scope Name');
    expect(errors(el)).not.toContain('The name already exists.');
  });

  it('reads the store as it is when validation runs', async () => {
    const el = await mount();
    await type(el, 'Scope Name', 'hrscope');
    await blur(el, 'Scope Name');
    expect(errors(el)).not.toContain('The name already exists.');

    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    await blur(el, 'Scope Name');
    expect(errors(el)).toContain('The name already exists.');
  });

  // ---- restricted input ----------------------------------------------------------------

  it('strips uppercase and punctuation from the scope name', async () => {
    const el = await mount();
    await type(el, 'Scope Name', 'HR Scope-01!');
    expect(inputFor(el, 'Scope Name').value).toBe('hrscope01');
  });

  it('takes back a character that sanitises away, rather than leaving it in the box', async () => {
    const el = await mount();
    await type(el, 'Scope Name', 'abcd');
    await type(el, 'Scope Name', 'abcd!');
    expect(inputFor(el, 'Scope Name').value).toBe('abcd');
  });

  it('leaves the description alone', async () => {
    const el = await mount();
    await type(el, 'Description', 'A Real Description, with punctuation.');
    expect(inputFor(el, 'Description').value).toBe('A Real Description, with punctuation.');
  });

  // ---- the schema tree -------------------------------------------------------------------

  it('offers only databases that have schemas, sorted by title', async () => {
    const el = await mount();
    const tree = el.shadowRoot!.querySelector('keep-schema-contents-tree') as unknown as {
      contents: Array<{ title: string }>;
    };
    expect(tree.contents.map((c) => c.title)).toEqual(['Applications', 'HR']);
  });

  it('filters the tree to the schemas matching the search', async () => {
    const el = await mount();
    await type(el, 'Search Schema', 'pay');
    const tree = el.shadowRoot!.querySelector('keep-schema-contents-tree') as unknown as {
      contents: Array<{ title: string; apinames: string[] }>;
    };
    expect(tree.contents).toEqual([
      { title: 'HR', nsfpath: 'apps/hr.nsf', apinames: ['payroll'] },
    ]);
  });

  it('shows nothing when the search matches no schema', async () => {
    const el = await mount();
    await type(el, 'Search Schema', 'zzz');
    const tree = el.shadowRoot!.querySelector('keep-schema-contents-tree') as unknown as {
      contents: unknown[];
    };
    expect(tree.contents).toEqual([]);
  });

  it('writes both halves of the selection into the form', async () => {
    // The React version put the path into component state and assigned the schema name
    // straight into the form object — a mutation nothing was subscribed to.
    const el = await mount();
    await selectSchema(el, 'apps/hr.nsf', 'payroll');
    expect(el.shadowRoot!.textContent).toContain('apps/hr.nsf');
    expect(el.shadowRoot!.textContent).toContain('payroll');
  });

  // ---- the access level ------------------------------------------------------------------

  it('offers the seven access levels', async () => {
    const el = await mount();
    expect(aclItems(el).map((i) => i.getAttribute('value'))).toEqual([
      'NoAccess',
      'Depositor',
      'Reader',
      'Author',
      'Editor',
      'Designer',
      'Manager',
    ]);
  });

  it('takes the access level from the dropdown selection event', async () => {
    // Bound on the dropdown, not on each item: Web Awesome synthesises a click only for
    // pointer selection, so a per-item handler is dead for keyboard users.
    const el = await mount();
    await pickAcl(el, 'Designer');
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Designer');
  });

  it('keeps the chosen level ticked when it is picked again', async () => {
    const el = await mount();
    const item = await pickAcl(el, 'Designer');
    const again = await pickAcl(el, 'Designer');
    expect(again).toBe(item);
    expect(item.checked).toBe(true);
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.textContent).toContain('Designer');
  });

  it('names the current level on the trigger for a screen reader', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.acl-trigger')!.getAttribute('aria-label')).toBe(
      'Maximum Access Level: Editor',
    );
  });

  // ---- the save button gate ---------------------------------------------------------------

  it('the Add button is pressable from the start', async () => {
    const el = await mount();
    expect(saveButton(el).textContent!.trim()).toBe('Add');
    expect(saveButton(el).disabled).toBe(false);
  });

  it('the Update button waits for a change', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    expect(saveButton(el).textContent!.trim()).toBe('Update');
    expect(saveButton(el).disabled).toBe(true);

    await type(el, 'Description', 'A new description');
    expect(saveButton(el).disabled).toBe(false);
  });

  it('a schema change is a change, so Update is reachable after one', async () => {
    // The React version left the Update button dead when the only edit was the schema.
    const el = await mount({ database: ROW, isEdit: true });
    await selectSchema(el, 'apps/hr.nsf', 'payroll');
    expect(saveButton(el).disabled).toBe(false);
  });

  it('offers Delete only while editing', async () => {
    const adding = await mount();
    expect(buttons(adding).map((b) => b.textContent!.trim())).toEqual(['Close', 'Add']);
    cleanupLit();
    const editing = await mount({ database: ROW, isEdit: true });
    expect(buttons(editing).map((b) => b.textContent!.trim())).toEqual([
      'Close',
      'Update',
      'Delete',
    ]);
  });

  // ---- outbound events ---------------------------------------------------------------------

  it('the Close button emits close rather than reaching into the store', async () => {
    const el = await mount();
    const seen = vi.fn();
    el.addEventListener('close', seen);
    buttons(el)[0].click();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('the Delete button emits delete, leaving the permission check to the container', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    const seen = vi.fn();
    el.addEventListener('delete', seen);
    buttons(el)[2].click();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  // ---- the payload ---------------------------------------------------------------------------

  it('does not submit when the form is invalid', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el).length).toBeGreaterThan(0);
    expect(submitted).toEqual([]);
  });

  it('submits once, with the values the user entered', async () => {
    const el = await mount();
    await fillAdd(el);
    await press(el);

    expect(submitted).toHaveLength(1);
    expect(submitted[0].isEdit).toBe(false);
    expect(submitted[0].data).toMatchObject({
      apiName: 'hrscope',
      description: 'The HR scope',
      nsfPath: 'apps/hr.nsf',
      schemaName: 'people',
      isActive: true,
      iconName: 'beach',
      maximumAccessLevel: 'Editor',
      server: '',
    });
  });

  it('trims the server name and resolves the icon payload', async () => {
    const el = await mount();
    await fillAdd(el);
    await type(el, 'Server', '  Server/Org  ');
    await press(el);
    expect(submitted[0].data.server).toBe('Server/Org');
    expect(submitted[0].data.icon).toBeTruthy();
    expect(typeof submitted[0].data.icon).toBe('string');
  });

  it('sends the icon and the access level the user picked', async () => {
    const el = await mount();
    await fillAdd(el);
    await pickIcon(el, 'anchor');
    await pickAcl(el, 'Designer');
    await press(el);
    expect(submitted[0].data.iconName).toBe('anchor');
    expect(submitted[0].data.maximumAccessLevel).toBe('Designer');
  });

  it("keeps an edited scope's own icon and access level through an untouched Update", async () => {
    // The defect this conversion closes. The React submit read two container-state copies
    // that were seeded once, at mount, with no scope selected — so Update overwrote the
    // scope's icon with the default and its access level with Editor.
    const el = await mount({ database: ROW, isEdit: true });
    await type(el, 'Description', 'A new description');
    await press(el);

    expect(submitted).toHaveLength(1);
    expect(submitted[0].isEdit).toBe(true);
    expect(submitted[0].data.iconName).toBe('anchor');
    expect(submitted[0].data.maximumAccessLevel).toBe('Manager');
    expect(submitted[0].data.isActive).toBe(false);
  });

  it('a double press is one submit, not two', async () => {
    const el = await mount();
    await fillAdd(el);
    saveButton(el).click();
    saveButton(el).click();
    await settle(el);
    expect(submitted).toHaveLength(1);
  });

  it('frees the button again once the submit has settled', async () => {
    // The React flag that disabled Add was set on submit and never put back, so one save
    // disabled the button until the screen remounted.
    const el = await mount();
    await fillAdd(el);
    await press(el);
    expect(saveButton(el).disabled).toBe(false);
  });

  // ---- implicit submission -------------------------------------------------------------------

  it('has an enabled native submit control, which is what implicit submission looks for', async () => {
    const el = await mount();
    const form = el.shadowRoot!.querySelector('form')!;
    const submitter = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitter).toBeTruthy();
    expect(submitter.disabled).toBe(false);
    expect([...form.elements]).toContain(submitter);
  });

  it('the submitter is hidden from sight and from the tab order', async () => {
    const el = await mount();
    const submitter = el.shadowRoot!.querySelector('button[type="submit"]')!;
    expect(submitter.hasAttribute('hidden')).toBe(true);
    expect(submitter.getAttribute('aria-hidden')).toBe('true');
    expect(submitter.getAttribute('tabindex')).toBe('-1');
  });

  it('a submit event runs the same validation as the save button, and does not navigate', async () => {
    const el = await mount();
    const event = new Event('submit', { bubbles: true, cancelable: true });
    el.shadowRoot!.querySelector('form')!.dispatchEvent(event);
    await settle(el);
    expect(event.defaultPrevented).toBe(true);
    expect(submitted).toEqual([]);
    expect(errors(el).length).toBeGreaterThan(0);
  });

  it('a submit event saves when the form is valid', async () => {
    const el = await mount();
    await fillAdd(el);
    el.shadowRoot!.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await settle(el);
    expect(submitted).toHaveLength(1);
  });

  it('the schema search box is outside the form, so Enter there cannot submit', async () => {
    const el = await mount();
    expect(inputFor(el, 'Search Schema').closest('form')).toBeNull();
    expect(inputFor(el, 'Scope Name').closest('form')).not.toBeNull();
  });

  // ---- the inline save error -------------------------------------------------------------------

  it('shows the failed-save banner only when there is a message', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.save-error')).toBeNull();

    store.dispatch({ type: SET_DB_ERROR, payload: 'Server said no' });
    await settle(el);
    const banner = el.shadowRoot!.querySelector('.save-error')!;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Server said no');
    expect(banner.textContent).toContain('Unable to add scope');
  });

  it('names the operation that failed', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    store.dispatch({ type: SET_DB_ERROR, payload: 'Server said no' });
    await settle(el);
    expect(el.shadowRoot!.querySelector('.save-error')!.textContent).toContain(
      'Unable to edit scope',
    );
  });
});
