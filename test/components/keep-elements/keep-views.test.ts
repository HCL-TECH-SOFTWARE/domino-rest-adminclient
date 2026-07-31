/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'lit';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../../src/components/keep-elements/keep-views';
import type Views from '../../../src/components/keep-elements/keep-views';
import type RouterOutlet from '../../../src/components/keep-elements/keep-router-outlet';
import { store } from '../../../src/store/store';
import { authenticate, removeAuth, setIdpLogin } from '../../../src/store/account/reducer';
import { toggleQuickConfigDrawer } from '../../../src/store/drawer/reducer';
import { setLoading } from '../../../src/store/loading/reducer';
import { setPullDatabase, setPullScope } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import { fetchScopes, fetchKeepPermissions } from '../../../src/store/databases/action';
import { ROUTER_BASE, setRouterForTest } from '../../../src/router/instance';
import { Router, memoryHistory } from '../../../src/router/router';
import { cleanupLit, mountLit } from '../../test-utils/lit';

/**
 * #719 P4 — `Views.tsx` as a Lit element.
 *
 * The React file had no tests of its own. It also had five `useEffect`s, and translating them
 * is the risky half of this conversion: a `useEffect` dependency array is *edge*-triggered and
 * `willUpdate` is *level*-triggered, so an effect ported without thought either stops firing or
 * fires on every render. One of the five genuinely needs an edge and would spin the store
 * without it; the other four are made idempotent instead. Both shapes are pinned below.
 *
 * ## Two thunks are mocked, and only two
 *
 * `fetchScopes` and `fetchKeepPermissions` reach the network. What is under test is *when* this
 * element asks for them, not what they do, so the barrel is spread and those two replaced with
 * plain identifiable actions. Everything else — the store, the router, the child elements — is
 * the real thing.
 *
 * ## Why the URLs below are mostly ones no route matches
 *
 * `authenticated` is false in a fresh store, so every route's guard fails and the outlet
 * redirects to `/` — which would move the URL out from under an assertion about the title or
 * the scopes fetch. `'/scope/extra'`, `'/schema/a/b/c'` and `'/apps/extra'` share a first
 * segment with a real route and match none of them, which is exactly what these cases need.
 * The one test that does want a live route authenticates first.
 */

vi.mock('../../../src/store/databases/action', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/store/databases/action')>();
  return {
    ...actual,
    fetchScopes: vi.fn(() => ({ type: 'test/fetchScopes' })),
    fetchKeepPermissions: vi.fn(() => ({ type: 'test/fetchKeepPermissions' })),
  };
});

const TAG = 'keep-views';
const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/keep-elements/keep-views.ts'),
  'utf8',
);

const at = (entry: string) => setRouterForTest(new Router({ history: memoryHistory([entry]) }));

const mount = () => mountLit<Views>(TAG);

const outletOf = (el: Views) =>
  el.shadowRoot!.querySelector('keep-router-outlet') as RouterOutlet;

/** Every route the element publishes to its outlet. */
const routesOf = (el: Views) => outletOf(el).routes;

let title = '';

beforeEach(() => {
  title = document.title;
  store.dispatch({ type: INIT_STATE });
  store.dispatch(removeAuth());
  store.dispatch(setIdpLogin(false));
  store.dispatch(setLoading({ status: false, data: { message: '' } }));
  if (store.getState().drawer.quickConfigDrawer) store.dispatch(toggleQuickConfigDrawer());
});

afterEach(() => {
  cleanupLit();
  document.title = title;
});

