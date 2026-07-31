/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LitElement } from 'lit';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import { authenticate, removeAuth } from '../../../src/store/account/action';
// The bare import is what registers the element. The default binding below is used only in
// type position, and a lone type-position use is *erased* — so without this line the module
// never evaluates, `keep-app` is never defined, and every assertion here reads an inert
// `HTMLElement` that renders nothing (BRIEF §19).
import '../../../src/components/keep-elements/keep-app';
import type App from '../../../src/components/keep-elements/keep-app';

const TAG = 'keep-app';

/**
 * The one thunk on the boot path, replaced with a marker action.
 *
 * `authenticate`, `removeAuth` and `setIdpLogin` are plain `createSlice` actions and are left
 * alone — their types are what the recorder below reads. `renewToken` posts to the API, and
 * what is worth asserting is that the boot path *chooses* it for a password token inside its
 * window, which a marker shows and a real thunk (parked on a request that never resolves)
 * would not.
 */
const RENEW = { type: 'test/renewToken' } as const;

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  renewToken: () => RENEW,
}));

/**
 * `App.tsx`'s Lit replacement, and the end of #719.
 *
 * The component had three tests. Two are ported below — the login screen renders for an
 * anonymous visitor, and `login-success` goes home — and the third is not: it asserted that
 * the login route injected no MUI document baseline, by counting Emotion `<style>` tags.
 * Emotion arrived with `@mui/material`, `@mui/material` left with #806 and React left with
 * this change, so that case now reads "a package which is not installed did not run".
 * `test/styles/mui-removed.test.ts` is where the surviving half of it lives.
 *
 * ## The dynamic imports are real
 *
 * Nothing here mocks `LOADERS`. The three top-level views are the app's only code-split
 * boundary above the route table, and most of these cases are about *which* module a given URL
 * and auth state reaches for — which a mock would supply rather than establish. The cost is
 * that the authenticated arm pulls the shell and `keep-views` in for real; that is the app,
 * and `vi.waitFor` is what waits for it rather than a guessed number of microtasks.
 */
