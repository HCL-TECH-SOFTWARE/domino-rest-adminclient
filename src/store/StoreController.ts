/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { store } from './store';
import type { AppDispatch, AppState } from './index';

/**
 * A Lit reactive controller that binds an element to a slice of the store (#715).
 *
 * This is the framework-agnostic replacement for `useSelector` + `useDispatch`. One
 * controller stands for one `useSelector`, so the conversion is a 1:1 rename rather
 * than a redesign:
 *
 * ```ts
 * // React (before)
 * const { authenticated } = useSelector((s: AppState) => s.account);
 * const dispatch = useDispatch();
 * dispatch(authenticate());
 *
 * // Lit (after)
 * private account = new StoreController(this, (s) => s.account);
 * // …
 * this.account.dispatch(authenticate());
 * render() { return html`${this.account.value.authenticated ? … : …}`; }
 * ```
 *
 * ### Why the subscription is set up in `hostConnected`, not the constructor
 *
 * A controller constructed but never connected must not hold a store subscription —
 * that is a leak with the element as its root. Lit calls `hostConnected` on every
 * connect and `hostDisconnected` on every disconnect, so an element that is moved in
 * the DOM re-subscribes correctly. The value is re-read on connect because the store
 * can move while the element is detached, and a stale `value` would render as fact.
 *
 * ### Equality
 *
 * Change detection is `Object.is` on the selector's result, mirroring what
 * `useSelector` did. That is correct for a selector returning a slice or a primitive,
 * and wrong for one that builds a new object or array on every call — those are never
 * `Object.is`-equal, so the element re-renders on *every* store change.
 *
 * There are still zero `createSelector` call sites in this codebase (#697), so that
 * hazard is real and unaddressed. Two ways out, in order of preference: memoize the
 * selector, or pass `isEqual` for a shallow comparison. The parameter exists so a
 * converted component has an answer that does not require #697 to land first.
 */
export class StoreController<T> implements ReactiveController {
  /** The current selected value. Read this in `render()`. */
  value: T;

  private unsubscribe?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly selector: (state: AppState) => T,
    private readonly isEqual: (a: T, b: T) => boolean = Object.is,
  ) {
    host.addController(this);
    this.value = selector(store.getState());
  }

  hostConnected(): void {
    // The store may have moved between construction and connection, or while the
    // element was detached. Re-read before subscribing so the first render is current.
    this.sync();
    this.unsubscribe = store.subscribe(() => this.sync());
  }

  hostDisconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** The store's dispatch, thunk overload included — replaces `useDispatch` (#694). */
  readonly dispatch: AppDispatch = store.dispatch;

  private sync(): void {
    const next = this.selector(store.getState());
    if (this.isEqual(next, this.value)) return;
    this.value = next;
    this.host.requestUpdate();
  }
}
