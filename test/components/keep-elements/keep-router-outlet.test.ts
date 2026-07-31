/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, nothing } from 'lit';
import '../../../src/components/keep-elements/keep-router-outlet';
import type RouterOutlet from '../../../src/components/keep-elements/keep-router-outlet';
import type { KeepRoute } from '../../../src/components/keep-elements/keep-router-outlet';
import { getRouter, setRouterForTest } from '../../../src/router/instance';
import { Router, memoryHistory } from '../../../src/router/router';
import { Level, Logger } from '../../../src/services/log-service';
import { cleanupLit, mountLit } from '../../test-utils/lit';

/**
 * #719 P4 — the Lit route outlet.
 *
 * The routing behaviour here is ported from `test/router/react.test.tsx`'s `RouterOutlet`
 * block, which stays where it is because `router/react.tsx` still serves `App.tsx`. What is
 * *not* ported is the React plumbing: the two "does it remount when the routes array changes
 * identity" cases were about `React.lazy` returning a fresh component type per call, and this
 * outlet has no such mechanism — the element is keyed on the route's `path`, which is a value,
 * so the whole hazard those tests guarded is gone rather than reimplemented.
 *
 * Two things are asserted that the React suite could not:
 *
 * - **The previous element is disconnected**, not merely absent from the markup. Every screen's
 *   teardown hangs off that, and `keep-navigation-guard` clears the registered save function in
 *   it.
 * - **A slow chunk cannot land on the wrong route.** The React version relied on Suspense to
 *   sort that out; here it is our own bookkeeping and testable directly.
 *
 * The router is the module singleton, reached exactly as the element reaches it — `setupTests.ts`
 * installs a memory-backed one per test and these replace it where they need a starting URL.
 */

const at = (entry: string) => setRouterForTest(new Router({ history: memoryHistory([entry]) }));

/** Two throwaway elements, so a route can render something identifiable. */
class RouteA extends HTMLElement {
  connectedCallback() {
    this.textContent = 'A';
  }
}
class RouteB extends HTMLElement {
  disconnected = 0;
  disconnectedCallback() {
    this.disconnected += 1;
  }
  connectedCallback() {
    this.textContent = 'B';
  }
}
customElements.define('outlet-route-a', RouteA);
customElements.define('outlet-route-b', RouteB);

const mount = (routes: readonly KeepRoute[], fallback?: ReturnType<typeof html>) =>
  mountLit<RouterOutlet>('keep-router-outlet', { routes, ...(fallback ? { fallback } : {}) });

/**
 * The rendered text, ignoring the stylesheet.
 *
 * jsdom has no `adoptedStyleSheets`, so Lit falls back to a real `<style>` element inside the
 * shadow root — and its rules land in `shadowRoot.textContent`. Reading that directly makes
 * every assertion about what a route rendered pass or fail on the CSS instead.
 */
const text = (el: RouterOutlet) =>
  [...(el.shadowRoot?.children ?? [])]
    .filter((child) => child.tagName !== 'STYLE')
    .map((child) => child.textContent ?? '')
    .join('')
    .trim();

/**
 * Messages sent to the error log.
 *
 * `Logger` captures `console.error` into its target map when the module first loads, so
 * `vi.spyOn(console, 'error')` replaces a reference nothing reads any more and the assertion
 * passes for the wrong reason. Replacing the target is the seam that works.
 */
let errors: unknown[][] = [];

beforeEach(() => {
  errors = [];
  Logger.setLogTarget(Level.ERROR, (...args) => {
    errors.push(args);
  });
});

afterEach(() => {
  Logger.setLogTarget(Level.ERROR, console.error);
  cleanupLit();
});

