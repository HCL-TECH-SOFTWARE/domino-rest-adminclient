/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { getRouter } from './instance';
import { matchPath, type RouteParams, type RouterLocation, type To } from './router';

/**
 * A Lit reactive controller that binds an element to the router (#926).
 *
 * This is the framework-agnostic replacement for `useLocation` + `useNavigate` + `useParams`,
 * and the sibling of `store/StoreController.ts` in every respect — same construction, same
 * `hostConnected`/`hostDisconnected` discipline, same equality rule:
 *
 * ```ts
 * // React (before)
 * const { pathname } = useLocation();
 * const { nsfPath } = useParams<{ nsfPath: string }>();
 * const navigate = useNavigate();
 * navigate('/schema');
 *
 * // Lit (after)
 * private route = new RouterController(this, (location) => location.pathname);
 * // …
 * this.route.value;                       // the pathname
 * this.route.params('/schema/:nsfPath');  // { nsfPath } or null
 * this.route.navigate('/schema');
 * ```
 *
 * ### Why the subscription is set up in `hostConnected`, not the constructor
 *
 * A controller constructed but never connected must not hold a router subscription — that is
 * a leak with the element as its root. Lit calls `hostConnected` on every connect and
 * `hostDisconnected` on every disconnect, so an element moved in the DOM re-subscribes
 * correctly. The value is re-read on connect because the location can change while the
 * element is detached, and a stale `value` would render as fact.
 *
 * ### Equality, and why the default is the whole location
 *
 * Change detection is `Object.is` on the selector's result. The router hands out the *same*
 * location snapshot until the URL actually moves, so the default selector — the location
 * itself — re-renders the host exactly once per navigation and never otherwise.
 *
 * That default is still more than most elements want. A screen that only cares which page it
 * is on should select `location.pathname`, or it re-renders when a sibling records a view
 * preference in the query string. Selecting a slice is the cheap fix; `isEqual` is there for
 * a selector that has to allocate — `params()` deliberately is *not* a selector for that
 * reason, since a fresh object per call is never `Object.is`-equal.
 *
 * ### Navigation is not routed through `value`
 *
 * {@link navigate}, {@link href} and {@link prefetch} read the router on each call rather
 * than holding a reference from construction. That is what lets a test install a router after
 * an element exists, and what makes the controller safe to construct in a field initialiser —
 * before the element is connected and before anything has decided which router it belongs to.
 */
export class RouterController<T = RouterLocation> implements ReactiveController {
  /** The selected value. Read this in `render()`; the host re-renders when it changes. */
  value: T;

  private unsubscribe?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly selector: (location: RouterLocation) => T = (location) =>
      location as unknown as T,
    private readonly isEqual: (a: T, b: T) => boolean = Object.is,
  ) {
    host.addController(this);
    this.value = selector(getRouter().location());
  }

  hostConnected(): void {
    // The URL may have moved between construction and connection, or while the element was
    // detached. Re-read before subscribing so the first render is current.
    this.sync();
    this.unsubscribe = getRouter().subscribe(() => this.sync());
  }

  hostDisconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** The whole current location, whatever {@link value} was narrowed to. */
  get location(): RouterLocation {
    return getRouter().location();
  }

  /**
   * The `:param` values of `pattern` against the current pathname, or `null` when it does not
   * match — the replacement for `useParams`, with the route pattern named at the call site
   * instead of inherited from an outlet's context.
   *
   * An empty object is a *successful* match with no params, so callers test `!== null` rather
   * than truthiness. Values are percent-decoded, and a malformed escape decodes to itself
   * rather than throwing out of a render.
   */
  params(pattern: string): RouteParams | null {
    return matchPath(pattern, getRouter().location().pathname);
  }

  /** Go somewhere, or move through history with a number (`-1` is back). */
  navigate(to: To | number, options?: { replace?: boolean }): void {
    getRouter().navigate(to, options);
  }

  /** The full URL for a destination, base included. What goes in an `<a href>`. */
  href(to: To): string {
    return getRouter().href(to);
  }

  /** Start fetching the chunk behind `to` (#813). Undefined when nothing matches. */
  prefetch(to: To): Promise<unknown> | undefined {
    return getRouter().prefetch(to);
  }

  private sync(): void {
    const next = this.selector(getRouter().location());
    if (this.isEqual(next, this.value)) return;
    this.value = next;
    this.host.requestUpdate();
  }
}
