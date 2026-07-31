/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LitElement, html } from 'lit';
import { RouterController } from '../../src/router/RouterController';
import {
  ROUTER_BASE,
  getRouter,
  resetRouterForTest,
  setRouterForTest,
} from '../../src/router/instance';
import { Router, memoryHistory, type RouterLocation } from '../../src/router/router';
import { cleanupLit, mountLit } from '../test-utils/lit';

/**
 * #926 — `RouterController` is the framework-agnostic replacement for `useLocation` +
 * `useNavigate` + `useParams`, and the primitive four route roots and the whole home subtree
 * lean on. It is unit-tested here the way `StoreController` is, and for the same reason: a
 * subtle fault in it surfaces as "some screen occasionally does not react to the URL" spread
 * across every file that navigates.
 *
 * The host is a real `LitElement` rather than a stub. The contract under test is
 * `hostConnected`/`hostDisconnected`, and those are called by Lit, not by us — a hand-made
 * host would only assert my own idea of when Lit calls them.
 *
 * The router is the module singleton, reached exactly as an element reaches it. `setupTests.ts`
 * installs a fresh memory-backed one for every test in the suite and disposes it afterwards;
 * these tests replace it where they need a particular starting URL. A mock router would not
 * prove the subscription is wired to the thing the app actually uses.
 */

const at = (entry: string) => setRouterForTest(new Router({ history: memoryHistory([entry]) }));

let renders = 0;

/** Selects the pathname — the narrowing every converted screen uses. */
class PathElement extends LitElement {
  route = new RouterController(this, (location) => location.pathname);

  render() {
    renders++;
    return html`<span>${this.route.value}</span>`;
  }
}
customElements.define('router-path-element', PathElement);

/** No selector: the whole location, which is the controller's default. */
class WholeElement extends LitElement {
  route = new RouterController(this);
  renders = 0;

  render() {
    this.renders++;
    return html`<span>${this.route.value.search}</span>`;
  }
}
customElements.define('router-whole-element', WholeElement);

/** A deliberately allocating selector with nothing to rescue it. */
class NaiveElement extends LitElement {
  route = new RouterController(this, (location) => ({ pathname: location.pathname }));
  renders = 0;

  render() {
    this.renders++;
    return html`<span>ok</span>`;
  }
}
customElements.define('router-naive-element', NaiveElement);

/**
 * The same allocating selector, rescued by an `isEqual`.
 *
 * Its own element rather than a second controller on {@link NaiveElement}: two controllers
 * on one host fold into a single update, so a fired guard would be invisible behind the
 * other one's re-render and the test would pass either way.
 */
class GuardedElement extends LitElement {
  route = new RouterController(
    this,
    (location) => ({ pathname: location.pathname }),
    (a, b) => a.pathname === b.pathname,
  );
  renders = 0;

  render() {
    this.renders++;
    return html`<span>ok</span>`;
  }
}
customElements.define('router-guarded-element', GuardedElement);

