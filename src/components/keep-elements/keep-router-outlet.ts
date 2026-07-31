/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { RouterController } from '../../router/RouterController';
import { getRouter } from '../../router/instance';
import { matchRoutes, type LoadableRoute, type RouteParams } from '../../router/router';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-elements/keep-router-outlet');

/** What a route may render: an eager template, or nothing. */
type RouteContent = TemplateResult | typeof nothing;

/**
 * A route in a {@link RouterOutlet} table.
 *
 * The Lit counterpart of `router/react.tsx`'s `RouteDef`, and the one shape difference
 * between them is the reason this element exists.
 *
 * `React.lazy` needs a module whose **default export is a component**, and a `keep-*` module's
 * default export is an element *class*. That mismatch is what kept 20 of the 22 `@lit/react`
 * wrappers alive: each was a component-shaped door onto an element module, opened once per
 * route. A route here names the element it wants as a {@link tag} and imports the module for
 * its `@customElement` side effect alone, so the door is not needed.
 */
export interface KeepRoute extends LoadableRoute {
  /** Base-relative pattern: literal segments, `:param`, or a trailing `*`. */
  path: string;
  /** The custom element to render, e.g. `'keep-schemas-list'`. */
  tag?: string;
  /**
   * Import the module that registers {@link tag}. Omit for an element already on the eager
   * path — the outlet then creates it synchronously and no fallback is shown.
   *
   * **Write the `import()` inline at the route.** The specifier has to be statically
   * analysable, or the bundler emits one chunk for everything instead of one per route.
   */
  load?: () => Promise<unknown>;
  /**
   * Eager markup, given the matched params. The replacement for `RouteDef.element`, and the
   * one place a route's params are handed *to* a view rather than read from the URL by it.
   * Wins over {@link tag}, as `element` won over `load`.
   */
  render?: (params: RouteParams) => RouteContent;
  /**
   * Rendered only when this returns true. Called on every match, so it may read live store
   * state — which is what replaced wrapping routes in a `<PrivateRoutes/>` whose `<Outlet/>`
   * was the real child.
   */
  guard?: () => boolean;
  /** Where a failed {@link guard} sends the user. Renders nothing when omitted. */
  redirectTo?: string;
}

/** No params. Shared and frozen, so "no match" never allocates. */
const NO_PARAMS: RouteParams = Object.freeze({});

/**
 * How many redirects one resolution may follow before it is called a cycle.
 *
 * A table that sends `/a` to `/b` and `/b` back to `/a` is a bug in the table, but an
 * unbounded loop turns it into a hung tab with no message. Five is far more than the app's
 * one hop and cheap enough to never think about.
 */
const MAX_REDIRECT_HOPS = 5;

/**
 * Renders the first route in {@link routes} that matches the current location.
 * Tag: `keep-router-outlet`.
 *
 * Order is significant and not ranked — see `matchRoutes`. Nothing renders when no route
 * matches; a host that needs a fallback declares a trailing `'*'`.
 *
 * ### Two orderings are load-bearing, and both are silent when broken
 *
 * - **`guard` runs before `load`.** An unauthenticated visitor is redirected without ever
 *   fetching the chunk behind the route they asked for. Every route in `keep-views` is
 *   guarded on authentication, so getting this backwards would leak seven views to anonymous
 *   traffic with nothing about the rendered page to say so.
 * - **The mounted element is keyed on the route's `path`, not on its params.** Navigating
 *   `/schema/a.nsf/alpha` → `/schema/b.nsf/beta` keeps the same `keep-forms-container`
 *   instance, which re-reads the URL through its own `RouterController`. Keying on params
 *   would tear the screen down and refetch it on every row click.
 *
 * ### Why the view is a DOM node rather than a static template
 *
 * `document.createElement(tag)` once the module resolves, held in reactive state and handed to
 * Lit as a child value. Lit removes the node it replaces, so switching routes disconnects the
 * previous element — which is what `keep-navigation-guard` and every screen's
 * `hostDisconnected` rely on. `static-html`'s `unsafeStatic` would cache a template per tag
 * string and buy nothing, since the tag is only ever one of seven literals.
 *
 * ### Redirects resolve inside one update, not on the next
 *
 * React's `<Navigate>` moved the URL from an effect, so a blocked route painted one empty
 * frame before the redirect landed. Here the resolution loop re-runs against the new location
 * immediately: a guard that fails renders the *destination*, not a blank. `RouterController`
 * updates its value synchronously inside `navigate`, which is what makes that readable.
 *
 * The host is `display: contents`: an outlet is a decision, not a box, and a wrapper box
 * between the main region and a route root would change every page-level height rule.
 */
