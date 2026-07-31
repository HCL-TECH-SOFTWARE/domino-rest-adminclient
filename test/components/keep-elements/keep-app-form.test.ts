/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { fetchKeepScopes } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import { toggleApplicationDrawer } from '../../../src/store/drawer/action';
import '../../../src/components/keep-elements/keep-app-form';
import type AppForm from '../../../src/components/keep-elements/keep-app-form';
import type { AppFormValues } from '../../../src/components/keep-elements/keep-app-form';

/**
 * Both save thunks are replaced; everything else in the module stays real. The stubs record
 * the request body, which is the whole contract of this form, and return a thunk-shaped no-op
 * so `dispatch` is happy.
 */
const added: Array<Record<string, any>> = [];
const updated: Array<Record<string, any>> = [];
vi.mock('../../../src/store/applications/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/applications/action')>()),
  addApplication: (payload: Record<string, any>) => {
    added.push(payload);
    return () => Promise.resolve();
  },
  updateApp: (payload: Record<string, any>) => {
    updated.push(payload);
    return () => Promise.resolve();
  },
}));

const TAG = 'keep-app-form';

/**
 * A complete, valid seed — the shape a row of the list pushes in for an edit.
 *
 * The client id is what makes it one. Since #939 the form derives Add from Edit by asking
 * whether it was seeded with an application, so this constant and {@link ADD_VALUES} below
 * differ in that field and nothing else, and every test that asserts which thunk ran picks
 * the one it means.
 */
const EDIT_VALUES: AppFormValues = {
  appId: 'client-77',
  appName: 'Orders',
  appDescription: 'Order intake',
  appCallbackUrlsStr: 'https://a.example/cb\n\nhttps://b.example/cb',
  appStartPage: 'https://a.example',
  appStatus: true,
  appScope: 'sales,MAIL',
  appContactsStr: 'ada@example.com\n',
  appIcon: 'anchor',
  usePkce: true,
};

/** The same values with no application behind them — a filled-in Add. */
const ADD_VALUES: AppFormValues = { ...EDIT_VALUES, appId: '' };

