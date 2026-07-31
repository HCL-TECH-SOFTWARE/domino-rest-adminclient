/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { addActiveFields, addNsfDesign } from '../../../src/store/databases/action';
import { setLoading } from '../../../src/store/loading/action';

/**
 * `keep-field-list` replaces `access/Fields.tsx`, which had no test of its own — nothing
 * from an old suite is being carried over or dropped here.
 *
 * The two thunks that reach the network are replaced. Everything else — the design list,
 * the fetched fields, the pending-form flag and the spinner — is seeded through the real
 * store, because the element reads all four through `StoreController` and the point is that
 * those reads work.
 */
const fetchFields = vi.hoisted(() => vi.fn(() => ({ type: 'test/fetchFields' })));
const getAllFieldsByNsf = vi.hoisted(() => vi.fn(() => ({ type: 'test/getAllFieldsByNsf' })));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  fetchFields,
  getAllFieldsByNsf,
}));

// Imported after the mock so the element under test picks the stubs up.
const { default: FieldListClass } = await import(
  '../../../src/components/keep-elements/keep-field-list'
);
type FieldList = InstanceType<typeof FieldListClass>;
type KeepFieldsAddDetail =
  import('../../../src/components/keep-elements/keep-field-list').KeepFieldsAddDetail;

const TAG = 'keep-field-list';

/**
 * In a directory on purpose (#978).
 *
 * This element holds one NSF path and used to read it two ways: `designs.value?.[nsfPath]` for
 * the design cache, which is keyed on the decoded path, and `fullEncode(nsfPath)` for the two
 * field thunks, which then interpolated that into a URL. Both readings agree for a flat name,
 * so with `demo.nsf` here every assertion below passed either way and the disagreement was
 * invisible. A `/` is the cheapest character that tells the two apart.
 */
const NSF = 'subdir/demo.nsf';
const SCHEMA = 'demo';
const FORM = 'Contact';

const field = (content: string) => ({ content, format: 'string', kind: '' });

/** The design list the Forms tab fetches, and this element reads back out of the store. */
const seedDesign = (forms: string[] = [FORM, 'Invoice'], subforms: string[] = ['Address']) => {
  store.dispatch(
    addNsfDesign(NSF, {
      forms: forms.map((name) => ({ '@name': name })),
      subforms: subforms.map((name) => ({ '@name': name })),
    }),
  );
};

const seedFields = async (formName: string, fields: Array<Record<string, unknown>>) => {
  await store.dispatch(addActiveFields(formName, fields) as never);
};

const mount = (props: Partial<FieldList> = {}) =>
  mountLit<FieldList>(TAG, { schemaName: SCHEMA, nsfPath: NSF, formName: FORM, ...props });

const select = (el: FieldList) => el.shadowRoot!.querySelector('wa-select')!;

const optionValues = (el: FieldList) =>
  [...select(el).querySelectorAll('wa-option')].map((option) => option.getAttribute('value'));

const optionLabels = (el: FieldList) =>
  [...select(el).querySelectorAll('wa-option')].map((option) => option.textContent?.trim());

const rows = (el: FieldList) => [...el.shadowRoot!.querySelectorAll('keep-single-field')];

const rowNames = (el: FieldList) =>
  rows(el).map((row) => (row as unknown as { item: { content: string } }).item.content);

