/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { toggleErrorDialog } from '../../../src/store/dialog/action';
import { INIT_STATE } from '../../../src/store/dialog/types';
import '../../../src/components/keep-elements/keep-network-error-dialog';
import type NetworkErrorDialog from '../../../src/components/keep-elements/keep-network-error-dialog';

const TAG = 'keep-network-error-dialog';

/**
 * The first element to read the store through `StoreController` (#715), so these tests drive
 * the **real** store singleton rather than props. That is the contract: nothing sets a
 * property on this element, and a test that assigned one would be testing an API it does not
 * have.
 *
 * `INIT_STATE` resets the slice between tests — the dialog reducer handles it in
 * `extraReducers`, which is the same broadcast the app uses on logout.
 */
describe('keep-network-error-dialog', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  // jsdom implements no <dialog> modal behaviour; setupTests.ts stubs showModal/close with
  // vi.fn(), so these assert the calls rather than the resulting `.open` state.
  const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
  const close = () => vi.mocked(HTMLDialogElement.prototype.close);

  const dialog = (el: NetworkErrorDialog) =>
    el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

  const okButton = (el: NetworkErrorDialog) =>
    el.shadowRoot!.querySelector<HTMLElement>('.actions keep-button')!;

  /** Raise an error the way the databases thunks do. */
  const raise = async (message: string, el: NetworkErrorDialog) => {
    store.dispatch(toggleErrorDialog(message));
    await el.updateComplete;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('stays closed while the store reports no error', async () => {
    await mountLit<NetworkErrorDialog>(TAG);
    expect(showModal()).not.toHaveBeenCalled();
  });

  it('opens modally and shows the message when the store raises one', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('500: it broke', el);
    expect(showModal()).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.textContent).toContain('500: it broke');
  });

  it('opens when mounted while an error is already showing', async () => {
    // The three call sites are page-level, so a route change can mount this element with the
    // flag already true. The controller re-reads on connect for exactly this case.
    store.dispatch(toggleErrorDialog('403: still here'));
    const el = await mountLit<NetworkErrorDialog>(TAG);
    expect(showModal()).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.textContent).toContain('403: still here');
  });

  it('closes the native dialog when the store clears', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('500: it broke', el);
    // jsdom's stubbed showModal never sets .open, so drive close() through a real state change
    // and assert the call: the element only calls close() when the DOM says it is open.
    dialog(el).setAttribute('open', '');
    await raise('500: it broke', el);
    expect(close()).toHaveBeenCalledTimes(1);
  });

  it('dismisses from the OK button', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('400: bad request', el);
    okButton(el).click();
    expect(store.getState().dialog.errorDialogOpen).toBe(false);
  });

  it('dismisses from the header close button', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('400: bad request', el);
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(store.getState().dialog.errorDialogOpen).toBe(false);
  });

  it('dismisses on Escape, which used to disable error reporting for the session', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('500: it broke', el);
    // Escape closes a modal <dialog> natively and fires `cancel`. The React version listened
    // for neither, so the flag stayed true with the dialog gone - and since the action is a
    // toggle, the *next* failure flipped it to false and displayed nothing at all.
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(store.getState().dialog.errorDialogOpen).toBe(false);

    // The proof that it is fixed: a second failure still opens.
    await raise('404: and again', el);
    expect(store.getState().dialog.errorDialogOpen).toBe(true);
    expect(el.shadowRoot!.textContent).toContain('404: and again');
  });

  it('keeps the message on dismissal rather than blanking it', async () => {
    // toggleErrorDialog sets the message as well as flipping the flag, so dismissing has to
    // re-send the current one. Passing something else would leave a stale string for the next
    // failure to flash before its own message lands.
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('403: forbidden', el);
    okButton(el).click();
    expect(store.getState().dialog.errorDialogMessage).toBe('403: forbidden');
  });

  it('names and describes the modal without an IDREF across a shadow boundary', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    await raise('500: it broke', el);
    const d = dialog(el);
    // The heading lives in keep-form-dialog-header's own root, so aria-labelledby could not
    // reach it. The message is in this root, so aria-describedby can (#713).
    expect(d.getAttribute('aria-label')).toBe('Error');
    const describedBy = d.getAttribute('aria-describedby')!;
    expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain('500: it broke');
  });

  it('unsubscribes on disconnect', async () => {
    const el = await mountLit<NetworkErrorDialog>(TAG);
    el.remove();
    store.dispatch(toggleErrorDialog('500: after removal'));
    await el.updateComplete;
    // Still the pre-removal render: a detached element that keeps re-rendering is a leak with
    // the element as its root.
    expect(el.shadowRoot!.textContent).not.toContain('500: after removal');
  });
});
