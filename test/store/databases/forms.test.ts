/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addForm,
  cacheFormFields,
  deleteForm,
  deleteFormMode,
  handleDatabaseForms,
  pullForms,
  saveNewForm,
  setCurrentForms,
  setFormName,
  setForms,
  updateFormMode,
} from '../../../src/store/databases/action';
import {
  ADD_FORM,
  ADD_NSF_DESIGN,
  CACHE_FORM_FIELDS,
  RESET_FORM,
  SET_CURRENTFORMS,
  SET_DB_ERROR,
  SET_FORM_NAME,
  SET_FORMS,
  UNCONFIG_FORM,
} from '../../../src/store/databases/types';
import { setApiLoading, toggleDeleteDialog } from '../../../src/store/dialog/action';
import { toggleAlert } from '../../../src/store/alerts/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #802 — the **forms** concern of `databases/action.ts`, first of three parts. This
 * one covers the destructive thunks, which #802 itself nominates as the natural
 * first cut: `deleteForm`, `deleteFormMode` and `saveNewForm`.
 *
 * The class worth naming here is the one #802 calls **success reported on failure**
 * — the `deleteConsent` shape, where a success action and a success alert are
 * dispatched without checking status. A delete falsely reported as done is the worst
 * of the defect classes, because the user stops checking.
 *
 * Both deletes are clean on it: each throws on `!response.ok` before reaching its
 * success alert. Asserted rather than assumed, since that is exactly what a later
 * refactor could quietly invert.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

/** Runs the thunks handed to it and tracks their promises. See #803. */
function makeDispatch(getState: () => any = () => ({})) {
  const recorded: any[] = [];
  const pending: Promise<unknown>[] = [];
  const dispatch: any = (action: any) => {
    recorded.push(action);
    if (typeof action !== 'function') return action;
    const result = action(dispatch, getState);
    if (result && typeof result.then === 'function') pending.push(result);
    return result;
  };
  dispatch.recorded = recorded;
  dispatch.settled = async () => {
    while (pending.length) await pending.shift();
  };
  return dispatch;
}

