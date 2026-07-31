/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setApiLoading, toggleDeleteDialog } from '../../../src/store/dialog/action';
import { INIT_STATE } from '../../../src/store/dialog/types';
import '../../../src/components/keep-elements/keep-delete-dialog';
import type DeleteDialog from '../../../src/components/keep-elements/keep-delete-dialog';

/**
 * The two delete thunks are stubbed because the real ones call the API. Everything else in the
 * barrel stays real — `importOriginal` rather than a bare factory, so this file does not
 * silently blank out exports the element or the store reach for.
 */
const { deleteSchema, deleteScope } = vi.hoisted(() => ({
  deleteSchema: vi.fn(() => ({ type: 'TEST_DELETE_SCHEMA' })),
  deleteScope: vi.fn(() => ({ type: 'TEST_DELETE_SCOPE' }))
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  deleteSchema,
  deleteScope
}));

const TAG = 'keep-delete-dialog';

const SCHEMA = { isDeleteSchema: true, nsfPath: 'demo.nsf', schemaName: 'Demo' };
const SCOPE = { isDeleteSchema: false, apiName: 'demoscope' };

describe('keep-delete-dialog', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);

  const dialog = (el: DeleteDialog) => el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

  const action = (el: DeleteDialog, label: string) =>
    [...el.shadowRoot!.querySelectorAll('keep-button')].find(
      (b) => b.textContent?.trim() === label
    ) as HTMLElement;

  /** Open it the way a card's delete control does. */
  const open = async (el: DeleteDialog) => {
    store.dispatch(toggleDeleteDialog());
    await el.updateComplete;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('stays closed until the store flag is set, and takes no open property', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    expect(showModal()).not.toHaveBeenCalled();
    // The React component took open={deleteDialog} at all six call sites. Asserting the
    // property is absent is what keeps a future caller from re-introducing the mirror.
    expect('open' in el).toBe(false);
    await open(el);
    expect(showModal()).toHaveBeenCalledTimes(1);
  });

  it('names the schema and calls it a schema', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCHEMA });
    await open(el);
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('settings of the schema: Demo');
    expect(dialog(el).getAttribute('aria-label')).toBe('Delete Demo?');
  });

  it('names the scope and calls it a scope', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('settings of the scope: demoscope');
    expect(dialog(el).getAttribute('aria-label')).toBe('Delete demoscope?');
  });

  it('describes itself with the warning, which the React version never wired up', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    // The React markup had id="alert-dialog-description" and no aria-describedby anywhere,
    // so the id pointed at nothing (#713).
    const describedBy = dialog(el).getAttribute('aria-describedby')!;
    expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain('You');
  });

  it('closes from No', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    action(el, 'No').click();
    expect(store.getState().dialog.deleteDialog).toBe(false);
  });

  it('closes from the header close button', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(store.getState().dialog.deleteDialog).toBe(false);
  });

  it('closes on Escape, which the React version left desynced', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(store.getState().dialog.deleteDialog).toBe(false);
  });

  it('deletes a schema by nsf path and name', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCHEMA });
    await open(el);
    action(el, 'Yes').click();
    expect(deleteSchema).toHaveBeenCalledWith({ nsfPath: 'demo.nsf', schemaName: 'Demo' });
    expect(deleteScope).not.toHaveBeenCalled();
  });

  it('deletes a scope by api name', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCOPE });
    await open(el);
    action(el, 'Yes').click();
    expect(deleteScope).toHaveBeenCalledWith('demoscope');
    expect(deleteSchema).not.toHaveBeenCalled();
  });

  it('swaps the buttons for a spinner while the delete is in flight', async () => {
    const el = await mountLit<DeleteDialog>(TAG, { selected: SCHEMA });
    await open(el);
    store.dispatch(setApiLoading(true));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('wa-spinner')).toBeTruthy();
    expect(action(el, 'Yes')).toBeUndefined();
    expect(dialog(el).getAttribute('aria-busy')).toBe('true');
    // 4.1.3: the spinner alone is not a status message. The visually hidden text is.
    const status = el.shadowRoot!.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('Deleting schema Demo');
    expect(dialog(el).getAttribute('aria-label')).toBe('Deleting Demo');
  });
});