describe('RouterController', () => {
  beforeEach(() => {
    renders = 0;
  });

  afterEach(() => {
    cleanupLit();
  });

  it('exposes the selected value before the first render', async () => {
    at('/schema?view=nsf');
    const el = await mountLit<PathElement>('router-path-element');

    expect(el.route.value).toBe('/schema');
    expect(el.shadowRoot?.textContent).toContain('/schema');
  });

  it('re-renders the host when the location changes', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');
    const before = renders;

    el.route.navigate('/scope');
    await el.updateComplete;

    expect(el.route.value).toBe('/scope');
    expect(renders).toBeGreaterThan(before);
    expect(el.shadowRoot?.textContent).toContain('/scope');
  });

  it('does not re-render when the part it selected did not change', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');
    const before = renders;

    // A query-string-only navigation, which is exactly what the schemas and scopes screens
    // do when they record the chosen view. The pathname is unchanged, so this element must
    // not be re-rendered for it.
    el.route.navigate({ pathname: '/schema', search: '?view=stack' });
    await el.updateComplete;

    expect(getRouter().location().search).toBe('?view=stack');
    expect(renders).toBe(before);
  });

  it('stops listening once the host is disconnected', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');
    el.remove();
    await el.updateComplete;
    const before = renders;

    getRouter().navigate('/scope');
    await el.updateComplete;

    expect(renders).toBe(before);
  });

  it('picks up changes it missed while detached, on reconnect', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');
    el.remove();

    // The URL moves while nobody is listening.
    getRouter().navigate('/scope');
    expect(el.route.value).toBe('/schema');

    document.body.appendChild(el);
    await el.updateComplete;

    // Stale state must not survive a reconnect.
    expect(el.route.value).toBe('/scope');
    expect(el.shadowRoot?.textContent).toContain('/scope');
  });

  it('holds no subscription before the host connects', () => {
    // Constructing a controller must not subscribe: an element that is created and never
    // connected would otherwise leak, with itself as the GC root.
    const subscribe = vi.spyOn(getRouter(), 'subscribe');
    const host = {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    };

    const controller = new RouterController(host);

    expect(host.addController).toHaveBeenCalledWith(controller);
    expect(subscribe).not.toHaveBeenCalled();

    // And disconnecting one that never connected is a no-op rather than a crash — Lit calls
    // `hostDisconnected` on every disconnect, including ones that follow no connect.
    expect(() => controller.hostDisconnected()).not.toThrow();
    subscribe.mockRestore();
  });

  it('navigates the same router the selector reads', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');

    el.route.navigate('/scope');
    await el.updateComplete;

    expect(getRouter().location().pathname).toBe('/scope');
    expect(el.route.value).toBe('/scope');
  });

  it('passes navigation options and history deltas through', async () => {
    at('/schema');
    const el = await mountLit<PathElement>('router-path-element');

    el.route.navigate('/scope');
    el.route.navigate('/apps', { replace: true });
    await el.updateComplete;
    expect(el.route.value).toBe('/apps');

    // `/apps` replaced `/scope`, so one step back is the entry before it.
    el.route.navigate(-1);
    await el.updateComplete;
    expect(el.route.value).toBe('/schema');
  });

  describe('the whole location, which is the default', () => {
    it('re-renders once per navigation, including a query-only one', async () => {
      at('/schema');
      const el = await mountLit<WholeElement>('router-whole-element');
      const before = el.renders;

      el.route.navigate({ pathname: '/schema', search: '?view=stack' });
      await el.updateComplete;

      expect(el.route.value.search).toBe('?view=stack');
      expect(el.renders).toBe(before + 1);
    });

    it('does not re-render for a navigation the router drops as a no-op', async () => {
      at('/schema');
      const el = await mountLit<WholeElement>('router-whole-element');
      const before = el.renders;

      // Re-clicking the active sidebar item. The router does not push it, so nothing moves
      // and the snapshot keeps its identity — which is what the default `Object.is` reads.
      el.route.navigate('/schema');
      await el.updateComplete;

      expect(el.renders).toBe(before);
    });
  });

  describe('params', () => {
    it('reads the values a pattern captures', async () => {
      at('/schema/demo.nsf/demoapi');
      const el = await mountLit<PathElement>('router-path-element');

      expect(el.route.params('/schema/:nsfPath/:dbName')).toEqual({
        nsfPath: 'demo.nsf',
        dbName: 'demoapi',
      });
    });

    it('answers null for a pathname the pattern does not match', async () => {
      at('/scope');
      const el = await mountLit<PathElement>('router-path-element');

      // Null rather than `{}`, because `{}` is a *successful* match with no params — the two
      // are the difference between "this screen is on its route" and "it is not".
      expect(el.route.params('/schema/:nsfPath/:dbName')).toBeNull();
      expect(el.route.params('/scope')).toEqual({});
    });

    it('decodes captured segments, and leaves a malformed escape alone', async () => {
      at('/schema/my%20apps.nsf/demoapi');
      const el = await mountLit<PathElement>('router-path-element');
      expect(el.route.params('/schema/:nsfPath/:dbName')?.nsfPath).toBe('my apps.nsf');

      at('/schema/100%/demoapi');
      const bad = await mountLit<PathElement>('router-path-element');
      // A hand-edited address bar can carry a stray percent. Decoding it would throw
      // `URIError` out of a render and blank the app.
      expect(bad.route.params('/schema/:nsfPath/:dbName')?.nsfPath).toBe('100%');
    });

    it('follows the URL, so a screen re-reads its params after a navigation', async () => {
      at('/schema/a.nsf/alpha');
      const el = await mountLit<PathElement>('router-path-element');

      el.route.navigate('/schema/b.nsf/beta');
      await el.updateComplete;

      expect(el.route.params('/schema/:nsfPath/:dbName')).toEqual({
        nsfPath: 'b.nsf',
        dbName: 'beta',
      });
    });
  });

  describe('location, href and prefetch', () => {
    it('exposes the whole location even when the selector narrowed it', async () => {
      at('/schema?view=nsf#top');
      const el = await mountLit<PathElement>('router-path-element');

      expect(el.route.value).toBe('/schema');
      expect(el.route.location).toEqual<RouterLocation>({
        pathname: '/schema',
        search: '?view=nsf',
        hash: '#top',
      });
    });

    it('applies the basename in href, which is what an anchor needs', async () => {
      setRouterForTest(new Router({ base: '/admin/ui', history: memoryHistory(['/schema']) }));
      const el = await mountLit<PathElement>('router-path-element');

      expect(el.route.value).toBe('/schema');
      expect(el.route.href('/scope')).toBe('/admin/ui/scope');
    });

    it('prefetches through the router, so the per-route cache is shared', async () => {
      const router = at('/schema');
      const load = vi.fn().mockResolvedValue({ default: () => null });
      router.setRoutes([{ path: '/scope', load }]);
      const el = await mountLit<PathElement>('router-path-element');

      const first = el.route.prefetch('/scope');
      const second = el.route.prefetch('/scope');

      await first;
      expect(load).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
      expect(el.route.prefetch('/nowhere')).toBeUndefined();
    });
  });

  describe('equality', () => {
    it('suppresses the re-render when a custom isEqual reports no change', async () => {
      at('/schema');
      const el = await mountLit<GuardedElement>('router-guarded-element');
      const before = el.renders;

      // The selector allocates a fresh object per call, but its isEqual compares by field and
      // this navigation does not change the pathname.
      el.route.navigate({ pathname: '/schema', search: '?view=stack' });
      await el.updateComplete;

      expect(el.route.value).toEqual({ pathname: '/schema' });
      expect(el.renders).toBe(before);
    });

    it('still re-renders a guarded selector when the compared field does change', async () => {
      at('/schema');
      const el = await mountLit<GuardedElement>('router-guarded-element');
      const before = el.renders;

      el.route.navigate('/scope');
      await el.updateComplete;

      expect(el.route.value).toEqual({ pathname: '/scope' });
      expect(el.renders).toBe(before + 1);
    });

    // The hazard `StoreController` documents, pinned here so the cost is visible rather than
    // folklore: a selector that allocates is never `Object.is`-equal to its previous result.
    it('re-renders on every navigation when the selector allocates and isEqual is default', async () => {
      at('/schema');
      const el = await mountLit<NaiveElement>('router-naive-element');
      const before = el.renders;

      el.route.navigate({ pathname: '/schema', search: '?view=stack' });
      await el.updateComplete;
      el.route.navigate({ pathname: '/schema', search: '?view=card' });
      await el.updateComplete;

      expect(el.renders).toBe(before + 2);
    });
  });
});

describe('the router singleton', () => {
  it('is one instance, however many times it is asked for', () => {
    expect(getRouter()).toBe(getRouter());
  });

  it('builds a browser-backed router carrying the app basename when none is installed', () => {
    resetRouterForTest();

    // Reads only. A `navigate` here would push onto jsdom's shared history, which is the
    // whole reason `setupTests.ts` installs a memory router for every other test.
    const router = getRouter();
    expect(router.base).toBe(ROUTER_BASE);
    expect(router.href('/scope')).toBe('/admin/ui/scope');
  });

  it('disposes the router it replaces, so no listener outlives the test that made it', () => {
    const first = at('/schema');
    const dispose = vi.spyOn(first, 'dispose');

    at('/scope');

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(getRouter().location().pathname).toBe('/scope');
  });

  it('is safe to reset twice, which is what a suite that installs nothing does', () => {
    resetRouterForTest();
    expect(() => resetRouterForTest()).not.toThrow();
  });

  it('stops an installed router from hearing the history it no longer owns', () => {
    const first = at('/schema');
    const seen = vi.fn();
    first.subscribe(seen);

    at('/scope');
    getRouter().navigate('/apps');

    expect(seen).not.toHaveBeenCalled();
  });
});