describe('keep-router-outlet', () => {
  describe('matching', () => {
    const routes: KeepRoute[] = [
      { path: '/', render: () => html`<span>home</span>` },
      { path: '/schema', render: () => html`<span>schemas</span>` },
      { path: '/schema/:dbName', render: () => html`<span>forms</span>` },
    ];

    it('renders the matching route', async () => {
      at('/schema');
      const el = await mount(routes);
      expect(text(el)).toBe('schemas');
    });

    it('swaps the rendered route on navigation', async () => {
      at('/');
      const el = await mount(routes);
      expect(text(el)).toBe('home');

      getRouter().navigate('/schema/Alpha');
      await el.updateComplete;

      expect(text(el)).toBe('forms');
    });

    it('renders nothing when no route matches', async () => {
      at('/settings/account');
      const el = await mount(routes);
      expect(text(el)).toBe('');
    });

    it('matches in declaration order, so a catch-all shadows what follows it', async () => {
      at('/schema');
      const el = await mount([
        { path: '*', render: () => html`<span>catch-all</span>` },
        { path: '/schema', render: () => html`<span>schemas</span>` },
      ]);
      expect(text(el)).toBe('catch-all');
    });

    it('ignores a query-string-only navigation', async () => {
      at('/schema');
      const seen: string[] = [];
      const el = await mount([
        {
          path: '/schema',
          render: () => {
            seen.push('render');
            return html`<span>schemas</span>`;
          },
        },
      ]);
      const before = seen.length;

      // What the schemas and scopes screens do when they record the chosen view. The outlet's
      // decision cannot have changed, so it must not re-render — and must certainly not tear
      // the screen down and rebuild it.
      getRouter().navigate({ pathname: '/schema', search: '?view=list' });
      await el.updateComplete;

      expect(getRouter().location().search).toBe('?view=list');
      expect(seen.length).toBe(before);
    });
  });

  describe('params', () => {
    const paramRoute = (seen: string[]): KeepRoute[] => [
      {
        path: '/schema/:nsfPath/:dbName',
        render: (params) => {
          seen.push(JSON.stringify(params));
          return html`<span>${params.dbName}</span>`;
        },
      },
    ];

    it('hands the matched params to the route', async () => {
      at('/schema/orders.nsf/Alpha');
      const seen: string[] = [];
      const el = await mount(paramRoute(seen));

      expect(JSON.parse(seen.at(-1)!)).toEqual({ nsfPath: 'orders.nsf', dbName: 'Alpha' });
      expect(text(el)).toBe('Alpha');
    });

    it('updates when the same route matches different params', async () => {
      at('/schema/orders.nsf/Alpha');
      const seen: string[] = [];
      const el = await mount(paramRoute(seen));

      getRouter().navigate('/schema/sales.nsf/Beta');
      await el.updateComplete;

      expect(JSON.parse(seen.at(-1)!)).toEqual({ nsfPath: 'sales.nsf', dbName: 'Beta' });
      expect(text(el)).toBe('Beta');
    });

    it('decodes them, and survives a malformed escape', async () => {
      at('/schema/my%20apps.nsf/100%');
      const seen: string[] = [];
      await mount(paramRoute(seen));

      // A hand-edited address bar can carry a stray percent; decoding it must not throw out of
      // a render and blank the app.
      expect(JSON.parse(seen.at(-1)!)).toEqual({ nsfPath: 'my apps.nsf', dbName: '100%' });
    });
  });

  describe('guard', () => {
    it('renders the route when the guard passes', async () => {
      at('/schema');
      const el = await mount([
        { path: '/schema', render: () => html`<span>schemas</span>`, guard: () => true },
      ]);
      expect(text(el)).toBe('schemas');
    });

    it('redirects when the guard fails, and renders the destination', async () => {
      at('/schema');
      const el = await mount([
        { path: '/', render: () => html`<span>home</span>` },
        {
          path: '/schema',
          render: () => html`<span>schemas</span>`,
          guard: () => false,
          redirectTo: '/',
        },
      ]);

      expect(getRouter().location().pathname).toBe('/');
      // React's `<Navigate>` moved the URL from an effect, so a blocked route painted one blank
      // frame first. The resolution loop here re-decides inside the same update.
      expect(text(el)).toBe('home');
    });

    it('replaces rather than pushes, so Back does not bounce off the guard', async () => {
      const router = setRouterForTest(new Router({ history: memoryHistory(['/', '/schema']) }));
      const el = await mount([
        { path: '/', render: () => html`<span>home</span>` },
        { path: '/schema', render: () => html`<span>schemas</span>`, guard: () => false, redirectTo: '/' },
      ]);
      expect(text(el)).toBe('home');

      // `/schema` was replaced, so one step back is the entry before it — not `/schema` again.
      router.navigate(-1);
      await el.updateComplete;
      expect(router.location().pathname).toBe('/');
    });

    it('renders nothing when the guard fails with no redirect', async () => {
      at('/schema');
      const el = await mount([
        { path: '/schema', render: () => html`<span>schemas</span>`, guard: () => false },
      ]);

      expect(text(el)).toBe('');
      expect(getRouter().location().pathname).toBe('/schema');
    });

    it('re-runs the guard, so a predicate over live state takes effect', async () => {
      at('/schema');
      let allowed = false;
      const el = await mount([
        { path: '/schema', render: () => html`<span>schemas</span>`, guard: () => allowed },
      ]);
      expect(text(el)).toBe('');

      allowed = true;
      el.requestUpdate();
      await el.updateComplete;

      expect(text(el)).toBe('schemas');
    });

    it('stops rather than spinning when a route redirects to itself', async () => {
      at('/schema');
      const el = await mount([
        { path: '/schema', render: () => html`<span>schemas</span>`, guard: () => false, redirectTo: '/schema' },
      ]);

      expect(text(el)).toBe('');
      expect(getRouter().location().pathname).toBe('/schema');
    });

    it('gives up on a redirect cycle instead of hanging the tab', async () => {
      at('/a');
      const el = await mount([
        { path: '/a', render: () => html`<span>a</span>`, guard: () => false, redirectTo: '/b' },
        { path: '/b', render: () => html`<span>b</span>`, guard: () => false, redirectTo: '/a' },
      ]);

      // Bounded, and the last hop leaves nothing on screen rather than a stack overflow.
      expect(text(el)).toBe('');
      expect(errors.flat().join(' ')).toContain('redirects in a cycle');
    });
  });

  describe('load', () => {
    /** A `load` that resolves only when the test says so. */
    const deferred = () => {
      let resolve!: () => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    it('shows the fallback, then the loaded element', async () => {
      at('/schema');
      const gate = deferred();
      const el = await mount(
        [{ path: '/schema', tag: 'outlet-route-a', load: () => gate.promise }],
        html`<span>loading</span>`,
      );

      expect(text(el)).toBe('loading');

      gate.resolve();
      await gate.promise;
      await el.updateComplete;

      expect(text(el)).toBe('A');
      expect(el.shadowRoot?.querySelector('outlet-route-a')).toBeTruthy();
    });

    it('creates the element synchronously when the route has no load', async () => {
      at('/schema');
      const el = await mount(
        [{ path: '/schema', tag: 'outlet-route-a' }],
        html`<span>loading</span>`,
      );
      expect(text(el)).toBe('A');
    });

    /**
     * The ordering the whole route table leans on. `keep-views` guards all seven routes on
     * authentication, so a `load` reached before the guard would hand an anonymous visitor the
     * chunk for the screen they are being redirected away from.
     */
    it('never calls load when the guard fails', async () => {
      at('/schema');
      const load = vi.fn().mockResolvedValue(undefined);
      await mount([
        { path: '/', render: () => html`<span>home</span>` },
        { path: '/schema', tag: 'outlet-route-a', load, guard: () => false, redirectTo: '/' },
      ]);

      expect(load).not.toHaveBeenCalled();
      expect(getRouter().location().pathname).toBe('/');
    });

    it('prefers render over tag when a route somehow has both', async () => {
      at('/schema');
      const load = vi.fn().mockResolvedValue(undefined);
      const el = await mount([
        { path: '/schema', render: () => html`<span>eager</span>`, tag: 'outlet-route-a', load },
      ]);

      expect(text(el)).toBe('eager');
      expect(load).not.toHaveBeenCalled();
    });

    it('loads once per route, not once per render', async () => {
      at('/schema');
      const load = vi.fn().mockResolvedValue(undefined);
      const el = await mount([{ path: '/schema/:dbName', tag: 'outlet-route-a', load }]);
      await el.updateComplete;

      // A params-only move inside the same route, then a plain re-render. Neither is a new
      // route, so neither may refetch — nor remount the screen the user is working in.
      getRouter().navigate('/schema/Beta');
      await el.updateComplete;
      el.requestUpdate();
      await el.updateComplete;

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('keeps the same element instance across a params-only navigation', async () => {
      at('/schema/Alpha');
      const el = await mount([{ path: '/schema/:dbName', tag: 'outlet-route-b' }]);
      const first = el.shadowRoot!.querySelector('outlet-route-b') as RouteB;

      getRouter().navigate('/schema/Beta');
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('outlet-route-b')).toBe(first);
      expect(first.disconnected).toBe(0);
    });

    it('disconnects the previous element when the route changes', async () => {
      at('/b');
      const el = await mount([
        { path: '/a', tag: 'outlet-route-a' },
        { path: '/b', tag: 'outlet-route-b' },
      ]);
      const previous = el.shadowRoot!.querySelector('outlet-route-b') as RouteB;

      getRouter().navigate('/a');
      await el.updateComplete;

      expect(previous.disconnected).toBe(1);
      expect(previous.isConnected).toBe(false);
      expect(el.shadowRoot!.querySelector('outlet-route-b')).toBeNull();
      expect(text(el)).toBe('A');
    });

    it('drops the previous element immediately, not when the next one arrives', async () => {
      at('/b');
      const gate = deferred();
      const el = await mount(
        [
          { path: '/a', tag: 'outlet-route-a', load: () => gate.promise },
          { path: '/b', tag: 'outlet-route-b' },
        ],
        html`<span>loading</span>`,
      );
      expect(text(el)).toBe('B');

      getRouter().navigate('/a');
      await el.updateComplete;

      // Leaving it up would render the previous route's screen under the new route's URL for
      // as long as the chunk takes.
      expect(el.shadowRoot!.querySelector('outlet-route-b')).toBeNull();
      expect(text(el)).toBe('loading');
    });

    it('drops a chunk that resolves for a route the user has left', async () => {
      at('/a');
      const slow = deferred();
      const el = await mount([
        { path: '/a', tag: 'outlet-route-a', load: () => slow.promise },
        { path: '/b', tag: 'outlet-route-b' },
      ]);

      getRouter().navigate('/b');
      await el.updateComplete;
      expect(text(el)).toBe('B');

      slow.resolve();
      await slow.promise;
      await el.updateComplete;

      // The late chunk must not mount its element over the route actually on screen.
      expect(el.shadowRoot!.querySelector('outlet-route-a')).toBeNull();
      expect(text(el)).toBe('B');
    });

    it('leaves the fallback up when the chunk fails, and reports it', async () => {
      at('/schema');
      const gate = deferred();
      const el = await mount(
        [{ path: '/schema', tag: 'outlet-route-a', load: () => gate.promise }],
        html`<span>loading</span>`,
      );

      gate.reject(new Error('offline'));
      await gate.promise.catch(() => {});
      await el.updateComplete;

      // Blanking the page would leave nothing on screen and nothing in the console either.
      expect(text(el)).toBe('loading');
      expect(errors.flat().join(' ')).toContain('Failed to load route module');
    });

    it('reports a module that resolves without registering its element', async () => {
      at('/schema');
      const loaded = Promise.resolve();
      const el = await mount(
        [{ path: '/schema', tag: 'outlet-never-registered', load: () => loaded }],
        html`<span>loading</span>`,
      );
      await loaded;
      await el.updateComplete;

      // Rendering an un-upgraded element would put an empty inline box on screen with nothing
      // anywhere to say the route is broken.
      expect(el.shadowRoot?.querySelector('outlet-never-registered')).toBeNull();
      expect(errors.flat().join(' ')).toContain('did not register its element');
    });
  });

  describe('the route table it publishes', () => {
    it('gives Router.prefetch something to match against', async () => {
      at('/');
      const load = vi.fn().mockResolvedValue(undefined);
      const el = await mount([
        { path: '/', render: () => nothing },
        { path: '/schema', tag: 'outlet-route-a', load },
      ]);
      await el.updateComplete;

      // The hover handlers in the sidebar call `prefetch`, which matches against whatever the
      // view layer last published — so an outlet that never publishes silently disables it.
      await getRouter().prefetch('/schema');

      expect(load).toHaveBeenCalledTimes(1);
    });
  });

  it('adds no box of its own', async () => {
    // A wrapper box between the main region and a route root would change every page-level
    // height rule in the app, all of which are written against the main column.
    at('/');
    const el = await mount([{ path: '/', render: () => html`<span>home</span>` }]);
    expect((el.constructor as typeof RouterOutlet).styles?.toString()).toContain(
      'display: contents',
    );
  });
});
