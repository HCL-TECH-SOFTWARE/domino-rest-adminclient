/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { INIT_STATE } from '../../../src/store/databases/types';
import { addForm, addNsfDesign } from '../../../src/store/databases/reducer';
import { setApiLoading } from '../../../src/store/dialog/reducer';
import { setAccessFields } from '../../../src/store/accessMode/action';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import '../../../src/components/keep-elements/keep-access-mode';
import type AccessMode from '../../../src/components/keep-elements/keep-access-mode';

/**
 * #928 — the Access Mode screen blank-screened on direct navigation or F5.
 *
 * Every case below is a *cold load*: the route reached without the schema's Forms tab having
 * run first. That tab is a sibling route, not a parent, so nothing it fetched is in the
 * store, and the screen was reading four optional shapes without guards:
 *
 *  - `nsfDesigns[nsfPath]` — absent, so `currentDesign?.forms` was `undefined` and
 *    `fetchFieldsArray.length` threw in the render body.
 *  - the form list — the mode seed tested whether the *list* had entries and then read
 *    `formModes` off `filter(…)[0]`, which is `undefined` when nothing matches.
 *  - the matched form — it can arrive with `formAccessModes` and no `formModes` key.
 *  - the mode named `default` — `findIndex(…) || 0` keeps -1, because -1 is truthy.
 *
 * There is no error boundary above this route, so any one of them blanked the whole app.
 * The last case is the one that keeps the others honest: returning an empty list
 * unconditionally would satisfy every "does not blank-screen" assertion.
 */

/**
 * The schema `fetchSchema` hands back, and how many times it was asked for. Reassigned per
 * test, read inside the mock.
 */
const fixture = vi.hoisted(() => ({ schema: { forms: [] as any[] }, fetches: 0 }));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  // Synchronous, so the "schema has arrived" render is the one under test rather than
  // something a test has to wait for.
  fetchSchema: (_nsfPath: string, _dbName: string, setSchemaData: (data: any) => void) => {
    fixture.fetches += 1;
    setSchemaData(fixture.schema);
    return { type: 'NOOP' };
  },
  // The field palette asks the server for a design list it cannot find. Stubbed to keep a
  // failed fetch out of the output; what it fetches is `keep-field-list`'s own test.
  fetchFields: () => ({ type: 'NOOP' }),
  getAllFieldsByNsf: () => ({ type: 'NOOP' }),
}));

const TAG = 'keep-access-mode';

const ROUTE = '/schema/nsf%2Fdemo.nsf/demo/Contact/access';
const NSF_PATH = 'nsf/demo.nsf';

/** The design list the Forms tab would have put in the store. */
const DESIGN = { forms: [{ '@name': 'Contact' }], subforms: [] };

const mode = (modeName: string, fields: any[] = [{ name: 'FirstName' }]) => ({
  modeName,
  fields,
  computeWithForm: false,
  required: [],
  validationRules: [],
});

/**
 * Put the app's router at `entry` for this test (#926).
 *
 * The screen reads its three route names through a `RouterController` over the module
 * singleton now, so a route is installed rather than passed in as a property.
 */
const atRoute = (entry = ROUTE) =>
  setRouterForTest(new Router({ history: memoryHistory([entry]) }));

const pageLoading = (el: AccessMode) => el.shadowRoot!.querySelector('keep-page-loading');
const fieldList = (el: AccessMode) => el.shadowRoot!.querySelector('keep-field-list');
const modeCompare = (el: AccessMode) =>
  el.shadowRoot!.querySelector('keep-mode-compare') as (HTMLElement & { open: boolean }) | null;
const tabs = (el: AccessMode) =>
  el.shadowRoot!.querySelector('keep-access-tabs') as
    | (HTMLElement & Record<string, any>)
    | null;

/** Fields as the store holds them for the one column the screen uses. */
const columnFields = () => {
  const map = store.getState().accessMode.fields;
  return map[Object.keys(map)[0]] ?? [];
};

/** Give the NSF a design list, which is what takes the screen off its loading state. */
const giveDesign = () =>
  store.dispatch(addNsfDesign({ nsfPath: NSF_PATH, nsfDesign: DESIGN }));