const iconButtons = (el: FieldList) =>
  [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.icon-button')];

const listen = (el: FieldList, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

/** Type into the filter the way the shared search element reports it. */
const search = async (el: FieldList, value: string) => {
  el.shadowRoot!
    .querySelector('keep-search-input')!
    .dispatchEvent(
      new CustomEvent('search-change', { detail: { value }, bubbles: true, composed: true }),
    );
  await el.updateComplete;
};

/** Choose a form the way the picker reports it — one path for pointer and keyboard alike. */
const choose = async (el: FieldList, value: string) => {
  const control = select(el) as unknown as { value: string; dispatchEvent: (e: Event) => boolean };
  control.value = value;
  select(el).dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  await el.updateComplete;
};

describe('keep-field-list', () => {
  beforeEach(() => {
    store.dispatch({ type: 'INIT_STATE' });
    store.dispatch(setLoading({ status: false }));
    fetchFields.mockClear();
    getAllFieldsByNsf.mockClear();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: 'INIT_STATE' });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('offers all-fields first, then the forms, then the subforms', async () => {
    seedDesign();
    const el = await mount();
    expect(optionValues(el)).toEqual([
      'keep_internal_form_for_allFields',
      'Contact',
      'Invoice',
      '⚓Address',
    ]);
    // The sentinel is an API name, so it is never shown to a user.
    expect(optionLabels(el)[0]).toBe('All Fields');
    // The anchor is what tells a subform apart from a form of the same name.
    expect(optionLabels(el)[3]).toBe('⚓Address');
  });

  it('offers only all-fields when the design has never been fetched', async () => {
    const el = await mount();
    expect(optionValues(el)).toEqual(['keep_internal_form_for_allFields']);
  });

  it('starts on the form named in the route', async () => {
    seedDesign();
    const el = await mount();
    expect(el.currentFormValue).toBe('Contact');
  });

  it('says Not Selected when the NSF has no forms at all', async () => {
    seedDesign([], []);
    const el = await mount();
    expect(el.currentFormValue).toBe('Not Selected');
  });

  it('lists the fetched fields of the chosen form', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject'), field('Body')]);
    const el = await mount();
    expect(rowNames(el)).toEqual(['Subject', 'Body']);
  });

  it('hides the API internal items rather than offering them', async () => {
    seedDesign();
    await seedFields(FORM, [
      field('Subject'),
      field('@Formula'),
      field('~#internal'),
      field('FormulaOnLoad'),
    ]);
    const el = await mount();
    expect(rowNames(el)).toEqual(['Subject']);
  });

  it('shows a disabled placeholder when the form offers nothing', async () => {
    seedDesign();
    await seedFields(FORM, []);
    const el = await mount();
    expect(rowNames(el)).toEqual(['No Field Available']);
    expect(rows(el)[0].hasAttribute('disabled')).toBe(true);
  });

  it('names each row for the field it offers', async () => {
    // `name` is what the access screen keys an added field on, and the fetched shape only
    // has `content`. The spread order is load-bearing: a field that brought its own name
    // keeps it.
    seedDesign();
    await seedFields(FORM, [{ content: 'Subject', name: 'SubjectField' }, field('Body')]);
    const el = await mount();
    const items = rows(el).map((row) => (row as unknown as { item: { name: string } }).item.name);
    expect(items).toEqual(['SubjectField', 'Body']);
  });

  it('filters the rows by what is typed in the search box', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject'), field('Body'), field('SubBody')]);
    const el = await mount();
    await search(el, 'sub');
    expect(rowNames(el)).toEqual(['Subject', 'SubBody']);
  });

  it('keeps the longest prefix that still matched rather than emptying the list', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject'), field('Body')]);
    const el = await mount();
    await search(el, 'subzzz');
    expect(rowNames(el)).toEqual(['Subject']);
  });

  it('restores the full list when the search is cleared', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject'), field('Body')]);
    const el = await mount();
    await search(el, 'sub');
    await search(el, '');
    expect(rowNames(el)).toEqual(['Subject', 'Body']);
  });

  it('passes a row own add out as fields-add', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject')]);
    const el = await mount();
    const seen = listen(el, 'fields-add');

    rows(el)[0].dispatchEvent(
      new CustomEvent('field-add', {
        detail: { item: { content: 'Subject' } },
        bubbles: true,
        composed: true,
      }),
    );

    expect(seen).toHaveLength(1);
    expect((seen[0].detail as KeepFieldsAddDetail).items).toEqual([{ content: 'Subject' }]);
  });

  it('does not also let the row own event out, which would add the field twice', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject')]);
    const el = await mount();
    const raw = listen(el, 'field-add');

    rows(el)[0].dispatchEvent(
      new CustomEvent('field-add', {
        detail: { item: { content: 'Subject' } },
        bubbles: true,
        composed: true,
      }),
    );

    expect(raw).toHaveLength(0);
  });

  it('offers every selectable field at once from Add All Fields', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject'), field('@Internal'), field('Body')]);
    const el = await mount();
    const seen = listen(el, 'fields-add');

    iconButtons(el)[1].click();

    expect(seen).toHaveLength(1);
    const items = (seen[0].detail as KeepFieldsAddDetail).items;
    // Each carries the `name` the access screen keys on, taken from `content`.
    expect(items.map((item) => item.name)).toEqual(['Subject', 'Body']);
  });

  it('gives both icon controls a name and makes them real buttons', async () => {
    // They were divs styled as buttons with no accessible name, so neither was reachable
    // from the keyboard or announced (#713).
    seedDesign();
    const el = await mount();
    expect(iconButtons(el).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Refresh List of Fields',
      'Add All Fields',
    ]);
    expect(iconButtons(el)[0].tagName).toBe('BUTTON');
  });

  it('gives the picker and the filter accessible names of their own', async () => {
    seedDesign();
    const el = await mount();
    expect(select(el).getAttribute('label')).toBe('Show fields from');
    expect(el.shadowRoot!.querySelector('keep-search-input')!.getAttribute('label')).toBe(
      'Search Field',
    );
  });

  it('fetches the route form fields once it knows the design lists it', async () => {
    seedDesign();
    await mount();
    expect(fetchFields).toHaveBeenCalledWith(SCHEMA, NSF, FORM, FORM, 'forms');
  });

  it('falls back to every field in the NSF when the design does not list the form', async () => {
    seedDesign(['Invoice'], []);
    await mount();
    expect(getAllFieldsByNsf).toHaveBeenCalledWith(NSF);
    expect(fetchFields).not.toHaveBeenCalled();
  });

  it('fetches nothing before it has been told which NSF to look in', async () => {
    // The React bridge assigns properties after the element first renders, so the first
    // update runs with the defaults still in place.
    await mountLit<FieldList>(TAG);
    expect(fetchFields).not.toHaveBeenCalled();
    expect(getAllFieldsByNsf).not.toHaveBeenCalled();
  });

  it('does not fetch again for inputs it has already answered', async () => {
    seedDesign();
    const el = await mount();
    expect(fetchFields).toHaveBeenCalledTimes(1);
    // A store write the element subscribes to re-renders it; that must not re-fetch.
    await seedFields(FORM, [field('Subject')]);
    await el.updateComplete;
    expect(fetchFields).toHaveBeenCalledTimes(1);
  });

  it('fetches the newly picked form and shows its fields', async () => {
    // One change path, so this works for a keyboard user. The dropdown used to record the
    // choice on change and fetch from a per-item click, which only a pointer fires (#925).
    seedDesign();
    await seedFields(FORM, [field('Subject')]);
    await seedFields('Invoice', [field('Total')]);
    const el = await mount();

    await choose(el, 'Invoice');
    expect(el.currentFormValue).toBe('Invoice');
    expect(fetchFields).toHaveBeenLastCalledWith(SCHEMA, NSF, 'Invoice', 'Invoice', 'forms');
    expect(rowNames(el)).toEqual(['Total']);
  });

  it('asks for every field in the NSF when all-fields is picked', async () => {
    seedDesign();
    const el = await mount();
    await choose(el, 'keep_internal_form_for_allFields');
    expect(getAllFieldsByNsf).toHaveBeenCalledWith(NSF);
  });

  it('sends a subform its own design type, not the forms one', async () => {
    seedDesign();
    const el = await mount();
    await choose(el, '⚓Address');
    expect(fetchFields).toHaveBeenLastCalledWith(SCHEMA, NSF, 'Address', '⚓Address', 'subforms');
  });

  it('ignores a change naming a form that is not in the picker', async () => {
    seedDesign();
    const el = await mount();
    const before = el.currentFormValue;
    await choose(el, 'Nonexistent');
    expect(el.currentFormValue).toBe(before);
  });

  it('refetches the route form from the refresh control', async () => {
    seedDesign();
    const el = await mount();
    fetchFields.mockClear();
    iconButtons(el)[0].click();
    await el.updateComplete;
    expect(fetchFields).toHaveBeenCalledWith(SCHEMA, NSF, FORM, FORM, 'forms');
  });

  it('shows a spinner instead of the list while a fetch is in flight', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject')]);
    const el = await mount();
    expect(el.shadowRoot!.querySelector('wa-spinner')).toBeNull();

    store.dispatch(setLoading({ status: true }));
    await el.updateComplete;

    const spinner = el.shadowRoot!.querySelector('.loading')!;
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.textContent).toContain('Loading fields...');
    expect(rows(el)).toHaveLength(0);
  });

  it('stops listening to the store once it leaves the document', async () => {
    seedDesign();
    await seedFields(FORM, [field('Subject')]);
    const el = await mount();
    el.remove();
    // A controller that kept its subscription would re-render a detached element on every
    // store change for the rest of the session.
    store.dispatch(setLoading({ status: true }));
    expect(el.shadowRoot!.querySelector('wa-spinner')).toBeNull();
  });
});
