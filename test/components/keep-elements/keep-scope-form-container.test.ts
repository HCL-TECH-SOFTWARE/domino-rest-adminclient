/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { fetchKeepPermissions } from '../../../src/store/databases/reducer';
import { closeSnackbar } from '../../../src/store/alerts/reducer';
import { toggleDrawer } from '../../../src/store/drawer/reducer';
import { INIT_STATE, SET_DB_ERROR } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-scope-form-container';
import type ScopeFormContainer from '../../../src/components/keep-elements/keep-scope-form-container';
import type ScopeForm from '../../../src/components/keep-elements/keep-scope-form';

const TAG = 'keep-scope-form-container';

const ROW = { apiName: 'hrscope', schemaName: 'people', nsfPath: 'apps/hr.nsf' };

/**
 * The shell that replaced `ScopeFormContainer.tsx` (#806 wave 5). The form state, the
 * validation schema and the save dispatch all moved into `keep-scope-form`; what is left
 * reads the drawer flag, decides whether a delete is allowed, and holds the confirmation.
 *
 * `permissions` is no longer a prop. The list view read it from the store and passed it in,
 * which is the `@lit/react` hazard in its purest form — the bridge re-applies every prop on
 * every parent render with no dirty check.
 */
describe('keep-scope-form-container', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(closeSnackbar());
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    store.dispatch(closeSnackbar());
  });

  const mount = (props: Partial<ScopeFormContainer> = {}) =>
    mountLit<ScopeFormContainer>(TAG, props);

  const drawer = (el: ScopeFormContainer) =>
    el.shadowRoot!.querySelector('keep-drawer') as HTMLElement & { open: boolean };

  const form = (el: ScopeFormContainer) =>
    el.shadowRoot!.querySelector('keep-scope-form') as ScopeForm;

  const dialog = (el: ScopeFormContainer) =>
    el.shadowRoot!.querySelector('keep-delete-dialog') as HTMLElement & {
      selected: { isDeleteSchema?: boolean; apiName?: string };
    };

  /**
   * A store dispatch reaches the element through `StoreController.requestUpdate()`, and the
   * elements it owns settle a tick later again — so assertions about the rendered result
   * drain the microtask queue rather than awaiting one update.
   */
  const settle = async (el: ScopeFormContainer) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const open = async (el: ScopeFormContainer) => {
    store.dispatch(toggleDrawer());
    await settle(el);
  };

  const allowDelete = (allowed: boolean) => {
    store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: allowed }));
  };

  const emitFromForm = async (el: ScopeFormContainer, type: string) => {
    form(el).dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the drawer closed, labelled for an add, with the form inside', async () => {
    const el = await mount();
    expect(drawer(el).open).toBe(false);
    expect(drawer(el).getAttribute('label')).toBe('Add New Scope');
    expect(form(el)).toBeTruthy();
  });

  it('labels the drawer for an edit', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    expect(drawer(el).getAttribute('label')).toBe('Edit Scope');
  });

  it('hands the selection down to the form', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    expect(form(el).database).toBe(ROW);
    expect(form(el).isEdit).toBe(true);
  });

  it('opens when the store flag turns on', async () => {
    const el = await mount();
    await open(el);
    expect(drawer(el).open).toBe(true);
  });

  it('keeps the form mounted while the drawer is closed', async () => {
    // The list view mounts this unconditionally so the panel can animate out; the element
    // must not conditionally render the form, or the animation has nothing to play.
    const el = await mount();
    expect(form(el)).toBeTruthy();
    await open(el);
    expect(form(el)).toBeTruthy();
  });

  // ---- closing ------------------------------------------------------------------------

  it("the form's Close button closes the drawer and clears the save error", async () => {
    const el = await mount();
    await open(el);
    store.dispatch({ type: SET_DB_ERROR, payload: 'Server said no' });
    await settle(el);

    await emitFromForm(el, 'close');
    expect(store.getState().drawer.visible).toBe(false);
    expect(store.getState().databases.dbError).toBe(false);
  });

  it("the drawer's own close affordance does the same", async () => {
    const el = await mount();
    await open(el);
    (drawer(el) as unknown as { closeFn: () => void }).closeFn();
    await settle(el);
    expect(store.getState().drawer.visible).toBe(false);
  });

  it('a hide notification for a close already accounted for does not reopen the drawer', async () => {
    // Web Awesome fires the hide notification whenever the panel finishes hiding, including
    // when the hide was our own doing. Unguarded, that second visit toggles the flag again
    // and the drawer comes back, empty.
    const el = await mount();
    await open(el);
    await emitFromForm(el, 'close');
    expect(store.getState().drawer.visible).toBe(false);

    (drawer(el) as unknown as { closeFn: () => void }).closeFn();
    await settle(el);
    expect(store.getState().drawer.visible).toBe(false);
  });

  // ---- deleting -----------------------------------------------------------------------

  it('opens the confirmation when the user may delete', async () => {
    allowDelete(true);
    const el = await mount({ database: ROW, isEdit: true });
    await emitFromForm(el, 'delete');
    expect(store.getState().dialog.deleteDialog).toBe(true);
  });

  it('explains itself instead when the user may not', async () => {
    allowDelete(false);
    const el = await mount({ database: ROW, isEdit: true });
    await emitFromForm(el, 'delete');
    expect(store.getState().dialog.deleteDialog).toBe(false);
    expect(store.getState().alert.message).toBe("You don't have permission to delete scope.");
  });

  it('treats an unloaded permissions map as no permission', async () => {
    // `permissions` is `{}` until the fetch lands, and the drawer can be open before it does.
    const el = await mount({ database: ROW, isEdit: true });
    await emitFromForm(el, 'delete');
    expect(store.getState().dialog.deleteDialog).toBe(false);
    expect(store.getState().alert.message).toBe("You don't have permission to delete scope.");
  });

  it('tells the confirmation which scope it is about', async () => {
    const el = await mount({ database: ROW, isEdit: true });
    expect(dialog(el).selected).toEqual({ isDeleteSchema: false, apiName: 'hrscope' });
  });

  it('names no scope before one is selected', async () => {
    const el = await mount();
    expect(dialog(el).selected).toEqual({ isDeleteSchema: false, apiName: '' });
  });
});