describe('databases — forms (destructive)', () => {
  let dispatch: ReturnType<typeof makeDispatch>;
  let previousLevel: number;

  const actions = () => dispatch.recorded.filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);
  const alerts = () =>
    actions().filter((a: any) => a?.type === toggleAlert.type).map((a: any) => a.payload as string);
  const loadingSequence = () =>
    actions().filter((a: any) => a?.type === setApiLoading.type).map((a: any) => a.payload);

  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no setApiLoading.type dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  const schemaData = {
    nsfPath: 'db.nsf',
    schemaName: 'demo',
    forms: [
      { formName: 'Order', alias: ['O'], formModes: [{ modeName: 'default' }, { modeName: 'admin' }] },
      { formName: 'Invoice', alias: [], formModes: [{ modeName: 'default' }] },
      // Dropped by the formModes.length filter both deletes apply first.
      { formName: 'Unconfigured', alias: [], formModes: [] },
    ],
  } as any;

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = makeDispatch();
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const offline = () =>
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'nope' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 400, body })));
  const refusesWithProse = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: { get: () => 'text/html' },
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      } as unknown as Response),
    );
  const returns = (body: unknown = {}) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body })));

  describe('deleteFormMode', () => {
    it('sends the schema without that mode, and reports it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteFormMode(schemaData, 'Order', 'admin', vi.fn())(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      const order = sent.forms.find((f: any) => f.formName === 'Order');
      expect(order.formModes.map((m: any) => m.modeName)).toEqual(['default']);
      expect(alerts().join()).toMatch(/admin mode has been deleted/i);
      expect(types()).toContain(toggleDeleteDialog.type);
      expectLoadingCleared();
    });

    it('leaves the other forms untouched', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteFormMode(schemaData, 'Order', 'admin', vi.fn())(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.forms.find((f: any) => f.formName === 'Invoice').formModes).toHaveLength(1);
      // The unconfigured form is filtered out before the request is built.
      expect(sent.forms.map((f: any) => f.formName)).toEqual(['Order', 'Invoice']);
    });

    it('hands the saved schema back to its caller', async () => {
      const setSchemaData = vi.fn();
      returns({ schemaName: 'demo', saved: true });

      await deleteFormMode(schemaData, 'Order', 'admin', setSchemaData)(dispatch);

      expect(setSchemaData).toHaveBeenCalledWith({ schemaName: 'demo', saved: true });
    });

    it('does not report a deletion the server refused', async () => {
      const setSchemaData = vi.fn();
      refuses({ message: 'schema locked' });

      await deleteFormMode(schemaData, 'Order', 'admin', setSchemaData)(dispatch);

      // The deleteConsent class: a delete reported as done when it was not.
      expect(alerts().join()).not.toMatch(/has been deleted/i);
      expect(alerts().join()).toMatch(/delete form mode failed/i);
      expect(setSchemaData).not.toHaveBeenCalled();
      expectLoadingCleared();
    });

    it('does not report a deletion when the request never completed', async () => {
      offline();

      await expect(deleteFormMode(schemaData, 'Order', 'admin', vi.fn())(dispatch)).resolves.not.toThrow();
      expect(alerts().join()).not.toMatch(/has been deleted/i);
      expectLoadingCleared();
    });

    it('tolerates a mode name that is not on the form', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteFormMode(schemaData, 'Order', 'nosuchmode', vi.fn())(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.forms.find((f: any) => f.formName === 'Order').formModes).toHaveLength(2);
    });

    it('clears the loading flag when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(deleteFormMode(schemaData, 'Order', 'admin', vi.fn())(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('deleteForm', () => {
    it('sends the schema without that form and unconfigures it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteForm(schemaData, 'Order', vi.fn())(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.forms.map((f: any) => f.formName)).toEqual(['Invoice']);
      expect(actions().find((a: any) => a?.type === UNCONFIG_FORM).payload).toEqual({
        schemaName: 'demo',
        formName: 'Order',
      });
      expectLoadingCleared();
    });

    it('says deactivated for a configured form and deleted for a custom one', async () => {
      returns(schemaData);
      await deleteForm(schemaData, 'Order', vi.fn())(dispatch);
      expect(alerts().join()).toMatch(/successfully deactivated form Order/i);

      dispatch = makeDispatch();
      returns(schemaData);
      await deleteForm(schemaData, 'Order', vi.fn(), true)(dispatch);
      expect(alerts().join()).toMatch(/successfully deleted form Order/i);
      expect(types()).toContain(RESET_FORM);
    });

    // `setSchemaData` is optional, but both the alert and the RESET_FORM dispatch sit
    // inside `if (setSchemaData)`. Called without it — which the signature permits —
    // the form is deleted and unconfigured, and the user is told nothing at all.
    it('says nothing when called without the optional callback', async () => {
      returns(schemaData);

      await deleteForm(schemaData, 'Order')(dispatch);

      expect(types()).toContain(UNCONFIG_FORM);
      expect(alerts()).toEqual([]);
    });

    it('does not report a deletion the server refused', async () => {
      const setSchemaData = vi.fn();
      refuses({ message: 'schema locked' });

      await deleteForm(schemaData, 'Order', setSchemaData)(dispatch);

      expect(alerts().join()).not.toMatch(/successfully/i);
      expect(alerts().join()).toMatch(/delete form failed/i);
      expect(types()).not.toContain(UNCONFIG_FORM);
      expect(setSchemaData).not.toHaveBeenCalled();
      expectLoadingCleared();
    });

    it('does not report a deletion when the request never completed', async () => {
      offline();

      await expect(deleteForm(schemaData, 'Order', vi.fn())(dispatch)).resolves.not.toThrow();
      expect(alerts().join()).not.toMatch(/successfully/i);
      expect(types()).not.toContain(UNCONFIG_FORM);
      expectLoadingCleared();
    });

    it('clears the loading flag when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(deleteForm(schemaData, 'Order', vi.fn())(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('saveNewForm', () => {
    const form = { formName: 'New Form', fields: [{ name: 'a' }] };

    it('PUTs the form and reports success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await saveNewForm(form, 'db.nsf')(dispatch);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ name: 'New Form', alias: '', fields: form.fields });
      expect(alerts().join()).toMatch(/new form schema created/i);
    });

    it('escapes the characters that would break the path, and only those', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await saveNewForm({ ...form, formName: 'Order/Sub (v2)' }, 'db.nsf')(dispatch);

      // fullEncode is deliberately partial: it escapes []!()*\/$&'# and nothing
      // else, because Domino design names carry those. A space is left raw and
      // fetch encodes it — worth pinning so the two halves stay in agreement.
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('Order%2fSub %28v2%29');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toBe('Order/Sub (v2)');
    });

    it('does not claim the form was created when the server refuses', async () => {
      refuses({ message: 'already exists' });

      await saveNewForm(form, 'db.nsf')(dispatch);

      expect(alerts()).toEqual([]);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(saveNewForm(form, 'db.nsf')(dispatch)).resolves.not.toThrow();
      expect(alerts()).toEqual([]);
    });

    it('does not throw out of the thunk when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(saveNewForm(form, 'db.nsf')(dispatch)).resolves.not.toThrow();
    });
  });
});

