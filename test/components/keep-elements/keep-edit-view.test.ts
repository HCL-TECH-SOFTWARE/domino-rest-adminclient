/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { INIT_STATE } from '../../../src/store/databases/types';
import { setFolders } from '../../../src/store/databases/reducer';
import { setLoading } from '../../../src/store/loading/action';
import * as databasesActions from '../../../src/store/databases/action';
import { apiRequestWithRetry, type ApiResult } from '../../../src/utils/api-retry';
import '../../../src/components/keep-elements/keep-edit-view';
import type EditView from '../../../src/components/keep-elements/keep-edit-view';
import type ColumnDetails from '../../../src/components/keep-elements/keep-column-details';

/**
 * The element test for what used to be `forms/EditView.tsx`.
 *
 * Every assertion its `@testing-library/react` suite made has a home here, read out of the
 * shadow root instead of the document. Three of them are now closer to the thing they were
 * about: the column pane is the real `keep-column-details` rather than a stand-in, so
 * removing a column goes through that element's own delete button; the unsaved-changes
 * dialog is the real element, so "shown" is its `open` property rather than the presence of
 * some text; and closing is watched as the `dialog-close` event rather than inferred from a
 * callback prop.
 *
 * The store slices the element reads — `loading` and `databases.folders` — arrive through
 * `StoreController`, so these tests drive the real store.
 */

vi.mock('../../../src/store/databases/action', () => ({
  fetchViews: vi.fn(() => ({ type: 'NOOP' })),
  updateSchema: vi.fn(() => ({ type: 'NOOP' }))
}));

vi.mock('../../../src/utils/api-retry', () => ({
  apiRequestWithRetry: vi.fn()
}));

/** 221 KB of base64 that nothing here renders; the element only warms the chunk. */
vi.mock('../../../src/styles/app-icons', () => ({ default: {} }));

const TAG = 'keep-edit-view';

/** The element only reads `response.ok` and `data`; the rest is the shape of the contract. */
const apiOk = (data: unknown): ApiResult => ({
  success: true,
  response: { ok: true } as Response,
  data,
  error: null
});

const apiNotOk = (data: unknown): ApiResult => ({
  success: false,
  response: { ok: false } as Response,
  data,
  error: new Error('request failed')
});

const DESIGN = {
  '@unid': 'metadata-is-skipped',
  Col1: { title: 'Column 1', position: 1 },
  Col2: { title: 'Column 2', position: 2 },
  Col3: { title: 'Column 3', position: 3 }
};

const defaultColumns = [
  { name: 'Col1', externalName: 'Col1_ext' },
  { name: 'Col2', externalName: 'Col2_ext' }
];

function makeSchemaData(viewColumns?: any[]): any {
  return {
    apiName: 'testapi',
    description: 'Test DB',
    nsfPath: 'test.nsf',
    iconName: 'beach',
    dqlAccess: false,
    openAccess: false,
    allowCode: false,
    allowDecryption: false,
    formulaEngine: 'default',
    dqlFormula: null,
    requireRevisionToUpdate: false,
    icon: 'beach-icon',
    isActive: 'true',
    forms: [],
    agents: [],
    // Both are here because the save payload used to hardcode them away (#932).
    owners: ['someone'],
    excludedViews: ['HiddenView'],
    views: [
      {
        name: 'TestView',
        alias: [],
        unid: 'unid-1',
        ...(viewColumns ? { columns: viewColumns } : {})
      }
    ]
  };
}

const mount = (props: Partial<EditView> = {}) =>
  mountLit<EditView>(TAG, {
    open: true,
    viewName: 'TestView',
    dbName: 'testdb',
    nsfPathProp: 'test.nsf',
    scopes: [],
    schemaData: makeSchemaData(defaultColumns),
    ...props
  } as Partial<EditView>);

/** Drain the design fetch and every update it schedules. */
async function flush(el: EditView): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

const shadow = (el: EditView) => el.shadowRoot!;

const closeButton = (el: EditView) => shadow(el).querySelector<HTMLButtonElement>('.close-button')!;

const saveButton = (el: EditView) => shadow(el).querySelector<HTMLButtonElement>('.save-button')!;

