/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { addSchema, fetchKeepScopes } from '../../../src/store/databases/reducer';
import { INIT_STATE, SET_DB_ERROR } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-quick-config-form';
import type QuickConfigForm from '../../../src/components/keep-elements/keep-quick-config-form';

/**
 * Only `quickConfig` is replaced — everything else in the action module is left real, because
 * the store and the other elements under test import from it too. The stub records the payload
 * and returns a thunk-shaped no-op so `dispatch` is happy.
 */
const submitted: Array<Record<string, any>> = [];
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  quickConfig: (payload: Record<string, any>) => {
    submitted.push(payload);
    return () => Promise.resolve();
  },
}));

const TAG = 'keep-quick-config-form';

/**
 * The five "Quick*" issues, all fixed by this element:
 *
 * - #892 the Odata and DQL checkboxes were each declared twice
 * - #893 the nsfPath error was gated on schemaName's touched flag, and could print "undefined"
 * - #894 the container assigned into `formik.values.nsfPath` and kept a second copy in React state
 * - #895 `state.databases` was subscribed twice, and neither selector narrowed
 * - #897 `initialValues` carried a setter-less schemaName and an icon the form never owned
 *
 * Plus #905, found while writing them: the "already exists in this database" rule compared
 * against a slice field no reducer writes, so it could never fire.
 *
 * Like `keep-network-error-dialog`, this drives the **real** store: the element takes no props
 * and reads everything through `StoreController`.
 */