/**
 * #802 part 2 — the remaining forms thunks. Kept in this file rather than a new one
 * because #711 splits `databases/action.ts` into one module per concern, and all of
 * these land in `forms.ts` together.
 *
 * Two stranded loading flags found here, both fixed:
 *
 * - `pullForms` dispatches `setApiLoading(true)` and never clears it on **any** path,
 *   success included. Every other instance of this defect so far stranded only on
 *   failure.
 * - `updateForms`, which `handleDatabaseForms` delegates to, clears the flag on its
 *   success path only.
 */

describe('databases — forms', () => {
  let dispatch: ReturnType<typeof makeDispatch>;
  let previousLevel: number;

  const actions = () => dispatch.recorded.filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);
  const alerts = () =>
    actions().filter((a: any) => a?.type === toggleAlert.type).map((a: any) => a.payload as string);
  const loadingSequence = () =>
    actions().filter((a: any) => a?.type === setApiLoading.type).map((a: any) => a.payload);

  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no setApiLoading.type dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  const schemaData = {
    nsfPath: 'db.nsf',
    schemaName: 'demo',
    forms: [
      { formName: 'Order', alias: ['O'], formModes: [{ modeName: 'default' }] },
      { formName: 'Unconfigured', alias: [], formModes: [] },
    ],
  } as any;

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = makeDispatch();
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const offline = () =>
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'nope' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 400, body })));
  const returns = (body: unknown = {}) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body })));

  describe('plain dispatchers', () => {
    it('setForms carries the database and its forms', async () => {
      await setForms('demo', [{ formName: 'Order' }])(dispatch);
      expect(actions()[0]).toEqual({
        type: SET_FORMS,
        payload: { db: 'demo', forms: [{ formName: 'Order' }] },
      });
    });

    it('setCurrentForms carries the database and its forms', async () => {
      await setCurrentForms('demo', [{ formName: 'Order' }])(dispatch);
      expect(actions()[0].type).toBe(SET_CURRENTFORMS);
    });

    it('setFormName carries the name', async () => {
      await setFormName('Order')(dispatch);
      expect(actions()[0]).toEqual({ type: SET_FORM_NAME, payload: 'Order' });
    });

    it('cacheFormFields carries the database, form and fields', async () => {
      await cacheFormFields('demo', 'Order', [{ name: 'a' }])(dispatch);
      expect(actions()[0]).toEqual({
        type: CACHE_FORM_FIELDS,
        payload: { db: 'demo', formName: 'Order', fields: [{ name: 'a' }] },
      });
    });

    it('addForm carries the form when enabling, and drops it when disabling', async () => {
      const form = { dbName: 'demo', formName: 'New', alias: [], formModes: [], formAccessModes: [] };
      await addForm(true, form)(dispatch);
      expect(actions()[0]).toEqual({ type: ADD_FORM, payload: { enabled: true, form } });

      dispatch = makeDispatch();
      await addForm(false, form)(dispatch);
      // The form is deliberately omitted on the disabling branch.
      expect(actions()[0]).toEqual({ type: ADD_FORM, payload: { enabled: false } });
    });
  });

  describe('pullForms', () => {
    it('stores the design list and clears the loading flag', async () => {
      returns({ forms: [{ '@name': 'Order' }] });

      await pullForms('db.nsf', 'demo', vi.fn())(dispatch);

      expect(types()).toContain(ADD_NSF_DESIGN);
      // setApiLoading(true) went out on entry and nothing ever cleared it — on any
      // path, success included. Eight screens read state.dialog.loading.
      expectLoadingCleared();
    });

    it('reports the failure and clears the loading flag', async () => {
      refuses({ message: 'no such database' });

      await pullForms('db.nsf', 'demo', vi.fn())(dispatch);

      expect(types()).toContain(SET_DB_ERROR);
      expect(types()).not.toContain(ADD_NSF_DESIGN);
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      await expect(pullForms('db.nsf', 'demo', vi.fn())(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('handleDatabaseForms', () => {
    it('gives an unconfigured form a default mode before saving', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await handleDatabaseForms(schemaData, 'demo', schemaData.forms, vi.fn(), 'Saved!')(dispatch);
      await dispatch.settled();

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      const added = sent.forms.find((f: any) => f.formName === 'Unconfigured');
      expect(added.formModes).toHaveLength(1);
      expect(added.formModes[0].modeName).toBe('default');
      expect(added.formModes[0].readAccessFormula).toEqual({ formulaType: 'domino', formula: '@True' });
      expect(added.formModes[0].deleteAccessFormula.formula).toBe('@False');
    });

    it('leaves an already-configured form alone', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await handleDatabaseForms(schemaData, 'demo', schemaData.forms, vi.fn(), 'Saved!')(dispatch);
      await dispatch.settled();

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.forms.find((f: any) => f.formName === 'Order').formModes).toEqual([
        { modeName: 'default' },
      ]);
    });

    it('reports the caller-supplied success message and runs the callback', async () => {
      const successCallback = vi.fn();
      returns(schemaData);

      await handleDatabaseForms(
        schemaData, 'demo', schemaData.forms, vi.fn(), 'Forms saved!', successCallback,
      )(dispatch);
      await dispatch.settled();

      expect(alerts()).toContain('Forms saved!');
      expect(successCallback).toHaveBeenCalled();
      expectLoadingCleared();
    });

    it('does not report success, and clears the flag, when the save is refused', async () => {
      refuses({ message: 'schema locked' });

      await handleDatabaseForms(schemaData, 'demo', schemaData.forms, vi.fn(), 'Forms saved!')(dispatch);
      await dispatch.settled();

      expect(alerts()).not.toContain('Forms saved!');
      expect(alerts().join()).toMatch(/update forms failed/i);
      // setApiLoading(false) sat on the success path only.
      expectLoadingCleared();
    });

    it('clears the flag when the request never completes', async () => {
      offline();

      await handleDatabaseForms(schemaData, 'demo', schemaData.forms, vi.fn(), 'Forms saved!')(dispatch);
      await dispatch.settled();

      expect(alerts()).not.toContain('Forms saved!');
      expectLoadingCleared();
    });
  });

  describe('updateFormMode', () => {
    const mode = { modeName: 'admin', fields: [], computeWithForm: false };

    it('adds the mode to the form and reports it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);

      await updateFormMode(schemaData, 'Order', ['O'], mode, 0, false, vi.fn())(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      const order = sent.forms.find((f: any) => f.formName === 'Order');
      expect(order.formModes.map((m: any) => m.modeName)).toContain('admin');
      expect(alerts().join()).toMatch(/successfully/i);
      expectLoadingCleared();
    });

    it('does not report success when the save is refused', async () => {
      refuses({ message: 'schema locked' });

      await updateFormMode(schemaData, 'Order', ['O'], mode, 0, false, vi.fn())(dispatch);

      expect(alerts().join()).not.toMatch(/successfully/i);
      expectLoadingCleared();
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(
        updateFormMode(schemaData, 'Order', ['O'], mode, 0, false, vi.fn())(dispatch),
      ).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });
});