describe('keep-access-mode', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    fixture.schema = { forms: [] };
    fixture.fetches = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const mount = (props: Partial<AccessMode> = {}) => {
    atRoute();
    return mountLit<AccessMode>(TAG, props as Partial<AccessMode>);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('cold loads that used to blank the app (#928)', () => {
    it('renders a loading state when the NSF design has never been fetched', async () => {
      const el = await mount();
      expect(pageLoading(el)).toBeTruthy();
      expect(fieldList(el)).toBeNull();
    });

    it('survives a pending new form that is not the one in the URL', async () => {
      store.dispatch(
        addForm({
          enabled: true,
          form: { formName: 'Invoice', formModes: [mode('default')] },
        }),
      );
      const el = await mount();
      expect(pageLoading(el)).toBeTruthy();
    });

    it('survives a form that carries formAccessModes and no formModes key', async () => {
      // `formModes` is a client-side normalisation the Forms tab applies; the schema this
      // screen fetches for itself does not always have it.
      fixture.schema = {
        forms: [{ formName: 'Contact', formAccessModes: [mode('default')] }],
      };
      giveDesign();
      const el = await mount();
      expect(fieldList(el)).toBeTruthy();
      expect(modeCompare(el)).toBeNull();
    });

    it('survives a schema that does not contain the form in the URL', async () => {
      fixture.schema = { forms: [{ formName: 'Invoice', formModes: [mode('default')] }] };
      giveDesign();
      const el = await mount();
      expect(fieldList(el)).toBeTruthy();
      expect(modeCompare(el)).toBeNull();
    });

    it('survives a form whose modes do not include one named default', async () => {
      // `findIndex(…) || 0` kept -1, so `allModes[-1].fields` threw for any form whose
      // default mode had been renamed or removed.
      fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('draft')] }] };
      giveDesign();
      const el = await mount();
      expect(modeCompare(el)).toBeTruthy();
      expect(tabs(el)).toBeTruthy();
    });

    it('still finds the modes when the schema does contain the form', async () => {
      // The counterweight: an unconditional empty list would pass every case above.
      fixture.schema = {
        forms: [{ formName: 'Contact', formModes: [mode('default'), mode('draft')] }],
      };
      giveDesign();
      const el = await mount();
      expect(modeCompare(el)).toBeTruthy();
      expect(tabs(el)).toBeTruthy();
      expect(tabs(el)!.modes).toHaveLength(2);
    });

    /*
     * Was "does not blank when there is no router at all", which pinned the nullable `router`
     * property's guard. The property is gone (#926) and the controller always has a router, so
     * the surviving hazard is a router pointing somewhere this screen does not match: the
     * three route names are then empty, and the screen must show its loading state rather than
     * fetch a schema called nothing. `setupTests.ts` leaves every test at `/`.
     */
    it('does not blank, and fetches nothing, when the URL is not this route', async () => {
      const el = await mountLit<AccessMode>(TAG);
      expect(pageLoading(el)).toBeTruthy();
      expect(fixture.fetches).toBe(0);
    });
  });

  describe('choosing which mode to show', () => {
    const withModes = (...names: string[]) => {
      fixture.schema = {
        forms: [{ formName: 'Contact', formModes: names.map((name) => mode(name)) }],
      };
      giveDesign();
    };

    it('opens on the mode named default', async () => {
      withModes('draft', 'default', 'archive');
      const el = await mount();
      expect(tabs(el)!.currentModeIndex).toBe(1);
    });

    it('opens on the first mode when there is none named default', async () => {
      withModes('draft', 'archive');
      const el = await mount();
      expect(tabs(el)!.currentModeIndex).toBe(0);
    });

    it('decorates the chosen mode fields with an id and a display name', async () => {
      withModes('default');
      await mount();
      expect(columnFields()).toHaveLength(1);
      expect(columnFields()[0]).toMatchObject({ name: 'FirstName', content: 'FirstName' });
      expect(columnFields()[0].id).toEqual(expect.any(String));
    });

    it('clears the shared field map left behind by the previous form', async () => {
      store.dispatch(setAccessFields({ stale: [{ name: 'FromAnotherForm' }] }));
      await mount();
      expect(
        Object.values(store.getState().accessMode.fields).flat(),
      ).not.toContainEqual(expect.objectContaining({ name: 'FromAnotherForm' }));
    });
  });

  describe('the editor and the loading state', () => {
    beforeEach(() => {
      fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('default')] }] };
      giveDesign();
    });

    it('shows a contained spinner instead of the editor while a write is in flight', async () => {
      store.dispatch(setApiLoading(true));
      const el = await mount();
      expect(tabs(el)).toBeNull();
      const spinner = el.shadowRoot!.querySelector('keep-page-loading');
      expect(spinner!.hasAttribute('contained')).toBe(true);
    });

    it('hands the editor the route names, the schema and the field map', async () => {
      const el = await mount();
      expect(tabs(el)!.nsfPath).toBe(NSF_PATH);
      expect(tabs(el)!.schemaName).toBe('demo');
      expect(tabs(el)!.formName).toBe('Contact');
      expect(tabs(el)!.schemaData).toBe(fixture.schema);
      expect(tabs(el)!.state).toBe(store.getState().accessMode.fields);
    });

    it('shows the field palette above the narrow breakpoint', async () => {
      const el = await mount();
      expect(fieldList(el)).toBeTruthy();
    });

    it('hides the field palette below it, and puts it back when the window grows', async () => {
      const listeners = new Set<(event: MediaQueryListEvent) => void>();
      const original = window.matchMedia;
      window.matchMedia = ((query: string) =>
        ({
          matches: true,
          media: query,
          addEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) =>
            listeners.add(fn),
          removeEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) =>
            listeners.delete(fn),
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
      try {
        const el = await mount();
        expect(fieldList(el)).toBeNull();
        // The element listens rather than re-reading, so the event is the whole contract.
        for (const fn of listeners) fn({ matches: false } as MediaQueryListEvent);
        await el.updateComplete;
        expect(fieldList(el)).toBeTruthy();
      } finally {
        window.matchMedia = original;
      }
    });
  });

  describe('edits coming back from the editor', () => {
    beforeEach(() => {
      fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('default')] }] };
      giveDesign();
    });

    const fire = (el: AccessMode, type: string, detail: unknown) =>
      tabs(el)!.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

    it('removes the ticked fields, matching on id or display name', async () => {
      const el = await mount();
      const [existing] = columnFields();
      fire(el, 'fields-remove', { fields: [existing] });
      await el.updateComplete;
      expect(columnFields()).toHaveLength(0);
    });

    it('replaces one field with the edited copy', async () => {
      const el = await mount();
      const key = Object.keys(store.getState().accessMode.fields)[0];
      fire(el, 'field-update', {
        itemIndex: 0,
        droppableIndex: key,
        item: { name: 'FirstName', fieldAccess: 'RO' },
      });
      await el.updateComplete;
      expect(columnFields()[0]).toMatchObject({ fieldAccess: 'RO' });
    });

    it('ignores a field update aimed at a column that is not there', async () => {
      const el = await mount();
      fire(el, 'field-update', { itemIndex: 0, droppableIndex: 'gone', item: { name: 'X' } });
      await el.updateComplete;
      expect(columnFields()[0]).toMatchObject({ name: 'FirstName' });
    });

    it('tracks which field is selected', async () => {
      const el = await mount();
      fire(el, 'field-index-change', { fieldIndex: 3 });
      await el.updateComplete;
      expect(tabs(el)!.fieldIndex).toBe(3);
    });

    it('tracks which mode is being edited', async () => {
      const el = await mount();
      fire(el, 'mode-index-change', { index: 0 });
      await el.updateComplete;
      expect(tabs(el)!.currentModeIndex).toBe(0);
    });

    it('reseeds the field map, with a fresh mode list, on a page-index change', async () => {
      const el = await mount();
      const before = tabs(el)!.modes;
      // Drop a field so the reseed has something to put back.
      fire(el, 'fields-remove', { fields: columnFields() });
      await el.updateComplete;
      expect(columnFields()).toHaveLength(0);

      fire(el, 'page-index-change', { index: 0 });
      await el.updateComplete;
      expect(columnFields()).toHaveLength(1);
      // A new array identity is what tells the editor to re-read the mode.
      expect(tabs(el)!.modes).not.toBe(before);
    });

    it('ignores a page-index change for a mode that is not there', async () => {
      const el = await mount();
      fire(el, 'page-index-change', { index: 9 });
      await el.updateComplete;
      expect(columnFields()).toHaveLength(1);
    });

    it('takes the schema the editor saved', async () => {
      const el = await mount();
      const saved = { forms: [{ formName: 'Contact', formModes: [mode('default'), mode('x')] }] };
      fire(el, 'schema-data-change', { schemaData: saved });
      await el.updateComplete;
      expect(tabs(el)!.schemaData).toBe(saved);
      expect(tabs(el)!.modes).toHaveLength(2);
    });

    it('holds a post-save intent for the editor that replaces this one', async () => {
      const el = await mount();
      fire(el, 'post-save-action', { action: 'clone' });
      await el.updateComplete;
      expect(tabs(el)!.postSaveAction).toBe('clone');

      fire(el, 'post-save-action', { action: null });
      await el.updateComplete;
      expect(tabs(el)!.postSaveAction).toBeNull();
    });
  });

  describe('adding fields', () => {
    beforeEach(() => {
      fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('default')] }] };
      giveDesign();
    });

    it('appends the fields picked in the palette', async () => {
      const el = await mount();
      fieldList(el)!.dispatchEvent(
        new CustomEvent('fields-add', {
          detail: { items: [{ name: 'Surname', content: 'Surname' }] },
          bubbles: true,
          composed: true,
        }),
      );
      await el.updateComplete;
      expect(columnFields().map((field) => field.name)).toEqual(['FirstName', 'Surname']);
    });

    it('skips a picked field the mode already shows', async () => {
      const el = await mount();
      fieldList(el)!.dispatchEvent(
        new CustomEvent('fields-add', {
          detail: { items: [{ name: 'FirstName', content: 'FirstName' }] },
          bubbles: true,
          composed: true,
        }),
      );
      await el.updateComplete;
      expect(columnFields()).toHaveLength(1);
    });

    it('adds a custom field and answers with an empty string', async () => {
      const el = await mount();
      expect(tabs(el)!.addField('read', { name: 'Custom', content: 'Custom' })).toBe('');
      await el.updateComplete;
      expect(columnFields().map((field) => field.name)).toEqual(['FirstName', 'Custom']);
    });

    it('refuses a custom field the mode already has, and says why', async () => {
      const el = await mount();
      expect(tabs(el)!.addField('read', { name: 'FirstName' })).toBe(
        'The name already exists.',
      );
      await el.updateComplete;
      expect(columnFields()).toHaveLength(1);
    });

    it('binds addField to this screen, not to the element that calls it', async () => {
      // `keep-mode-fields` invokes it from its own template, so an unbound method would run
      // with `this` pointing at that element and write the field onto it instead.
      const el = await mount();
      const detached = tabs(el)!.addField;
      expect(detached('read', { name: 'Detached' })).toBe('');
      await el.updateComplete;
      expect(columnFields().map((field) => field.name)).toContain('Detached');
    });
  });

  describe('the mode-comparison dialog', () => {
    beforeEach(() => {
      fixture.schema = {
        forms: [{ formName: 'Contact', formModes: [mode('default'), mode('draft')] }],
      };
      giveDesign();
    });

    it('starts closed and opens from the header button', async () => {
      const el = await mount();
      expect(modeCompare(el)!.open).toBe(false);
      const button = el.shadowRoot!.querySelector('keep-button') as HTMLElement;
      button.click();
      await el.updateComplete;
      expect(modeCompare(el)!.open).toBe(true);
    });

    it('closes again when the dialog reports its own close', async () => {
      const el = await mount();
      (el.shadowRoot!.querySelector('keep-button') as HTMLElement).click();
      await el.updateComplete;
      modeCompare(el)!.dispatchEvent(
        new CustomEvent('dialog-close', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(modeCompare(el)!.open).toBe(false);
    });

    it('disables the button when there is only one mode to compare', async () => {
      fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('default')] }] };
      const el = await mount();
      const button = el.shadowRoot!.querySelector('keep-button') as HTMLElement & {
        disabled: boolean;
      };
      expect(button.disabled).toBe(true);
    });

    it('is not rendered at all while a brand-new form is being built', async () => {
      store.dispatch(addForm({ enabled: true }));
      const el = await mount();
      expect(modeCompare(el)).toBeNull();
    });
  });

  it('always renders the network error dialog', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('keep-network-error-dialog')).toBeTruthy();
  });
});