describe('keep-quick-config-form', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    submitted.length = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.restoreAllMocks();
  });

  const mount = () => mountLit<QuickConfigForm>(TAG);

  const inputs = (el: QuickConfigForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-input')) as Array<
      HTMLElement & { value: string; label: string }
    >;

  const inputFor = (el: QuickConfigForm, label: string) =>
    inputs(el).find((i) => i.getAttribute('label') === label)!;

  const checkboxes = (el: QuickConfigForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-checkbox')) as Array<
      HTMLElement & { checked: boolean }
    >;

  const errors = (el: QuickConfigForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.field-error')).map((n) => n.textContent!.trim());

  const buttons = (el: QuickConfigForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.actions keep-button')) as Array<
      HTMLElement & { disabled: boolean }
    >;

  const addButton = (el: QuickConfigForm) => buttons(el)[1];

  /** Type into a wa-input the way the element sees it: set value, fire `input`. */
  const type = async (el: QuickConfigForm, label: string, value: string) => {
    const input = inputFor(el, label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
  };

  /**
   * `handleBlur` validates through yup, which is async even for synchronous rules, and only
   * then requests an update — so a single `updateComplete` observes the pre-validation render.
   * Draining the microtask queue first is what makes these assertions about the settled state.
   */
  const settle = async (el: QuickConfigForm) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const blur = async (el: QuickConfigForm, label: string) => {
    inputFor(el, label).dispatchEvent(new Event('blur', { bubbles: false }));
    await settle(el);
  };

  /** Press Add and wait for the submit to settle. */
  const press = async (el: QuickConfigForm) => {
    addButton(el).click();
    await settle(el);
  };

  const selectDatabase = async (el: QuickConfigForm, nsfPath: string) => {
    el.shadowRoot!.querySelector('keep-file-contents-tree')!.dispatchEvent(
      new CustomEvent('nsf-select', { detail: { nsfPath }, bubbles: true, composed: true }),
    );
    await el.updateComplete;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- #892 ---------------------------------------------------------------------------------

  it('renders one Odata and one DQL checkbox, not two each', async () => {
    const el = await mount();
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.modes')).map((row) =>
      row.textContent!.trim(),
    );
    expect(labels).toEqual(['Odata', 'DQL']);
  });

  it('has three checkboxes in total: Active, Odata, DQL', async () => {
    const el = await mount();
    expect(checkboxes(el)).toHaveLength(3);
  });

  it('each mode checkbox drives its own value', async () => {
    const el = await mount();
    const [, odata, dql] = checkboxes(el);

    odata.checked = true;
    odata.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(odata.checked).toBe(true);
    expect(dql.checked).toBe(false);

    dql.checked = true;
    dql.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(odata.checked).toBe(true);
    expect(dql.checked).toBe(true);
  });

  // ---- #893 ---------------------------------------------------------------------------------

  it('shows no error before the user has been anywhere', async () => {
    const el = await mount();
    expect(errors(el)).toEqual([]);
  });

  it('does not gate the nsfPath error on schemaName', async () => {
    // The bug: `!nsfPath && formik.touched.schemaName`. Blurring schemaName reported a missing
    // database, a field the user had not touched.
    const el = await mount();
    await blur(el, 'Schema Name');
    expect(errors(el)).not.toContain('Please select a database!');
  });

  it('reports the missing database on submit, and clears it once one is chosen', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el)).toContain('Please select a database!');

    await selectDatabase(el, 'apps/hr.nsf');
    expect(errors(el)).not.toContain('Please select a database!');
  });

  it('never renders the string "undefined"', async () => {
    // The React version interpolated a possibly-absent error key into a template literal.
    const el = await mount();
    await blur(el, 'Schema Name');
    await blur(el, 'Scope Name');
    await press(el);
    expect(el.shadowRoot!.textContent).not.toContain('undefined');
    expect(errors(el).every((e) => e.length > 0)).toBe(true);
  });

  // ---- blur-time validation -----------------------------------------------------------------

  it('reports a required field when the user leaves it, and only that field', async () => {
    const el = await mount();
    await blur(el, 'Schema Name');
    expect(errors(el)).toEqual(['Schema Name is required.']);
  });

  it('reports each field as the user tabs through', async () => {
    const el = await mount();
    await blur(el, 'Schema Name');
    await blur(el, 'Scope Name');
    // Scope Name reports its `min(4)` rule rather than `required` on an empty string: with
    // abortEarly false both fail and yup does not promise which lands in `inner` first. That
    // is the pre-existing schema, carried over unchanged -- pinned here so a reword is a
    // visible decision rather than a surprise.
    expect(errors(el)).toEqual([
      'Schema Name is required.',
      'Scope Name is too short (minimum is 4 characters)',
    ]);
  });

  it('a submit attempt reports every remaining field at once', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el).sort()).toEqual(
      [
        'Please provide a short description about this schema!',
        'Please select a database!',
        'Schema Name is required.',
        'Scope Name is too short (minimum is 4 characters)',
      ].sort(),
    );
  });

  it('clears a field error as soon as the user edits it', async () => {
    const el = await mount();
    await blur(el, 'Schema Name');
    expect(errors(el)).toHaveLength(1);
    await type(el, 'Schema Name', 'people');
    expect(errors(el)).toEqual([]);
  });

  // ---- restricted input ---------------------------------------------------------------------

  it('strips uppercase and punctuation from schema and scope names', async () => {
    const el = await mount();
    await type(el, 'Schema Name', 'My Schema-01!');
    expect(inputFor(el, 'Schema Name').value).toBe('myschema01');
    await type(el, 'Scope Name', 'HR Scope');
    expect(inputFor(el, 'Scope Name').value).toBe('hrscope');
  });

  it('takes back a character that sanitises away, rather than leaving it in the box', async () => {
    // The value does not change, so a template that only writes on change would skip the
    // re-render and let the control drift from what is submitted.
    const el = await mount();
    await type(el, 'Schema Name', 'abc');
    await type(el, 'Schema Name', 'abc!');
    expect(inputFor(el, 'Schema Name').value).toBe('abc');
  });

  it('leaves the description alone', async () => {
    const el = await mount();
    await type(el, 'Description', 'A Real Description, with punctuation.');
    expect(inputFor(el, 'Description').value).toBe('A Real Description, with punctuation.');
  });

  // ---- duplicate-name rules, now in the schema ---------------------------------------------

  it('rejects a schema name that already exists in the chosen database (#905)', async () => {
    store.dispatch(addSchema({ nsfPath: 'apps/hr.nsf', schemaName: 'people' }));
    const el = await mount();
    await selectDatabase(el, 'apps/hr.nsf');
    await type(el, 'Schema Name', 'people');
    await blur(el, 'Schema Name');
    expect(errors(el)).toContain('The schema name already exists in this database.');
  });

  it('allows the same schema name in a different database', async () => {
    // This is why the rule has to read a sibling field: the name alone is not the key.
    store.dispatch(addSchema({ nsfPath: 'apps/hr.nsf', schemaName: 'people' }));
    const el = await mount();
    await selectDatabase(el, 'apps/other.nsf');
    await type(el, 'Schema Name', 'people');
    await blur(el, 'Schema Name');
    expect(errors(el)).not.toContain('The schema name already exists in this database.');
  });

  it('re-checks against the store as it is when validation runs, not when it was built', async () => {
    const el = await mount();
    await selectDatabase(el, 'apps/hr.nsf');
    await type(el, 'Schema Name', 'people');
    await blur(el, 'Schema Name');
    expect(errors(el)).not.toContain('The schema name already exists in this database.');

    store.dispatch(addSchema({ nsfPath: 'apps/hr.nsf', schemaName: 'people' }));
    await blur(el, 'Schema Name');
    expect(errors(el)).toContain('The schema name already exists in this database.');
  });

  it('rejects a scope name that already exists', async () => {
    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    const el = await mount();
    await type(el, 'Scope Name', 'hrscope');
    await blur(el, 'Scope Name');
    expect(errors(el)).toContain('The name already exists.');
  });

  it('reports the duplicate name on blur, where the React version waited for the Add press', async () => {
    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    const el = await mount();
    await type(el, 'Scope Name', 'hrscope');
    await blur(el, 'Scope Name');
    // No submit needed — the check used to live in the Add handler.
    expect(errors(el)).toContain('The name already exists.');
  });

  // ---- the Add button ------------------------------------------------------------------------

  it('the Add button is pressable from the start', async () => {
    // Was disabled until one of three text fields changed, so a user who had only picked a
    // database saw a dead button and no explanation.
    const el = await mount();
    expect(addButton(el).disabled).toBe(false);
  });

  it('does not submit when the form is invalid', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el).length).toBeGreaterThan(0);
    expect(submitted).toEqual([]);
  });

  // ---- the payload ---------------------------------------------------------------------------

  /** Fill in a valid form. */
  const fill = async (el: QuickConfigForm) => {
    await selectDatabase(el, 'apps/hr.nsf');
    await type(el, 'Schema Name', 'people');
    await type(el, 'Scope Name', 'hrscope');
    await type(el, 'Description', 'The people schema');
  };

  it('submits once, with the values the user entered', async () => {
    const el = await mount();
    await fill(el);
    await press(el);

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      nsfPath: 'apps/hr.nsf',
      schemaName: 'people',
      scopeName: 'hrscope',
      description: 'The people schema',
      isActive: true,
      iconName: 'beach',
      create: true,
    });
  });

  it('a double press is one submit, not two', async () => {
    // #887's guard, reached through a real element rather than the controller directly.
    const el = await mount();
    await fill(el);
    addButton(el).click();
    addButton(el).click();
    await settle(el);
    expect(submitted).toHaveLength(1);
  });

  it('narrows additionalModes to the enabled names', async () => {
    const el = await mount();
    await fill(el);
    const odata = checkboxes(el)[1];
    odata.checked = true;
    odata.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    await press(el);
    expect(submitted[0].additionalModes).toEqual(['odata']);
  });

  it('sends an empty additionalModes list when neither mode is on', async () => {
    const el = await mount();
    await fill(el);
    await press(el);
    expect(submitted[0].additionalModes).toEqual([]);
  });

  it('does not send the form-only iconName as the icon payload', async () => {
    // #897: the React initialValues carried a base64 `icon` resolved on first render and never
    // updated when the user picked another. Here it is resolved from iconName at submit.
    const el = await mount();
    await fill(el);
    await press(el);
    expect(submitted[0]).toHaveProperty('icon');
    expect(submitted[0].iconName).toBe('beach');
  });


  // ---- implicit submission (#896) ------------------------------------------------------------

  it('has an enabled native submit control, which is what implicit submission looks for', async () => {
    // wa-input's Enter handling walks `form.elements` for an enabled type="submit". Neither
    // keep-button nor its inner wa-button is form-associated, so without this Enter did nothing.
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

  it('a submit event runs the same validation as the Add button', async () => {
    const el = await mount();
    el.shadowRoot!.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }));
    await settle(el);
    expect(submitted).toEqual([]);
    expect(errors(el).length).toBeGreaterThan(0);
  });

  it('a submit event cannot skip the duplicate-name rules', async () => {
    // The rules are in the yup schema, not in a guard before submit, so every route into the
    // form runs them. This is the property that makes the schema the right home for them.
    store.dispatch(fetchKeepScopes([{ apiName: 'hrscope' }]));
    const el = await mount();
    await fill(el);
    el.shadowRoot!.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }));
    await settle(el);
    expect(submitted).toEqual([]);
    expect(errors(el)).toContain('The name already exists.');
  });

  it('a submit event creates the schema when the form is valid', async () => {
    const el = await mount();
    await fill(el);
    el.shadowRoot!.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }));
    await settle(el);
    expect(submitted).toHaveLength(1);
  });

  it('a submit event does not navigate', async () => {
    const el = await mount();
    const event = new Event('submit', { bubbles: true, cancelable: true });
    el.shadowRoot!.querySelector('form')!.dispatchEvent(event);
    await settle(el);
    expect(event.defaultPrevented).toBe(true);
  });

  it('the database search box is outside the form, so Enter there cannot submit', async () => {
    // Structural rather than a keydown guard: a control with no form ancestor has nothing to
    // submit, so there is no handler to get wrong.
    const el = await mount();
    const search = inputFor(el, 'Search Databases');
    expect(search.closest('form')).toBeNull();
    expect(inputFor(el, 'Schema Name').closest('form')).not.toBeNull();
  });

  // ---- reset and close -----------------------------------------------------------------------

  it('reset clears the fields and the errors', async () => {
    const el = await mount();
    await type(el, 'Schema Name', 'people');
    await blur(el, 'Scope Name');
    expect(errors(el)).toHaveLength(1);

    el.reset();
    await settle(el);
    await el.updateComplete;
    expect(inputFor(el, 'Schema Name').value).toBe('');
    expect(errors(el)).toEqual([]);
  });

  it('reset clears the database search too', async () => {
    const el = await mount();
    await type(el, 'Search Databases', 'hr');
    el.reset();
    await el.updateComplete;
    expect(inputFor(el, 'Search Databases').value).toBe('');
  });

  it('the Close button emits close rather than reaching into the store', async () => {
    const el = await mount();
    const seen = vi.fn();
    el.addEventListener('close', seen);
    buttons(el)[0].click();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  // ---- the inline save error -----------------------------------------------------------------

  it('shows the failed-save banner only when there is a message', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.save-error')).toBeNull();

    store.dispatch({ type: SET_DB_ERROR, payload: 'Server said no' });
    await el.updateComplete;
    const banner = el.shadowRoot!.querySelector('.save-error')!;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Server said no');
  });

  // ---- #897 -----------------------------------------------------------------------------------

  it('starts with the default icon and no separate schemaName copy', async () => {
    const el = await mount();
    const trigger = el.shadowRoot!.querySelector('.icon-select')!;
    expect(trigger.textContent).toContain('beach');
    expect(inputFor(el, 'Schema Name').value).toBe('');
  });

  it('picking an icon updates the trigger', async () => {
    const el = await mount();
    const items = Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));
    const target = items.find((i) => i.textContent!.trim() === 'binoculars');
    expect(target, 'expected a "binoculars" entry in APP_ICON_NAMES').toBeTruthy();
    (target as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.icon-select')!.textContent).toContain('binoculars');
  });

  // ---- #925 -----------------------------------------------------------------------------------

  /**
   * The icon menu had two independent reasons to be keyboard-dead, and the binding was only
   * the second of them.
   *
   * `wa-dropdown` collects its items with
   * `defaultSlot.assignedElements({ flatten: true }).filter(el => el.localName === 'wa-dropdown-item')`
   * — *top-level* assigned nodes. The 86 icons used to sit inside a `<div class="icon-menu">`
   * that carried the scroll box, so the only assigned element was the div and `getItems()`
   * answered an empty array: the arrow keys had nothing to move through. Measured in Chrome
   * against this exact markup — ArrowDown on the open menu left focus on the trigger.
   *
   * The scroll box is `wa-dropdown::part(menu)` now. This asserts the structural half, since
   * the parent of each item is the property `assignedElements` actually depends on.
   */
  it('keeps every icon a direct child of the dropdown, where wa-dropdown looks for items', async () => {
    const el = await mount();
    const items = Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));
    expect(items.length).toBeGreaterThan(1);
    const parents = new Set(items.map((item) => item.parentElement!.localName));
    expect(parents, 'a wrapper element hides the items from getItems()').toEqual(
      new Set(['wa-dropdown']),
    );
  });

  it('picking an icon by keyboard updates the trigger and the form value', async () => {
    const el = await mount();
    el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
      new CustomEvent('wa-select', {
        detail: { item: { value: 'binoculars', checked: false } },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.icon-select')!.textContent).toContain('binoculars');
  });

  it('does not let the composed wa-select escape into the host document', async () => {
    const el = await mount();
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
      new CustomEvent('wa-select', {
        detail: { item: { value: 'binoculars', checked: false } },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });

  /**
   * `makeSelection` toggles `checked` on a `type="checkbox"` item before it emits, which is the
   * wrong verb for a single-select list: re-picking the icon the form already holds would untick
   * it, and Lit would not put it back — its `?checked=${iconName === values.iconName}` binding
   * sees no change to commit.
   */
  it('leaves the current icon ticked when it is picked again', async () => {
    const el = await mount();
    const item = { value: 'beach', checked: true };
    // What Web Awesome hands us after its own toggle has already run.
    item.checked = false;
    el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
      new CustomEvent('wa-select', {
        detail: { item },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await el.updateComplete;
    expect(item.checked).toBe(true);
    expect(el.shadowRoot!.querySelector('.icon-select')!.textContent).toContain('beach');
  });

  // ---- #895 -----------------------------------------------------------------------------------

  it('filters the database list from one subscription', async () => {
    const el = await mount();
    const tree = () =>
      el.shadowRoot!.querySelector('keep-file-contents-tree') as unknown as {
        contents: Array<{ title: string }>;
      };
    expect(tree().contents).toEqual([]);

    await type(el, 'Search Databases', 'zzz');
    expect(tree().contents).toEqual([]);
  });
});