describe('keep-app-form', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    added.length = 0;
    updated.length = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.restoreAllMocks();
  });

  const mount = (props: Partial<AppForm> = {}) => mountLit<AppForm>(TAG, props);

  const giveScopes = (...apiNames: string[]) => {
    store.dispatch(fetchKeepScopes(apiNames.map((apiName) => ({ apiName }) as any)));
  };

  const fields = (el: AppForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-input, wa-textarea')) as Array<
      HTMLElement & { value: string }
    >;

  const fieldFor = (el: AppForm, label: string) =>
    fields(el).find((f) => f.getAttribute('label') === label)!;

  const errors = (el: AppForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.field-error')).map((n) => n.textContent!.trim());

  const actionButtons = (el: AppForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.actions keep-button')) as Array<
      HTMLElement & { disabled: boolean }
    >;

  const submitButton = (el: AppForm) => actionButtons(el)[1];

  const pills = (el: AppForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.pill')).map((p) =>
      p.querySelector('span')!.textContent!.trim(),
    );

  const scopeInput = (el: AppForm) =>
    el.shadowRoot!.querySelector('#scope-input') as HTMLElement & {
      selectedOption: string;
      options: readonly string[];
    };

  const iconInput = (el: AppForm) =>
    el.shadowRoot!.querySelector('.icon-select') as HTMLElement & { selectedOption: string };

  const checkboxes = (el: AppForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-checkbox')) as Array<
      HTMLElement & { checked: boolean }
    >;

  /**
   * Validation is a promise even for synchronous yup rules, and the controller only requests
   * an update afterwards — so a single `updateComplete` observes the pre-validation render.
   */
  const settle = async (el: AppForm) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const type = async (el: AppForm, label: string, value: string) => {
    const field = fieldFor(el, label);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
  };

  const blur = async (el: AppForm, label: string) => {
    fieldFor(el, label).dispatchEvent(new Event('blur', { bubbles: false }));
    await settle(el);
  };

  const press = async (el: AppForm) => {
    submitButton(el).click();
    await settle(el);
  };

  /** Fill everything the schema requires, so a press reaches `onSubmit`. */
  const fillValid = async (el: AppForm) => {
    await type(el, 'Application Name', 'Orders');
    await type(el, 'Callback URLs (one per line)', 'https://a.example/cb');
    await type(el, 'Startup Page', 'https://a.example');
    scopeInput(el).selectedOption = 'MAIL';
    el.shadowRoot!.querySelector<HTMLElement>('.scope-field keep-button')!.click();
    await el.updateComplete;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- add vs edit -------------------------------------------------------------------------

  it('heads and labels itself for an add by default', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Add New Application',
    );
    expect(submitButton(el).textContent!.trim()).toBe('Add');
  });

  it('heads and labels itself for an edit', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Edit Application',
    );
    expect(submitButton(el).textContent!.trim()).toBe('Update');
  });

  /**
   * #939. The mode used to be a string the opener set, and the list view's edit control — the
   * only reachable way into this form — never set it, so every edit from the list saved as a
   * create: a second application, with the same name and a freshly issued client id.
   *
   * These three pin the derivation from both ends, because the failure was not that the mode
   * was computed wrongly. It was that it was computed somewhere else.
   */
  it('takes an add from a seed with no application behind it, whatever the old mode says', async () => {
    const el = await mount({ initialValues: ADD_VALUES, formContext: 'Edit' });
    await settle(el);
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Add New Application',
    );
    expect(submitButton(el).textContent!.trim()).toBe('Add');

    await press(el);
    expect(updated).toHaveLength(0);
    expect(added).toHaveLength(1);
  });

  it('takes an edit from the row alone, with nothing else said', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);
    expect(el.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Edit Application',
    );
    expect(submitButton(el).textContent!.trim()).toBe('Update');

    await press(el);
    expect(added).toHaveLength(0);
    expect(updated).toEqual([expect.objectContaining({ client_id: 'client-77' })]);
  });

  it('goes back to an add when the drawer is reopened without a row', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);

    el.initialValues = undefined;
    await settle(el);

    expect(el.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Add New Application',
    );
    expect(submitButton(el).textContent!.trim()).toBe('Add');
  });

  it('names a library on every icon, so nothing is fetched from a CDN', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.every((i) => i.getAttribute('library') === 'fa')).toBe(true);
  });

  // ---- seeding -----------------------------------------------------------------------------

  it('seeds every field from the values it is given', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);

    expect(fieldFor(el, 'Application Name').value).toBe('Orders');
    expect(fieldFor(el, 'Description').value).toBe('Order intake');
    expect(fieldFor(el, 'Startup Page').value).toBe('https://a.example');
    expect(pills(el)).toEqual(['sales', 'MAIL']);
    expect(checkboxes(el).map((c) => c.checked)).toEqual([true, true]);
  });

  /**
   * `@lit/react` re-applies every property on every parent render with no dirty check. If the
   * seed were taken each time, a keystroke followed by any unrelated parent render would be
   * thrown away.
   */
  it('does not re-seed when the same values object is re-applied', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);
    await type(el, 'Application Name', 'Orders v2');

    el.initialValues = EDIT_VALUES;
    await settle(el);

    expect(fieldFor(el, 'Application Name').value).toBe('Orders v2');
  });

  it('re-seeds when a different application is pushed in', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);

    el.initialValues = { ...EDIT_VALUES, appId: 'client-88', appName: 'Invoices' };
    await settle(el);

    expect(fieldFor(el, 'Application Name').value).toBe('Invoices');
  });

  /**
   * The Add path replaces the values object with the same pristine one every time, so identity
   * alone would leave the previous visit's typing on screen. The drawer's opening edge is what
   * covers that.
   */
  it('clears itself when the drawer opens again', async () => {
    const el = await mount();
    await settle(el);
    await type(el, 'Application Name', 'half typed');

    store.dispatch(toggleApplicationDrawer());
    await settle(el);

    expect(fieldFor(el, 'Application Name').value).toBe('');
  });

  it('drops the previous visit"s error messages when the drawer opens again', async () => {
    const el = await mount();
    await press(el);
    expect(errors(el).length).toBeGreaterThan(0);

    store.dispatch(toggleApplicationDrawer());
    await settle(el);

    expect(errors(el)).toEqual([]);
  });

  // ---- validation --------------------------------------------------------------------------

  it('shows no messages before the user has done anything', async () => {
    const el = await mount();
    expect(errors(el)).toEqual([]);
  });

  it('reports every required field on the first press, and saves nothing', async () => {
    const el = await mount();
    await press(el);

    expect(errors(el)).toEqual([
      'Application Name is Required.',
      'At least one URL is required.',
      'Startup page is required.',
      'Scope is required.',
    ]);
    expect(added).toHaveLength(0);
  });

  /**
   * Errors on blur, which is what the Formik markup described and never did — `handleBlur` was
   * wired nowhere, so a message could not appear before the first press.
   */
  it('reports one field when the user leaves it, and only that one', async () => {
    const el = await mount();
    await type(el, 'Application Name', 'x');
    await type(el, 'Application Name', '');
    await blur(el, 'Application Name');

    expect(errors(el)).toEqual(['Application Name is Required.']);
  });

  it('reports the multi-line fields on blur too', async () => {
    const el = await mount();
    await blur(el, 'Callback URLs (one per line)');
    expect(errors(el)).toEqual(['At least one URL is required.']);
  });

  it('clears a field message once the field is filled in', async () => {
    const el = await mount();
    await blur(el, 'Application Name');
    expect(errors(el)).toContain('Application Name is Required.');

    await type(el, 'Application Name', 'Orders');
    await settle(el);
    expect(errors(el)).not.toContain('Application Name is Required.');
  });

  // ---- saving ------------------------------------------------------------------------------

  it('builds the request body from the values, dropping blank lines', async () => {
    const el = await mount({
      initialValues: {
        ...EDIT_VALUES,
        appId: '',
        appStatus: false,
        usePkce: false,
        appName: '  Orders  ',
      },
    });
    await settle(el);
    await press(el);

    expect(updated).toHaveLength(0);
    expect(added).toHaveLength(1);
    expect(added[0]).toEqual({
      client_name: 'Orders',
      description: 'Order intake',
      redirect_uris: ['https://a.example/cb', 'https://b.example/cb'],
      client_uri: 'https://a.example',
      scope: 'sales,MAIL',
      logo_uri: 'anchor',
      status: 'disabled',
      contacts: ['ada@example.com'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
  });

  it('marks an active application and PKCE the way the API spells them', async () => {
    const el = await mount({ initialValues: ADD_VALUES });
    await settle(el);
    await press(el);

    expect(added[0]).toMatchObject({
      status: 'isActive',
      token_endpoint_auth_method: 'none',
    });
  });

  it('updates rather than adds when it was seeded with a row, carrying the client id', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);
    await press(el);

    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ client_id: 'client-77', client_name: 'Orders' });
  });

  /**
   * The React version assigned the icon from a component state that started at the default and
   * was only ever moved by the picker, so every edit that did not touch the picker silently
   * rewrote the application's icon. The icon is a form value here, so it survives a round trip.
   */
  it('keeps the application"s own icon through an edit that never touches the picker', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);
    expect(iconInput(el).selectedOption).toBe('anchor');

    await press(el);
    expect(updated[0]).toMatchObject({ logo_uri: 'anchor' });
  });

  it('carries the two switches into the request body', async () => {
    const el = await mount({ initialValues: ADD_VALUES });
    await settle(el);

    for (const box of checkboxes(el)) {
      box.checked = !box.checked;
      box.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    }
    await settle(el);
    await press(el);

    expect(added[0]).toMatchObject({
      status: 'disabled',
      token_endpoint_auth_method: 'client_secret_basic',
    });
  });

  it('takes a new icon from the picker', async () => {
    const el = await mount({ initialValues: EDIT_VALUES });
    await settle(el);

    const picker = iconInput(el);
    picker.selectedOption = 'beach';
    picker.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    await settle(el);
    await press(el);

    expect(updated[0]).toMatchObject({ logo_uri: 'beach' });
  });

  /** #887: a double-clicked Save was two applications, because this path is a create. */
  it('saves once when the button is pressed twice in a row', async () => {
    const el = await mount({ initialValues: ADD_VALUES });
    await settle(el);

    submitButton(el).click();
    submitButton(el).click();
    await settle(el);

    expect(added).toHaveLength(1);
  });

  it('submits from the form, so Enter in a field reaches the same path', async () => {
    const el = await mount({ initialValues: ADD_VALUES });
    await settle(el);

    const form = el.shadowRoot!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(el);

    expect(added).toHaveLength(1);
  });

  // ---- scopes ------------------------------------------------------------------------------

  it('offers the schema scopes sorted, then the three built-ins', async () => {
    giveScopes('zulu', 'alpha');
    const el = await mount();
    await settle(el);

    expect(scopeInput(el).options).toEqual(['alpha', 'zulu', 'MAIL', '$DATA', '$DECRYPT']);
  });

  it('stops offering a scope once it has been chosen', async () => {
    giveScopes('alpha');
    const el = await mount({ initialValues: { ...EDIT_VALUES, appScope: 'alpha,MAIL' } });
    await settle(el);

    expect(scopeInput(el).options).toEqual(['$DATA', '$DECRYPT']);
  });

  it('adds what the scope box holds, and clears the box afterwards', async () => {
    const el = await mount();
    await settle(el);

    const box = scopeInput(el);
    box.selectedOption = '  MAIL  ';
    el.shadowRoot!.querySelector<HTMLElement>('.scope-field keep-button')!.click();
    await settle(el);

    expect(pills(el)).toEqual(['MAIL']);
    expect(box.selectedOption).toBe('');
  });

  it('refuses a blank scope and a duplicate', async () => {
    const el = await mount({ initialValues: { ...EDIT_VALUES, appScope: 'MAIL' } });
    await settle(el);

    const box = scopeInput(el);
    const add = el.shadowRoot!.querySelector<HTMLElement>('.scope-field keep-button')!;

    box.selectedOption = '   ';
    add.click();
    await settle(el);
    expect(pills(el)).toEqual(['MAIL']);

    box.selectedOption = 'MAIL';
    add.click();
    await settle(el);
    expect(pills(el)).toEqual(['MAIL']);
  });

  it('removes a scope, and the removal is a real button that names it', async () => {
    const el = await mount({ initialValues: { ...EDIT_VALUES, appScope: 'sales,MAIL' } });
    await settle(el);

    const remove = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.pill-remove'),
    );
    expect(remove.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON']);
    expect(remove.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remove sales',
      'Remove MAIL',
    ]);

    remove[0].click();
    await settle(el);
    expect(pills(el)).toEqual(['MAIL']);
  });

  /**
   * The React version only derived the pill list from the value when the context said Edit, and
   * from an expression that yields `false` rather than `[]` for an empty string — so editing an
   * application with no scopes put `false` into list state and the next membership test threw.
   */
  it('renders no pills for an edit of an application with no scopes', async () => {
    const el = await mount({ initialValues: { ...EDIT_VALUES, appScope: '' } });
    await settle(el);

    expect(pills(el)).toEqual([]);
    expect(scopeInput(el).options).toEqual(['MAIL', '$DATA', '$DECRYPT']);
  });

  it('saves the scopes comma-joined, because the API validates a string', async () => {
    const el = await mount();
    await settle(el);
    await fillValid(el);
    await type(el, 'Application Name', 'Orders');
    scopeInput(el).selectedOption = '$DATA';
    el.shadowRoot!.querySelector<HTMLElement>('.scope-field keep-button')!.click();
    await settle(el);
    await press(el);

    expect(added).toHaveLength(1);
    expect(added[0].scope).toBe('MAIL,$DATA');
  });

  // ---- accessibility ------------------------------------------------------------------------

  it('gives the plus button an accessible name', async () => {
    const el = await mount();
    const add = el.shadowRoot!.querySelector('.scope-field keep-button')!;
    expect(add.textContent!.trim()).toBe('Add scope');
  });

  it('labels the two checkboxes through the control, not a loose span', async () => {
    const el = await mount();
    expect(checkboxes(el).map((c) => c.textContent!.trim())).toEqual(['Active', 'Use PKCE']);
  });

  it('heads the panel with a heading element', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.form-header')!.tagName).toBe('H2');
  });

  // ---- closing -----------------------------------------------------------------------------

  it('the Close button toggles the drawer', async () => {
    const el = await mount();
    actionButtons(el)[0].click();
    await el.updateComplete;
    expect(store.getState().drawer.applicationDrawer).toBe(true);
  });
});