const resetButton = (el: EditView) => shadow(el).querySelector<HTMLButtonElement>('.reset-button')!;

const addAllButton = (el: EditView) => shadow(el).querySelector<HTMLButtonElement>('.add-all')!;

const dirtyDialog = (el: EditView) =>
  shadow(el).querySelector('keep-unsaved-changes-dialog') as HTMLElement & { open: boolean };

const details = (el: EditView) => shadow(el).querySelector('keep-column-details') as ColumnDetails;

const designButtons = (el: EditView) =>
  Array.from(shadow(el).querySelectorAll<HTMLButtonElement>('.column-button'));

const designButtonFor = (el: EditView, name: string) =>
  designButtons(el).find((button) => button.querySelector('.column-name')?.textContent === name)!;

/** Records `dialog-close`, so "emitted nothing" is assertable rather than assumed. */
function listenClose(el: EditView): Event[] {
  const calls: Event[] = [];
  el.addEventListener('dialog-close', (event) => calls.push(event));
  return calls;
}

/** Remove a column through the real pane's own delete control. */
async function removeColumn(el: EditView, name: string): Promise<void> {
  const pane = details(el);
  await pane.updateComplete;
  pane.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[aria-label="Remove column ${name}"]`
  )!.click();
  await el.updateComplete;
}

/** Edit an external name. The pane raises this from its field's input event. */
async function editColumn(el: EditView, name: string, externalName: string): Promise<void> {
  const pane = details(el);
  await pane.updateComplete;
  const column = pane.columns.find((entry) => entry.name === name)!;
  pane.dispatchEvent(
    new CustomEvent('column-edit', {
      detail: { column, externalName },
      bubbles: true,
      composed: true
    })
  );
  await el.updateComplete;
}

const fireDirtyDialog = async (el: EditView, type: string): Promise<void> => {
  dirtyDialog(el).dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
  await el.updateComplete;
};

describe('keep-edit-view', () => {
  const reset = () => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(setLoading({ status: false }));
  };

  beforeEach(() => {
    reset();
    vi.mocked(apiRequestWithRetry).mockReset();
    vi.mocked(apiRequestWithRetry).mockResolvedValue(apiOk(DESIGN));
    vi.mocked(databasesActions.updateSchema).mockClear();
    vi.mocked(databasesActions.fetchViews).mockClear();
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(() => {});
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(() => {});
    // apiRequestWithRetry is mocked, so nothing calls this unless a test runs the request
    // factory by hand to read the URL the element built.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  });

  afterEach(() => {
    cleanupLit();
    vi.restoreAllMocks();
    reset();
  });

  describe('structure', () => {
    it('names the dialog after the view it edits', async () => {
      const el = await mount();
      await flush(el);

      const dialog = shadow(el).querySelector('dialog.edit-dialog')!;
      expect(dialog.getAttribute('aria-label')).toBe('Edit TestView Columns');
      expect(shadow(el).querySelector('.title')!.textContent).toBe('Edit TestView Columns');
    });

    it('lists every fetched column and skips the metadata keys', async () => {
      const el = await mount();
      await flush(el);

      expect(designButtons(el).map((button) => button.querySelector('.column-name')!.textContent))
        .toEqual(['Col1', 'Col2', 'Col3']);
    });

    it('shows the position and title of each column', async () => {
      const el = await mount();
      await flush(el);

      const details = Array.from(
        designButtonFor(el, 'Col1').querySelectorAll('.column-detail')
      ).map((node) => node.textContent);
      expect(details).toEqual(['Column Position 1', 'Title: Column 1']);
    });

    it('omits the title line for a column that has none', async () => {
      vi.mocked(apiRequestWithRetry).mockResolvedValue(apiOk({ Bare: { position: 7 } }));
      const el = await mount({ schemaData: makeSchemaData(undefined) });
      await flush(el);

      const lines = Array.from(
        designButtonFor(el, 'Bare').querySelectorAll('.column-detail')
      ).map((node) => node.textContent);
      expect(lines).toEqual(['Column Position 7']);
    });

    it('marks the columns already chosen and leaves the rest offering to add', async () => {
      const el = await mount();
      await flush(el);

      expect(designButtonFor(el, 'Col1').classList.contains('added')).toBe(true);
      expect(designButtonFor(el, 'Col1').getAttribute('aria-label')).toBe(
        'Column Col1 is already added'
      );
      expect(designButtonFor(el, 'Col1').getAttribute('aria-disabled')).toBe('true');
      expect(designButtonFor(el, 'Col1').querySelector('.check-icon')).not.toBeNull();

      expect(designButtonFor(el, 'Col3').classList.contains('added')).toBe(false);
      expect(designButtonFor(el, 'Col3').getAttribute('aria-label')).toBe('Add column Col3');
      expect(designButtonFor(el, 'Col3').hasAttribute('aria-disabled')).toBe(false);
      expect(designButtonFor(el, 'Col3').querySelector('.add-icon')).not.toBeNull();
    });

    it('hands the chosen columns to the column pane', async () => {
      const el = await mount();
      await flush(el);

      expect(details(el).columns.map((column) => column.name)).toEqual(['Col1', 'Col2']);
    });

    it('shows the loading state instead of the list while the design is in flight', async () => {
      // Held open deliberately: with an already-resolved request the two states are one
      // microtask apart and the loading half is unobservable.
      let land: (value: ApiResult) => void = () => {};
      vi.mocked(apiRequestWithRetry).mockReturnValue(
        new Promise<ApiResult>((resolve) => {
          land = resolve;
        })
      );

      const el = await mount();

      expect(shadow(el).querySelector('keep-page-loading')).not.toBeNull();
      expect(shadow(el).querySelector('.column-list')).toBeNull();

      land(apiOk(DESIGN));
      await flush(el);

      expect(shadow(el).querySelector('keep-page-loading')).toBeNull();
      expect(shadow(el).querySelector('.column-list')).not.toBeNull();
    });
  });

  describe('the design lookup', () => {
    it('asks the views endpoint for a view', async () => {
      const el = await mount();
      await flush(el);

      vi.mocked(apiRequestWithRetry).mock.calls[0][0]();
      expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/design/views/TestView');
    });

    it('asks the folders endpoint when the view is really a folder', async () => {
      store.dispatch(setFolders({ folders: [{ viewName: 'TestView' }] }));
      const el = await mount();
      await flush(el);

      vi.mocked(apiRequestWithRetry).mock.calls[0][0]();
      expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/design/folders/TestView');
    });

    it('does not fetch while the dialog is closed', async () => {
      const el = await mount({ open: false });
      await flush(el);

      expect(apiRequestWithRetry).not.toHaveBeenCalled();
      expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    });

    it('opens the dialog when open turns true', async () => {
      const el = await mount({ open: false });
      await flush(el);

      el.open = true;
      await flush(el);

      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    });

    it('clears the loading flag and lists nothing when the design lookup fails', async () => {
      vi.mocked(apiRequestWithRetry).mockResolvedValue(apiNotOk({ message: 'nope' }));
      const el = await mount();
      await flush(el);

      expect(store.getState().loading.loading.status).toBe(false);
      expect(designButtons(el)).toEqual([]);
    });
  });

  describe('choosing columns', () => {
    it('adds a column that is not chosen yet, naming it from its title', async () => {
      const el = await mount();
      await flush(el);

      designButtonFor(el, 'Col3').click();
      await el.updateComplete;

      expect(details(el).columns).toEqual([
        { name: 'Col1', externalName: 'Col1_ext' },
        { name: 'Col2', externalName: 'Col2_ext' },
        { name: 'Col3', externalName: 'Column_3', title: 'Column 3' }
      ]);
    });

    it('ignores a click on a column that is already chosen', async () => {
      const el = await mount();
      await flush(el);

      designButtonFor(el, 'Col1').click();
      await el.updateComplete;

      expect(details(el).columns.map((column) => column.name)).toEqual(['Col1', 'Col2']);
    });

    it('adds every fetched column at once, keeping the names already given', async () => {
      const el = await mount();
      await flush(el);

      addAllButton(el).click();
      await el.updateComplete;

      expect(details(el).columns).toEqual([
        { name: 'Col1', externalName: 'Col1_ext' },
        { name: 'Col2', externalName: 'Col2_ext' },
        { name: 'Col3', externalName: 'Column_3' }
      ]);
    });

    it('flags two columns that would be exposed under one name, and refuses to save', async () => {
      const el = await mount();
      await flush(el);

      expect(saveButton(el).disabled).toBe(false);

      await editColumn(el, 'Col2', 'Col1_ext');

      expect(details(el).columns.map((column) => column.error)).toEqual([
        'duplicate',
        'duplicate'
      ]);
      expect(saveButton(el).disabled).toBe(true);
    });

    it('falls back to the column title when the name is cleared', async () => {
      const el = await mount();
      await flush(el);

      designButtonFor(el, 'Col3').click();
      await el.updateComplete;
      await editColumn(el, 'Col3', '');

      expect(details(el).columns[2]).toMatchObject({
        name: 'Col3',
        externalName: 'Column_3',
        error: null
      });
    });

    it('falls back to the column name when there is no title to fall back to', async () => {
      const el = await mount();
      await flush(el);

      addAllButton(el).click();
      await el.updateComplete;
      await editColumn(el, 'Col3', '');

      expect(details(el).columns[2]).toMatchObject({ name: 'Col3', externalName: 'Col3' });
    });
  });

  describe('dirty form tracking', () => {
    it('closes without showing the dirty dialog when the form is clean', async () => {
      const el = await mount();
      await flush(el);
      const closes = listenClose(el);

      closeButton(el).click();
      await el.updateComplete;

      expect(dirtyDialog(el).open).toBe(false);
      expect(closes).toHaveLength(1);
    });

    it('shows the dirty dialog when a column has been added', async () => {
      const el = await mount();
      await flush(el);
      const closes = listenClose(el);

      designButtonFor(el, 'Col3').click();
      await el.updateComplete;
      closeButton(el).click();
      await el.updateComplete;

      expect(dirtyDialog(el).open).toBe(true);
      expect(closes).toHaveLength(0);
    });

    it('shows the dirty dialog when a column has been removed', async () => {
      const el = await mount();
      await flush(el);

      await removeColumn(el, 'Col1');
      closeButton(el).click();
      await el.updateComplete;

      expect(dirtyDialog(el).open).toBe(true);
    });

    it('shows the dirty dialog when an external name has been changed', async () => {
      const el = await mount();
      await flush(el);

      await editColumn(el, 'Col1', 'renamed');
      closeButton(el).click();
      await el.updateComplete;

      expect(dirtyDialog(el).open).toBe(true);
    });

    it('is still dirty when a column is removed and re-added, because the order changed', async () => {
      const el = await mount();
      await flush(el);

      await removeColumn(el, 'Col1');
      expect(details(el).columns.map((column) => column.name)).toEqual(['Col2']);

      designButtonFor(el, 'Col1').click();
      await el.updateComplete;
      expect(details(el).columns.map((column) => column.name)).toEqual(['Col2', 'Col1']);

      closeButton(el).click();
      await el.updateComplete;

      expect(dirtyDialog(el).open).toBe(true);
    });

    describe('a view with no columns yet', () => {
      it('closes without the dirty dialog when nothing was added', async () => {
        const el = await mount({ schemaData: makeSchemaData(undefined) });
        await flush(el);
        const closes = listenClose(el);

        closeButton(el).click();
        await el.updateComplete;

        expect(dirtyDialog(el).open).toBe(false);
        expect(closes).toHaveLength(1);
      });

      it('shows the dirty dialog once a column is added', async () => {
        const el = await mount({ schemaData: makeSchemaData(undefined) });
        await flush(el);

        designButtonFor(el, 'Col1').click();
        await el.updateComplete;
        closeButton(el).click();
        await el.updateComplete;

        expect(dirtyDialog(el).open).toBe(true);
      });
    });
  });

  describe('the dirty dialog', () => {
    const makeDirty = async (): Promise<EditView> => {
      const el = await mount();
      await flush(el);
      await removeColumn(el, 'Col1');
      closeButton(el).click();
      await el.updateComplete;
      expect(dirtyDialog(el).open).toBe(true);
      return el;
    };

    it('cancel dismisses it and leaves the form open with its columns', async () => {
      const el = await makeDirty();
      const closes = listenClose(el);

      await fireDirtyDialog(el, 'dialog-cancel');

      expect(dirtyDialog(el).open).toBe(false);
      expect(closes).toHaveLength(0);
      expect(details(el).columns.map((column) => column.name)).toEqual(['Col2']);
    });

    it('no discards the changes and closes the form', async () => {
      const el = await makeDirty();
      const closes = listenClose(el);

      await fireDirtyDialog(el, 'dialog-discard');

      expect(dirtyDialog(el).open).toBe(false);
      expect(closes).toHaveLength(1);
      expect(databasesActions.updateSchema).not.toHaveBeenCalled();
    });

    it('yes saves and closes the form', async () => {
      const el = await makeDirty();
      const closes = listenClose(el);

      await fireDirtyDialog(el, 'dialog-save');

      expect(dirtyDialog(el).open).toBe(false);
      expect(databasesActions.updateSchema).toHaveBeenCalled();
      expect(closes).toHaveLength(1);
    });
  });

  describe('saving', () => {
    it('writes the chosen columns onto the view and marks it updated', async () => {
      const el = await mount();
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.schemaName).toBe('testdb');
      expect(payload.views).toEqual([
        {
          name: 'TestView',
          alias: [],
          unid: 'unid-1',
          columns: defaultColumns,
          viewUpdated: true
        }
      ]);
    });

    it('drops the columns key entirely when the last column has been removed', async () => {
      const el = await mount();
      await flush(el);

      await removeColumn(el, 'Col1');
      await removeColumn(el, 'Col2');
      saveButton(el).click();
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.views).toEqual([{ name: 'TestView', alias: [], unid: 'unid-1' }]);
    });

    // ---- #932 ---------------------------------------------------------------------------

    /**
     * The dialog chooses which columns a view exposes. It has nothing to say about owners, and
     * it used to destroy them anyway: every field in the payload was read from the schema
     * except `owners` and `excludedViews`, which were hardcoded to `[]` and `undefined` on a
     * derived object that both save paths spread into the request. `updateSchema` POSTs the
     * object whole, so the endpoint echoed the blanks back and the owner list was gone —
     * silently, with nothing on screen mentioning owners.
     */
    it('leaves the schema owners alone when saving a column selection', async () => {
      const el = await mount();
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.owners).toEqual(['someone']);
    });

    it('leaves excludedViews alone when saving a column selection', async () => {
      const el = await mount();
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.excludedViews).toEqual(['HiddenView']);
    });

    /**
     * A schema that never had owners can arrive without the key. `undefined` would serialise
     * the field away, which is half of what this fixes — so the default is an empty array,
     * matching what the payload always sent for that case.
     */
    it('sends an empty owner list, not undefined, when the schema has none', async () => {
      const schemaData = makeSchemaData(defaultColumns);
      delete schemaData.owners;
      const el = await mount({ schemaData });
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.owners).toEqual([]);
      expect('owners' in payload).toBe(true);
    });

    it('reports the schema the endpoint echoed back', async () => {
      const el = await mount();
      await flush(el);
      const changes: any[] = [];
      el.addEventListener('schema-change', (event) =>
        changes.push((event as CustomEvent).detail.schemaData)
      );

      saveButton(el).click();
      await el.updateComplete;

      const [, callback] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      callback!({ schemaName: 'from-server' });

      expect(changes).toEqual([{ schemaName: 'from-server' }]);
    });

    it('refreshes the view list and republishes the active views', async () => {
      const el = await mount();
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      expect(databasesActions.fetchViews).toHaveBeenCalledWith('testdb', 'test.nsf');
      expect(store.getState().databases.activeViews).toEqual([
        {
          viewName: 'TestView',
          viewAlias: '',
          viewUnid: 'unid-1',
          viewActive: undefined,
          viewColumns: defaultColumns,
          viewUpdated: true
        }
      ]);
    });

    it('suppresses an alias that only repeats the view name (LABS-1903)', async () => {
      const schemaData = makeSchemaData(defaultColumns);
      schemaData.views[0].alias = ['TestView'];
      const el = await mount({ schemaData });
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      expect(store.getState().databases.activeViews[0].viewAlias).toBe('');
    });

    it('keeps a real alias', async () => {
      const schemaData = makeSchemaData(defaultColumns);
      schemaData.views[0].alias = ['tv'];
      const el = await mount({ schemaData });
      await flush(el);

      saveButton(el).click();
      await el.updateComplete;

      expect(store.getState().databases.activeViews[0].viewAlias).toBe('tv');
    });

    it('saves nothing when the schema carries no views at all', async () => {
      const schemaData = makeSchemaData(defaultColumns);
      delete schemaData.views;
      const el = await mount({ schemaData });
      await flush(el);
      const closes = listenClose(el);

      saveButton(el).click();
      await el.updateComplete;

      expect(databasesActions.updateSchema).not.toHaveBeenCalled();
      expect(closes).toHaveLength(0);
    });
  });

  describe('resetting', () => {
    it('asks before resetting', async () => {
      const el = await mount();
      await flush(el);
      vi.mocked(HTMLDialogElement.prototype.showModal).mockClear();

      resetButton(el).click();
      await el.updateComplete;

      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
      expect(databasesActions.updateSchema).not.toHaveBeenCalled();
    });

    it('closes the confirmation again when it is dismissed', async () => {
      const el = await mount();
      await flush(el);
      resetButton(el).click();
      await el.updateComplete;
      vi.mocked(HTMLDialogElement.prototype.close).mockClear();

      shadow(el).querySelector('keep-form-dialog-header')!.dispatchEvent(
        new CustomEvent('header-close', { bubbles: true, composed: true })
      );
      await el.updateComplete;

      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
      expect(databasesActions.updateSchema).not.toHaveBeenCalled();
    });

    it('strips the view down to no columns and closes the form when confirmed', async () => {
      const el = await mount();
      await flush(el);
      const closes = listenClose(el);

      resetButton(el).click();
      await el.updateComplete;
      shadow(el).querySelectorAll('keep-button')[1].dispatchEvent(new MouseEvent('click'));
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.views).toEqual([{ name: 'TestView', alias: [], unid: 'unid-1' }]);
      expect(closes).toHaveLength(1);
    });

    // The reset path builds the same payload, and it destroyed the same two fields (#932).
    it('leaves the owners and excludedViews alone when resetting', async () => {
      const el = await mount();
      await flush(el);

      resetButton(el).click();
      await el.updateComplete;
      shadow(el).querySelectorAll('keep-button')[1].dispatchEvent(new MouseEvent('click'));
      await el.updateComplete;

      const [payload] = vi.mocked(databasesActions.updateSchema).mock.calls[0];
      expect(payload.owners).toEqual(['someone']);
      expect(payload.excludedViews).toEqual(['HiddenView']);
    });

    it('resets nothing when the schema carries no views at all', async () => {
      const schemaData = makeSchemaData(defaultColumns);
      delete schemaData.views;
      const el = await mount({ schemaData });
      await flush(el);

      resetButton(el).click();
      await el.updateComplete;
      shadow(el).querySelectorAll('keep-button')[1].dispatchEvent(new MouseEvent('click'));
      await el.updateComplete;

      expect(databasesActions.updateSchema).not.toHaveBeenCalled();
    });
  });

  describe('the browser leave-site prompt', () => {
    const beforeUnload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);
      return event;
    };

    it('blocks navigation while there are unsaved changes', async () => {
      const el = await mount();
      await flush(el);
      await removeColumn(el, 'Col1');

      expect(beforeUnload().preventDefault).toHaveBeenCalled();
    });

    it('lets navigation through when nothing has changed', async () => {
      const el = await mount();
      await flush(el);

      expect(beforeUnload().preventDefault).not.toHaveBeenCalled();
    });

    it('lets navigation through when the dialog is closed', async () => {
      const el = await mount({ open: false });
      await flush(el);

      expect(beforeUnload().preventDefault).not.toHaveBeenCalled();
    });

    it('stops listening once the element leaves the document', async () => {
      const el = await mount();
      await flush(el);
      await removeColumn(el, 'Col1');
      el.remove();

      expect(beforeUnload().preventDefault).not.toHaveBeenCalled();
    });
  });
});