describe('keep-app', () => {
  let router: Router;
  let dispatched: string[];
  let realDispatch: typeof store.dispatch;

  /**
   * The element, once its view's chunk has arrived and rendered.
   *
   * The timeout is well above `vi.waitFor`'s 1s default on purpose. What is being waited on is
   * a real `import()`, and the first one in a file pays Vite's transform of the whole module
   * graph behind it — measured at ~750ms for `keep-login-page` here, which is close enough to
   * the default to fail on a loaded CI runner and nowhere else.
   */
  const viewIn = async (el: App, selector: string) =>
    vi.waitFor(
      () => {
        const found = el.querySelector(selector);
        expect(found, `${selector} never arrived`).not.toBeNull();
        return found!;
      },
      { timeout: 10_000, interval: 20 },
    );

  beforeEach(() => {
    router = setRouterForTest(new Router({ history: memoryHistory(['/']) }));
    localStorage.clear();
    dispatched = [];

    /*
     * `keep-login-page` asks for the IDP list, the Keep IDP flag and passkey support the
     * moment it mounts, and those calls are not dispatched through the store — they are the
     * element's own. Node's `fetch` rejects a root-relative URL outright ("Invalid URL"),
     * which surfaces as an unhandled rejection outside any test's stack rather than as a
     * failure. The component test this file replaces stubbed `fetch` for the same reason.
     */
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })),
    );

    // The store is a module singleton, so one test's authentication is the next test's
    // starting state unless it is cleared here.
    realDispatch = store.dispatch.bind(store);
    realDispatch(removeAuth());

    /*
     * Recording, and deliberately *not* delegating. The element's own dispatches are the
     * subject of half the cases below; letting them through would also let `keep-views`'
     * mount-time fetches through, and those reach the network.
     */
    vi.spyOn(store, 'dispatch').mockImplementation(((action: unknown) => {
      dispatched.push((action as { type?: string }).type ?? 'thunk');
      return action;
    }) as typeof store.dispatch);
  });

  afterEach(() => {
    cleanupLit();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('the render root', () => {
    it('renders into the light DOM', async () => {
      // A shadow root here would put the shell's markup out of reach of `app-shell.css`,
      // Web Awesome's `native.css` and four utility classes, exactly as one on the shell
      // itself would. See `keep-app-shell`'s class note.
      const el = await mountLit<App>(TAG);
      expect(el.shadowRoot).toBeNull();
    });
  });

  describe('restoring the session', () => {
    /** A password token, `expSeconds` from now. A negative value ages it past its window. */
    const passwordToken = (expSeconds: number) =>
      JSON.stringify({ issueDate: new Date().toISOString(), expSeconds });

    it('dispatches nothing when local storage holds no token', async () => {
      await mountLit<App>(TAG);
      expect(dispatched).toEqual([]);
    });

    it('authenticates and renews a password token inside its window', async () => {
      localStorage.setItem('user_token', passwordToken(3600));
      await mountLit<App>(TAG);

      expect(dispatched).toContain('account/authenticate');
      expect(dispatched).toContain(RENEW.type);
      expect(dispatched).not.toContain('account/removeAuth');
    });

    it('drops a password token past its window', async () => {
      localStorage.setItem('user_token', passwordToken(-1));
      await mountLit<App>(TAG);

      expect(dispatched).toContain('account/authenticate');
      expect(dispatched).toContain('account/removeAuth');
      expect(dispatched).not.toContain(RENEW.type);
    });

    it('leaves an identity-provider token alone', async () => {
      // Its lifetime is the provider's business, so it is neither renewed nor dropped here —
      // note the expiry below is in the past and it still survives.
      localStorage.setItem(
        'user_token',
        JSON.stringify({ access_token: 'abc', issueDate: new Date().toISOString(), expSeconds: -1 }),
      );
      await mountLit<App>(TAG);

      expect(dispatched).toContain('account/setIdpLogin');
      expect(dispatched).toContain('account/authenticate');
      expect(dispatched).not.toContain(RENEW.type);
      expect(dispatched).not.toContain('account/removeAuth');
    });

    it('clears a token that will not parse, rather than failing on it every load', async () => {
      localStorage.setItem('user_token', '{not json');
      await mountLit<App>(TAG);

      expect(localStorage.getItem('user_token')).toBeNull();
      expect(dispatched).toContain('account/removeAuth');
    });

    it('restores once, not again on reconnect', async () => {
      localStorage.setItem('user_token', passwordToken(3600));
      const el = await mountLit<App>(TAG);
      const first = dispatched.length;
      expect(first).toBeGreaterThan(0);

      el.remove();
      document.body.appendChild(el);
      await el.updateComplete;

      expect(dispatched).toHaveLength(first);
    });

    it('lands before the first render, so no frame is spent deciding', async () => {
      /*
       * `App.tsx` held a `valid` flag that started false and was set true by the same effect
       * that read the token, so the first pass always rendered the loading page and the real
       * decision was made on the second. `connectedCallback` runs before Lit's first update,
       * which leaves that flag nothing to sequence — it is dropped rather than ported.
       */
      localStorage.setItem('user_token', passwordToken(3600));
      const el = document.createElement(TAG) as App;
      document.body.appendChild(el);

      expect(dispatched).toContain('account/authenticate');
      await el.updateComplete;
    });
  });

  describe('choosing a view', () => {
    it('shows the loading page while a chunk is in flight', async () => {
      const el = await mountLit<App>(TAG);
      // The first update, before any import can have resolved.
      expect(el.querySelector('keep-page-loading')?.getAttribute('message')).toBe('loading page');
    });

    it('fetches the login page for an anonymous visitor', async () => {
      const el = await mountLit<App>(TAG);
      await viewIn(el, 'keep-login-page');

      expect(el.querySelector('keep-app-shell')).toBeNull();
      expect(el.querySelector('keep-page-loading')).toBeNull();
    });

    it('fetches the shell, with the router behind it, once authenticated', async () => {
      realDispatch(authenticate());
      const el = await mountLit<App>(TAG);
      const shell = await viewIn(el, 'keep-app-shell');

      // `keep-views` is handed to the shell as its `main`, not imported by it: the shell is
      // chrome and a static import there would put the router in its chunk.
      expect(shell.querySelector('keep-views')).not.toBeNull();
      expect(el.querySelector('keep-login-page')).toBeNull();
    });

    it('puts the OIDC landing in the shell, without waiting to be authenticated', async () => {
      // `/callback` is the one route that must render before a session exists — the point of
      // it is that the exchange has not happened yet.
      setRouterForTest(new Router({ history: memoryHistory(['/callback']) }));
      const el = await mountLit<App>(TAG);
      const shell = await viewIn(el, 'keep-app-shell');

      expect(shell.querySelector('keep-callback-page')).not.toBeNull();
      expect(shell.querySelector('keep-views')).toBeNull();
    });

    it('publishes no route table of its own', async () => {
      /*
       * `Router.setRoutes` holds **one** table and overwrites it, and `App.tsx` mounted a
       * `RouterOutlet` of its own above the main region's — so the app had two writers and
       * which one was live depended on timing. App's table was `[{/callback}, {*}]` with a
       * `load` on the catch-all, so whenever it wrote last, `Router.prefetch` matched `*` for
       * every path and fetched the already-loaded shell instead of the view under the pointer
       * (#813). The two swapped places over the app's lifetime: App's effect re-ran when
       * `authenticated` changed, the outlet's `willUpdate` on every navigation.
       *
       * That race is what this removes — `keep-views`' outlet is the only writer now, so the
       * published table does not depend on what happened last.
       *
       * The discriminator is a path no real route matches: against the views table (seven
       * routes, no catch-all) there is nothing to prefetch, where App's `*` matched anything.
       * A real route is checked too, or an empty table would pass this just as well.
       */
      realDispatch(authenticate());
      const el = await mountLit<App>(TAG);
      const views = (await viewIn(el, 'keep-views')) as LitElement;
      await views.updateComplete;

      expect(router.prefetch('/no-such-route')).toBeUndefined();
      await expect(router.prefetch('/schema')).resolves.toBeDefined();
    });
  });

  describe('leaving a view', () => {
    it('goes home when the login page reports a success', async () => {
      // `keep-login-page` emits rather than navigating, and the ordering this pins —
      // authenticate, then go home — is the point of the join. `App.tsx` caught the event on
      // `document`, because the outlet that rendered the page passed it no props; bound to the
      // element, there is no document listener to install or tear down.
      router.navigate('/scope');
      const el = await mountLit<App>(TAG);
      const login = await viewIn(el, 'keep-login-page');

      login.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));

      expect(router.location().pathname).toBe('/');
    });

    it('goes home when the OIDC exchange reports it stored a token', async () => {
      setRouterForTest(new Router({ history: memoryHistory(['/callback']) }));
      const el = await mountLit<App>(TAG);
      const callback = await viewIn(el, 'keep-callback-page');

      callback.dispatchEvent(new CustomEvent('authenticated', { bubbles: true, composed: true }));

      // Off `/callback`, which is what the element asked its host to do. What it lands on is
      // then the ordinary auth decision — the store write is `keep-callback-page`'s own.
      expect(router.location().pathname).toBe('/');
    });
  });

  describe('a chunk that fails', () => {
    it('leaves the loading page up and asks again on the next update', async () => {
      // Not blanked, and not permanently dead: dropping the view from `requested` is what the
      // rejection handler does, so the next navigation or auth change retries.
      const el = await mountLit<App>(TAG);
      const requested = (el as unknown as { requested: Set<string> }).requested;

      expect(requested.has('login')).toBe(true);
      requested.delete('login');

      el.requestUpdate();
      await el.updateComplete;
      expect(requested.has('login')).toBe(true);
    });
  });
});
