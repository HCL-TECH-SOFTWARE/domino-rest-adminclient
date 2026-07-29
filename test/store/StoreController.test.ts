/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LitElement, html } from 'lit';
import { StoreController } from '../../src/store/StoreController';
import { store } from '../../src/store/store';
import type { AppState } from '../../src/store';
import { toggleAlert, closeSnackbar } from '../../src/store/alerts/action';
import { setPullApp } from '../../src/store/applications/action';
import { cleanupLit, mountLit } from '../test-utils/lit';

/**
 * #715 — `StoreController` is the framework-agnostic replacement for `useSelector` +
 * `useDispatch`, and the primitive the whole React removal (#719) leans on. It is
 * unit-tested here **before** any component is converted, because a subtle fault in it
 * would surface as "some element occasionally does not re-render" spread across 70 files.
 *
 * The host is a real `LitElement` rather than a stub: the contract under test is
 * `hostConnected`/`hostDisconnected`, and those are called by Lit, not by us. A hand-made
 * host would be asserting against my own idea of when Lit calls them.
 *
 * The store is the real singleton. These tests dispatch real actions through real
 * reducers and put it back afterwards — a mock store would not prove the subscription
 * is wired to the thing the app actually uses.
 */

let renders = 0;

class ProbeElement extends LitElement {
  /** `alert.visible` — a primitive, so Object.is is the right comparison. */
  alert = new StoreController(this, (s: AppState) => s.alert.visible);

  /** A deliberately fresh object per call — the memoization hazard from #697. */
  derived = new StoreController(
    this,
    (s: AppState) => ({ visible: s.alert.visible }),
    (a, b) => a.visible === b.visible,
  );

  render() {
    renders++;
    return html`<span>${String(this.alert.value)}</span>`;
  }
}
customElements.define('probe-element', ProbeElement);

/** A second element type whose selector always allocates, with no isEqual supplied. */
class NaiveElement extends LitElement {
  derived = new StoreController(this, (s: AppState) => ({ visible: s.alert.visible }));
  renders = 0;
  render() {
    this.renders++;
    return html`<span>ok</span>`;
  }
}
customElements.define('naive-element', NaiveElement);

describe('StoreController', () => {
  beforeEach(() => {
    renders = 0;
    // Put the slice into a known state without depending on test order.
    store.dispatch(closeSnackbar());
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch(closeSnackbar());
  });

  it('exposes the selected value before the first render', async () => {
    const el = await mountLit<ProbeElement>('probe-element');

    expect(el.alert.value).toBe(store.getState().alert.visible);
  });

  it('re-renders the host when its slice changes', async () => {
    const el = await mountLit<ProbeElement>('probe-element');
    const before = renders;

    store.dispatch(toggleAlert('heads up'));
    await el.updateComplete;

    expect(el.alert.value).toBe(true);
    expect(renders).toBeGreaterThan(before);
    expect(el.shadowRoot?.textContent).toContain('true');
  });

  it('does not re-render when an unrelated slice changes', async () => {
    const el = await mountLit<ProbeElement>('probe-element');
    const before = renders;

    // Touches `apps`, which no controller on this element selects.
    store.dispatch(setPullApp(true));
    await el.updateComplete;

    expect(renders).toBe(before);
  });

  it('stops listening once the host is disconnected', async () => {
    const el = await mountLit<ProbeElement>('probe-element');
    el.remove();
    await el.updateComplete;
    const before = renders;

    store.dispatch(toggleAlert('while detached'));
    await el.updateComplete;

    expect(renders).toBe(before);
  });

  it('picks up changes it missed while detached, on reconnect', async () => {
    const el = await mountLit<ProbeElement>('probe-element');
    el.remove();

    // The store moves while nobody is listening.
    store.dispatch(toggleAlert('missed this'));
    expect(el.alert.value).toBe(false);

    document.body.appendChild(el);
    await el.updateComplete;

    // Stale state must not survive a reconnect.
    expect(el.alert.value).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('true');
  });

  it('holds no subscription before the host connects', () => {
    // Constructing a controller must not subscribe: an element that is created and
    // never connected would otherwise leak, with itself as the GC root.
    const subscribe = vi.spyOn(store, 'subscribe');
    const host = {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    };

    const controller = new StoreController(host, (s: AppState) => s.alert.visible);

    expect(host.addController).toHaveBeenCalledWith(controller);
    expect(subscribe).not.toHaveBeenCalled();
    subscribe.mockRestore();
  });

  it('dispatches through the same store the selectors read', async () => {
    const el = await mountLit<ProbeElement>('probe-element');

    el.alert.dispatch(toggleAlert('via the controller'));
    await el.updateComplete;

    expect(store.getState().alert.message).toBe('via the controller');
    expect(el.alert.value).toBe(true);
  });

  describe('equality', () => {
    it('suppresses the re-render when a custom isEqual reports no change', async () => {
      const el = await mountLit<ProbeElement>('probe-element');
      const before = renders;

      // `derived` allocates a new object per call, but its isEqual compares by field,
      // and this action does not change `visible`.
      store.dispatch(setPullApp(false));
      await el.updateComplete;

      expect(renders).toBe(before);
    });

    // The hazard #697 describes, pinned so the cost is visible rather than folklore.
    it('re-renders on every store change when the selector allocates and isEqual is default', async () => {
      const el = await mountLit<NaiveElement>('naive-element');
      const before = el.renders;

      store.dispatch(setPullApp(true));
      await el.updateComplete;

      expect(el.renders).toBeGreaterThan(before);
    });
  });
});

describe('the store singleton', () => {
  it('is one instance, however many times it is imported', async () => {
    const again = await import('../../src/store/store');
    expect(again.store).toBe(store);
  });

  it('mounts every reducer in the root reducer', () => {
    expect(Object.keys(store.getState()).sort()).toEqual(
      [
        'account', 'alert', 'apps', 'consents', 'databases', 'dbSetting', 'dialog',
        'drawer', 'loading', 'styles', 'users',
      ].sort(),
    );
  });

  it('accepts a thunk, so the middleware is installed', () => {
    // configureStore installs redux-thunk by default; this fails loudly if the store
    // is ever rebuilt with a custom middleware array that omits it.
    expect(() => store.dispatch((() => {}) as never)).not.toThrow();
  });
});
