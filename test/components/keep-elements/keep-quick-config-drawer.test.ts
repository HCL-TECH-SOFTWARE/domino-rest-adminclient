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
  /**
   * The toast lives in this element's own shadow root, beside `keep-drawer` rather than
   * inside it (#952). It used to be looked up in `document.body`, because `keep-alert` moved
   * itself there on first show; it no longer relocates itself.
   */
  const alert = (el: QuickConfigDrawer) =>
    el.shadowRoot!.querySelector('keep-alert') as
      | (HTMLElement & { message: string; variant: string })
      | null;

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

  it('raises the toast when dbError is set', async () => {
    const el = await mount();
    // The element is always in the tree now and shows itself on demand, rather than being
    // conditionally rendered with a message binding for keep-alert to auto-show (#952).
    expect(alert(el), 'the alert element should always be rendered').toBeTruthy();
    expect(alert(el)!.message).toBe('');

    await raise(el, 'Server said no');
    expect(alert(el)!.message).toBe('Server said no');
    // The property, not the attribute: show() assigns it and keep-alert does not reflect.
    // It used to be an attribute only because the template bound variant="danger" (#952).
    expect(alert(el)!.variant).toBe('danger');
  });

  it('the toast is not inside the drawer, so it survives the drawer closing', async () => {
    // Why Views.tsx mounts this on first open and never unmounts it: an error raised by a
    // save has to stay readable after the drawer has gone.
    const el = await mount();
    await raise(el, 'Server said no');
    expect(alert(el)!.closest('keep-drawer')).toBeNull();
    expect(el.shadowRoot!.querySelector('keep-drawer keep-alert')).toBeNull();
  });

  it('the form Close button closes the drawer and clears the error', async () => {
    // Only the immediate effect of the Close event. Whether the drawer *stays* closed is a
    // separate question, and one this test cannot see — see "the hide round trip" below.
    const el = await mount();
    await open(el);
    await raise(el, 'Server said no');

    form(el).dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    await settle(el);

    expect(store.getState().drawer.quickConfigDrawer).toBe(false);
    expect(store.getState().databases.dbError).toBe(false);
  });

  it('a toast, once shown, outlives the condition that created it (#902, #952)', async () => {
    // This was a *characterization* of the old behaviour, and said so: keep-alert moved itself
    // into document.body on first show, so the Lit part that created it could no longer take
    // it away — and a second error minted a **second element**, because the first was no
    // longer where the part expected it.
    //
    // Same outcome, honestly now. The element is rendered unconditionally and shown through
    // show(), so clearing dbError cannot remove it and a second error reuses the one element.
    const el = await mount();
    await raise(el, 'first');
    expect(el.shadowRoot!.querySelectorAll('keep-alert')).toHaveLength(1);
    expect(alert(el)!.message).toBe('first');

    store.dispatch({ type: INIT_STATE });
    await settle(el);
    expect(store.getState().databases.dbError).toBe(false);
    // Still there, still readable — which is the behaviour the drawer needs, since close()
    // clears dbError a moment after the save that raised it.
    expect(el.shadowRoot!.querySelectorAll('keep-alert')).toHaveLength(1);
    expect(alert(el)!.message).toBe('first');

    await raise(el, 'second');
    expect(el.shadowRoot!.querySelectorAll('keep-alert'), 'a second element was minted')
      .toHaveLength(1);
    expect(alert(el)!.message).toBe('second');
  });

  it("the drawer's own close affordance does the same", async () => {
    const el = await mount();
    await open(el);
    const closeFn = (drawer(el) as unknown as { closeFn: () => void }).closeFn;
    closeFn();
    await settle(el);
    expect(store.getState().drawer.quickConfigDrawer).toBe(false);
  });

  /**
   * The full hide round trip: the panel actually opens, actually hides, and the
   * `wa-after-hide` that Web Awesome fires when it has finished hiding actually comes back.
   *
   * None of that happens in the tests above, and the reason is worth stating because it hid a
   * real bug. `test/setupTests.ts` stubs the dialog methods jsdom does not implement as
   * no-ops, so the inner dialog never reports itself open — and Web Awesome's `open` watcher
   * only hides the drawer when the dialog *is* open. With the stub in place the whole
   * hide-and-notify path is unreachable, and every close in this file looks like a single
   * clean toggle.
   *
   * The two replacements below are enough to make it real: the dialog's own `open` is a
   * reflected attribute, so setting it is the part of `showModal`/`close` that the drawer
   * reads. Restored afterwards, because the no-op stubs are what the rest of the suite
   * expects.
   */
  describe('the hide round trip', () => {
    const original = {
      showModal: HTMLDialogElement.prototype.showModal,
      close: HTMLDialogElement.prototype.close,
    };

    beforeEach(() => {
      HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.open = true;
      };
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.open = false;
      };
    });

    afterEach(() => {
      HTMLDialogElement.prototype.showModal = original.showModal;
      HTMLDialogElement.prototype.close = original.close;
    });

    const waDrawer = (el: QuickConfigDrawer) =>
      drawer(el).shadowRoot!.querySelector('wa-drawer') as HTMLElement & { open: boolean };

    /**
     * Web Awesome waits out the hide animation before it notifies, and it does that by
     * checking `getAnimations()` from a `requestAnimationFrame` callback — so the round trip
     * needs a real frame, not just a drained microtask queue. Two, to also cover the extra
     * show/hide the unguarded code sets off.
     */
    const flushHide = async (el: QuickConfigDrawer) => {
      for (let i = 0; i < 2; i++) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        await settle(el);
      }
    };

    it('really opens the panel', async () => {
      // The premise of everything below: if this fails, the rest are vacuous.
      const el = await mount();
      await open(el);
      await flushHide(el);
      expect(waDrawer(el).open).toBe(true);
    });

    it('the form Close button leaves the drawer closed', async () => {
      // The bug this block exists for. `close()` clears the flag, Web Awesome hides the panel
      // because of it, and the hide notification arrives back here — where an unguarded
      // handler toggled the flag a second time and reopened the drawer, empty.
      const el = await mount();
      await open(el);
      await flushHide(el);

      form(el).dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      await flushHide(el);

      expect(store.getState().drawer.quickConfigDrawer).toBe(false);
      expect(waDrawer(el).open).toBe(false);
    });

    it('a save that closes the drawer leaves it closed', async () => {
      // The quick-config thunk clears the flag itself on success, so a successful Add is the
      // same programmatic close arriving from outside the element. Dispatched directly rather
      // than through the thunk: the toggle is the only part of it this element can see.
      const el = await mount();
      await open(el);
      await flushHide(el);

      store.dispatch(toggleQuickConfigDrawer());
      await flushHide(el);

      expect(store.getState().drawer.quickConfigDrawer).toBe(false);
      expect(waDrawer(el).open).toBe(false);
    });

    it('Escape still closes the drawer and clears the flag', async () => {
      // The other half of the guard, and the half that must not regress: a dismissal the
      // store does not know about yet hides the panel first and notifies afterwards, so the
      // flag is still up when the notification lands and one toggle is exactly right.
      const el = await mount();
      await open(el);
      await flushHide(el);

      await raise(el, 'Server said no');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flushHide(el);

      expect(store.getState().drawer.quickConfigDrawer).toBe(false);
      expect(store.getState().databases.dbError).toBe(false);
      expect(waDrawer(el).open).toBe(false);
    });

    it("the drawer's own close button does the same", async () => {
      const el = await mount();
      await open(el);
      await flushHide(el);

      const closeButton = waDrawer(el).shadowRoot!.querySelector(
        'wa-button[part="close-button"]',
      ) as HTMLElement;
      expect(closeButton).toBeTruthy();
      closeButton.click();
      await flushHide(el);

      expect(store.getState().drawer.quickConfigDrawer).toBe(false);
      expect(waDrawer(el).open).toBe(false);
    });

    it('reopens normally after a programmatic close', async () => {
      // A guard that got stuck would show up here rather than above: the flag has to be free
      // to go back up on the next trigger press.
      const el = await mount();
      await open(el);
      await flushHide(el);
      form(el).dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      await flushHide(el);

      await open(el);
      await flushHide(el);
      expect(store.getState().drawer.quickConfigDrawer).toBe(true);
      expect(waDrawer(el).open).toBe(true);
    });
  });
});