@customElement('keep-router-outlet')
export default class RouterOutlet extends KeepElement {
  static readonly styles = css`
    :host {
      display: contents;
    }
  `;

  /** The route table. Declaration order decides; a catch-all goes last. */
  @property({ attribute: false }) accessor routes: readonly KeepRoute[] = [];

  /** Shown while a `load` route's chunk is in flight. */
  @property({ attribute: false }) accessor fallback: RouteContent = nothing;

  /*
   * The pathname only. A route match cannot change on a query-string-only navigation, and the
   * schemas and scopes screens record their chosen view in exactly that way — selecting the
   * whole location would rebuild the outlet's decision on every one of them.
   */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /**
   * The element for the route currently on screen.
   *
   * Reactive because it arrives asynchronously: the update that starts the import renders the
   * fallback, and the one this assignment schedules renders the view.
   */
  @state() private accessor view: Element | null = null;

  /** The route the current location resolves to, or null for no match / blocked. */
  private active: KeepRoute | null = null;

  /** The params of {@link active}, for a route that renders eagerly. */
  private activeParams: RouteParams = NO_PARAMS;

  /** The `path` {@link view} was built for, so a params-only move keeps the instance. */
  private mountedPath: string | null = null;

  /**
   * The `path` the in-flight import belongs to. A chunk that resolves after the user has moved
   * on must not mount its element over the route they are actually looking at.
   */
  private loadingPath: string | null = null;

  /*
   * Matching, guarding and loading all happen on the way *into* an update rather than after
   * one. A redirect or an import started in `updated()` would schedule a second update per
   * navigation, and the first painted frame would be the one the user is being sent away from.
   */
  protected willUpdate(): void {
    /*
     * Republished on every update rather than only when `routes` changes. `Router.prefetch` is
     * the only reader, this is a plain field assignment, and keying it off the
     * changed-properties map is wrong the moment a host mutates its table in place.
     */
    getRouter().setRoutes(this.routes);
    this.resolve();
  }

  /** Decide what this location renders, following `redirectTo` until something sticks. */
  private resolve(): void {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const matched = matchRoutes(this.routes, this.route.value);
      if (!matched) {
        this.show(null, NO_PARAMS);
        return;
      }

      const { route, params } = matched;
      // Before `load`, and before anything is created. See the class note.
      if (!route.guard || route.guard()) {
        this.show(route, params);
        return;
      }

      this.show(null, NO_PARAMS);
      if (!route.redirectTo) return;

      const from = this.route.value;
      /*
       * `replace`, as `<Navigate>` did. The URL being redirected away from must not become a
       * back-button destination, or Back lands on the guard again and bounces.
       */
      this.route.navigate(route.redirectTo, { replace: true });
      // A redirect to where we already are decides nothing; stop rather than spin.
      if (this.route.value === from) return;
    }

    log.error('Route table redirects in a cycle', { pathname: this.route.value });
  }

  /** Record the decision, and bring the element it needs into being. */
  private show(route: KeepRoute | null, params: RouteParams): void {
    this.active = route;
    this.activeParams = params;
    this.mount(route?.render ? null : route);
  }

  /**
   * Make `route`'s element the mounted one, importing its module first if it has not been.
   *
   * A no-op when the route has not changed, which is what keeps an instance alive across a
   * params-only navigation.
   */
  private mount(route: KeepRoute | null): void {
    const path = route?.path ?? null;
    if (path === this.mountedPath) return;

    this.mountedPath = path;
    this.loadingPath = path;
    /*
     * Dropped now rather than when the next one arrives. Leaving it would render the previous
     * route's element under the new route's URL for as long as the import takes.
     */
    this.view = null;

    const tag = route?.tag;
    if (!tag) return;

    const create = () => {
      // A slower chunk for a route the user has since left.
      if (this.loadingPath !== path) return;
      if (!customElements.get(tag)) {
        log.error('Route module did not register its element', { path, tag });
        return;
      }
      this.view = document.createElement(tag);
    };

    if (!route.load) {
      create();
      return;
    }

    void route.load().then(create, (error: unknown) => {
      /*
       * A failed chunk leaves the fallback up rather than blanking the page. It is not retried
       * on the spot — `React.lazy` did not either — but navigating away and back re-enters
       * `mount` with a changed `mountedPath`, and `Router.prefetch` does not cache failures,
       * so the retry is one click away.
       */
      log.error('Failed to load route module', { path, error });
    });
  }

  render() {
    const route = this.active;
    if (!route) return nothing;
    if (route.render) return route.render(this.activeParams);
    return this.view ?? this.fallback;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-router-outlet': RouterOutlet;
  }
}