describe('keep-views', () => {
  describe('the main region', () => {
    it('renders the guard, the breadcrumb strip and the outlet, in that order', async () => {
      at('/nope');
      const el = await mount();
      const main = el.shadowRoot!.querySelector('main')!;

      expect(main).toBeTruthy();
      expect([...main.children].map((child) => child.tagName.toLowerCase())).toEqual([
        'keep-navigation-guard',
        'keep-page-routers',
        'keep-router-outlet',
      ]);
      // A sibling of the routes, not a wrapper around them: its listeners are on `document`
      // and `window`, so the subtree it appeared to scope was never the subtree it guarded.
      expect(main.querySelector('keep-page-routers > keep-breadcrumb-router')).toBeTruthy();
    });

    it('hands the guard the router basename, so it can strip it from an href', async () => {
      at('/nope');
      const el = await mount();
      const guard = el.shadowRoot!.querySelector('keep-navigation-guard')!;

      // A literal here would be a second copy of the basename that nothing keeps in step with
      // `router/instance.ts` — and a stale one silently stops the guard recognising in-app
      // links.
      expect(guard.getAttribute('basename')).toBe(ROUTER_BASE);
    });

    it('shows the page-loading element while a route chunk is in flight', async () => {
      at('/nope');
      const el = await mount();
      const host = document.createElement('div');

      render(outletOf(el).fallback, host);

      expect(host.querySelector('keep-page-loading')?.getAttribute('message')).toBe(
        'loading view',
      );
    });

    it('does not mount the quick config drawer before it is first opened', async () => {
      at('/nope');
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-quick-config-drawer')).toBeNull();
    });
  });

  describe('the route table', () => {
    const EXPECTED = [
      ['/', 'keep-homepage'],
      ['/schema', 'keep-schemas-list'],
      ['/schema/:nsfPath/:dbName', 'keep-forms-container'],
      ['/schema/:nsfPath/:dbName/:formName/access', 'keep-access-mode'],
      ['/scope', 'keep-scopes-list'],
      ['/apps', 'keep-applications'],
      ['/apps/consents', 'keep-consents-container'],
    ] as const;

    it('publishes the seven routes in declaration order', async () => {
      at('/nope');
      const el = await mount();

      // Order is the whole matching algorithm — `matchRoutes` takes the first hit rather than
      // the most specific — so this is a behavioural assertion, not a shape one.
      expect(routesOf(el).map((route) => [route.path, route.tag])).toEqual(
        EXPECTED.map(([path, tag]) => [path, tag]),
      );
    });

    it('guards every one of them on authentication, redirecting home', async () => {
      at('/nope');
      const el = await mount();

      for (const route of routesOf(el)) {
        expect(route.redirectTo, route.path).toBe('/');
        expect(route.guard, route.path).toBeTypeOf('function');
        expect(route.guard!(), `${route.path} while signed out`).toBe(false);
      }

      store.dispatch(authenticate());
      for (const route of routesOf(el)) {
        expect(route.guard!(), `${route.path} while signed in`).toBe(true);
      }
    });

    it('keeps the guard bound to this element, not to whoever calls it', async () => {
      at('/nope');
      const el = await mount();
      store.dispatch(authenticate());

      // The outlet calls `guard()` as a bare function. A plain method would run with `this`
      // undefined and throw out of the resolution instead of answering — and a route whose
      // guard throws is a blank screen with a stack trace, not a redirect.
      const { guard } = routesOf(el)[0];
      expect(() => guard!()).not.toThrow();
      expect(guard!()).toBe(true);
    });

    /**
     * The specifier has to be statically analysable for the bundler to emit one chunk per
     * route (#813). A helper taking a path string, or a variable, silently collapses all seven
     * back into the entry — a regression with no runtime symptom at all, which is why this is
     * a source scan rather than a call.
     */
    it('imports each route module inline, with the tag it registers', () => {
      for (const [, tag] of EXPECTED) {
        expect(SOURCE, `${tag} route`).toContain(`tag: '${tag}',`);
        expect(SOURCE, `${tag} import`).toContain(`load: () => import('./${tag}'),`);
      }
    });

    it('names a tag each of those modules actually registers', () => {
      // A typo in either half is invisible until the route is opened, where it renders an
      // empty inline box.
      for (const [, tag] of EXPECTED) {
        const module = readFileSync(
          resolve(process.cwd(), `src/components/keep-elements/${tag}.ts`),
          'utf8',
        );
        expect(module, tag).toContain(`@customElement('${tag}')`);
      }
    });

    it('mounts the real element behind a route, end to end', async () => {
      at('/');
      store.dispatch(authenticate());
      const el = await mount();
      const outlet = outletOf(el);

      await vi.waitFor(() => {
        expect(outlet.shadowRoot!.querySelector('keep-homepage')).toBeTruthy();
      });
    });
  });

  describe('the page title', () => {
    it.each([
      ['/', 'Overview'],
      ['/scope/extra', 'Scopes'],
      ['/schema/a/b/c', 'Schemas'],
      ['/apps/extra', 'Applications'],
      ['/nope', 'Overview'],
    ])('is %s -> %s', async (path, subtitle) => {
      at(path);
      await mount();
      expect(document.title).toBe(`HCL Domino REST API | ${subtitle}`);
    });

    it('follows the URL', async () => {
      const router = at('/nope');
      const el = await mount();
      expect(document.title).toBe('HCL Domino REST API | Overview');

      router.navigate('/scope/extra');
      await el.updateComplete;

      expect(document.title).toBe('HCL Domino REST API | Scopes');
    });
  });

  describe('permissions', () => {
    it('fetches them once on mount', async () => {
      at('/nope');
      const el = await mount();

      expect(fetchKeepPermissions).toHaveBeenCalledTimes(1);

      // Not once per render. The React version held a ref for exactly this; the latch here is
      // a plain field for the same reason — flipping it must not itself cause a render.
      el.requestUpdate();
      await el.updateComplete;
      expect(fetchKeepPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe('scopes', () => {
    it.each(['/', '/scope/extra', '/apps/extra', '/schema/a/b/c'])(
      'fetches them on %s',
      async (path) => {
        at(path);
        await mount();
        expect(fetchScopes).toHaveBeenCalledTimes(1);
      },
    );

    it('does not fetch them on a screen that needs none', async () => {
      at('/nope');
      await mount();
      expect(fetchScopes).not.toHaveBeenCalled();
    });

    it('asks once while the first request is still out', async () => {
      at('/scope/extra');
      const el = await mount();

      el.requestUpdate();
      await el.updateComplete;
      el.requestUpdate();
      await el.updateComplete;

      expect(fetchScopes).toHaveBeenCalledTimes(1);
    });

    it('stops asking once the pull flag comes up', async () => {
      at('/scope/extra');
      const el = await mount();
      expect(fetchScopes).toHaveBeenCalledTimes(1);

      store.dispatch(setPullScope(true));
      await el.updateComplete;

      expect(fetchScopes).toHaveBeenCalledTimes(1);
    });

    it('asks again when the flag is lowered, which is what Refresh does', async () => {
      at('/scope/extra');
      const el = await mount();
      store.dispatch(setPullScope(true));
      await el.updateComplete;

      // The schemas and scopes screens do not refetch from their own Refresh button — they
      // lower this flag and rely on this element noticing.
      store.dispatch(setPullScope(false));
      await el.updateComplete;

      expect(fetchScopes).toHaveBeenCalledTimes(2);
    });
  });

  describe('the schemas loading state', () => {
    it('raises it while either pull is outstanding', async () => {
      at('/schema/a/b/c');
      await mount();
      expect(store.getState().loading.loading.status).toBe(true);
    });

    it('leaves it alone once both pulls are up', async () => {
      store.dispatch(setPullScope(true));
      store.dispatch(setPullDatabase(true));
      at('/schema/a/b/c');
      await mount();

      expect(store.getState().loading.loading.status).toBe(false);
    });

    it('leaves it alone away from the schemas screens', async () => {
      at('/scope/extra');
      await mount();
      expect(store.getState().loading.loading.status).toBe(false);
    });
  });

  describe('an identity-provider login', () => {
    it('does not refetch when the flag is already down', async () => {
      at('/nope');
      await mount();

      expect(fetchScopes).not.toHaveBeenCalled();
      expect(fetchKeepPermissions).toHaveBeenCalledTimes(1); // the mount fetch, not this one
    });

    it('refetches both when the flag goes up', async () => {
      at('/nope');
      const el = await mount();

      store.dispatch(setIdpLogin(true));
      await el.updateComplete;

      expect(fetchScopes).toHaveBeenCalledTimes(1);
      expect(fetchKeepPermissions).toHaveBeenCalledTimes(2);
    });

    /**
     * The one effect here that must stay edge-triggered. Run level-triggered it would dispatch
     * two fetches per render for as long as the flag is set, and each fetch writes the store,
     * which schedules the next render.
     */
    it('does not refetch again while the flag stays up', async () => {
      at('/nope');
      const el = await mount();
      store.dispatch(setIdpLogin(true));
      await el.updateComplete;

      el.requestUpdate();
      await el.updateComplete;
      el.requestUpdate();
      await el.updateComplete;

      expect(fetchScopes).toHaveBeenCalledTimes(1);
      expect(fetchKeepPermissions).toHaveBeenCalledTimes(2);
    });

    it('is already up at mount when the session was restored from a token', async () => {
      // `App.tsx` sets the flag from local storage before the shell mounts, so this element can
      // arrive with it already true — which the React effect treated as an edge and so must
      // this.
      store.dispatch(setIdpLogin(true));
      at('/nope');
      await mount();

      expect(fetchScopes).toHaveBeenCalledTimes(1);
      expect(fetchKeepPermissions).toHaveBeenCalledTimes(2);
    });
  });

  describe('the quick config drawer', () => {
    it('mounts on first open and stays mounted after it closes', async () => {
      at('/nope');
      const el = await mount();

      store.dispatch(toggleQuickConfigDrawer());
      await vi.waitFor(() => {
        expect(el.shadowRoot!.querySelector('keep-quick-config-drawer')).toBeTruthy();
      });

      /*
       * Mounting it *while* the flag is true would be the smaller change, but the drawer's
       * close is animated and its after-hide event fires only once that animation finishes —
       * and the element renders its error alert outside the drawer, so an error would vanish
       * the moment the drawer closed rather than staying up to be read.
       */
      store.dispatch(toggleQuickConfigDrawer());
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('keep-quick-config-drawer')).toBeTruthy();
    });
  });
});
