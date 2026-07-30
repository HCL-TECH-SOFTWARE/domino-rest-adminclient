/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { toggleQuickConfigDrawer } from '../../../src/store/drawer/reducer';
import { INIT_STATE, SET_DB_ERROR } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-quick-config-drawer';
import type QuickConfigDrawer from '../../../src/components/keep-elements/keep-quick-config-drawer';
import type QuickConfigForm from '../../../src/components/keep-elements/keep-quick-config-form';

const TAG = 'keep-quick-config-drawer';

/**
 * The shell that replaced `QuickConfigFormContainer.tsx`. It takes no props: the drawer flag
 * and the databases slice arrive through `StoreController`, so these tests drive the real
 * store.
 */
describe('keep-quick-config-drawer', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const mount = () => mountLit<QuickConfigDrawer>(TAG);

  const drawer = (el: QuickConfigDrawer) =>
    el.shadowRoot!.querySelector('keep-drawer') as HTMLElement & { open: boolean; label: string };

  const form = (el: QuickConfigDrawer) =>
    el.shadowRoot!.querySelector('keep-quick-config-form') as QuickConfigForm;

  /**
   * Looked up in `document.body`, not in the shadow root: `keep-alert` moves itself there on
   * first show (`_movedToBody`), because a toast has to escape whatever overflow context it
   * was declared in. So the element's own placement is a statement of intent rather than the
   * mechanism — the toast would survive the drawer either way.
   */
  const alert = () => document.body.querySelector('keep-alert');

  /**
   * A store dispatch reaches the element through `StoreController.requestUpdate()`, and the
   * elements it creates (the toast) settle a tick later again — so assertions about the
   * rendered result drain the microtask queue rather than awaiting one update.
   */
  const settle = async (el: QuickConfigDrawer) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const open = async (el: QuickConfigDrawer) => {
    store.dispatch(toggleQuickConfigDrawer());
    await settle(el);
  };

  const raise = async (el: QuickConfigDrawer, message: string) => {
    store.dispatch({ type: SET_DB_ERROR, payload: message });
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the drawer closed, labelled, with the form inside', async () => {
    const el = await mount();
    expect(drawer(el).open).toBe(false);
    expect(drawer(el).getAttribute('label')).toBe('Quick Config');
    expect(form(el)).toBeTruthy();
  });

  it('opens when the store flag turns on', async () => {
    const el = await mount();
    await open(el);
    expect(drawer(el).open).toBe(true);
  });

  it('the form is mounted while the drawer is closed, so its state survives a close', async () => {
    // `keep-drawer` slots its content, and Views.tsx mounts this on first open and leaves it
    // mounted — so the element must not conditionally render the form.
    const el = await mount();
    expect(form(el)).toBeTruthy();
    await open(el);
    expect(form(el)).toBeTruthy();
  });

  it('clears the form when the drawer opens', async () => {
    const el = await mount();
    const reset = vi.spyOn(form(el), 'reset');
    await open(el);
    expect(reset).toHaveBeenCalled();
  });

  it('clears the form when the drawer closes too', async () => {
    // The React effect ran on every change of the flag, not only on open.
    const el = await mount();
    await open(el);
    const reset = vi.spyOn(form(el), 'reset');
    await open(el); // toggles back to closed
    expect(drawer(el).open).toBe(false);
    expect(reset).toHaveBeenCalled();
  });

  it('does not reset on an unrelated store change', async () => {
    // The flag is read through a controller, which re-renders on any store change — so the
    // handler compares the previous value rather than trusting the render.
    const el = await mount();
    await open(el);
    const reset = vi.spyOn(form(el), 'reset');
    await raise(el, 'unrelated');
    expect(reset).not.toHaveBeenCalled();
  });

  it('moves focus into the form on open, but not on close', async () => {
    const el = await mount();
    const focus = vi.spyOn(form(el), 'focusFirstField');
    await open(el);
    expect(focus).toHaveBeenCalledTimes(1);
    await open(el); // close
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('shows the toast only while dbError is set', async () => {
    const el = await mount();
    expect(alert()).toBeNull();

    await raise(el, 'Server said no');
    expect(alert()!.getAttribute('message')).toBe('Server said no');
    expect(alert()!.getAttribute('variant')).toBe('danger');
  });

  it('the toast is not inside the drawer, so it survives the drawer closing', async () => {
    // Why Views.tsx mounts this on first open and never unmounts it: an error raised by a
    // save has to stay readable after the drawer has gone.
    const el = await mount();
    await raise(el, 'Server said no');
    expect(alert()!.closest('keep-drawer')).toBeNull();
    expect(el.shadowRoot!.querySelector('keep-drawer keep-alert')).toBeNull();
  });

  it('the form Close button closes the drawer and clears the error', async () => {
    const el = await mount();
    await open(el);
    await raise(el, 'Server said no');

    form(el).dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    await settle(el);

    expect(store.getState().drawer.quickConfigDrawer).toBe(false);
    expect(store.getState().databases.dbError).toBe(false);
  });

  it('a toast, once shown, outlives the condition that created it (#902)', async () => {
    // Not an assertion of what *should* happen — a record of what does. `keep-alert` moves
    // itself into document.body on first show, so it is no longer between the markers of the
    // Lit part that created it; switching that part to `nothing` cannot take it away. It
    // hides itself on a 5s timer instead, and a second error mints a second element.
    //
    // Pre-existing: the React container conditionally rendered <KeepAlert> the same way. Filed
    // as #902 (by the PR that converted this pair to FormController) rather than worked around
    // here, because the fix belongs in keep-alert.
    const el = await mount();
    await raise(el, 'first');
    expect(document.body.querySelectorAll('keep-alert')).toHaveLength(1);

    store.dispatch({ type: INIT_STATE });
    await settle(el);
    expect(store.getState().databases.dbError).toBe(false);
    expect(document.body.querySelectorAll('keep-alert')).toHaveLength(1);

    await raise(el, 'second');
    expect(document.body.querySelectorAll('keep-alert')).toHaveLength(2);
  });

  it("the drawer's own close affordance does the same", async () => {
    const el = await mount();
    await open(el);
    const closeFn = (drawer(el) as unknown as { closeFn: () => void }).closeFn;
    closeFn();
    await settle(el);
    expect(store.getState().drawer.quickConfigDrawer).toBe(false);
  });
});
