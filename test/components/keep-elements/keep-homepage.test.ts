/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { ROUTER_BASE, setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import { setNavItems } from '../../../src/store/account/reducer';
import { databases, apps } from '../../../src/components/sidenav/Routes';
// A value import, not `import type`: the style assertions read `.styles` off the class, which
// is also what keeps the import from being erased along with the module's `@customElement`
// side effect.
import Homepage from '../../../src/components/keep-elements/keep-homepage';
import type Tip from '../../../src/components/keep-elements/keep-tip';

/**
 * `keep-homepage` — the `/` route.
 *
 * It was a scroll container with a slot; #806 wave 8 folded `home/sections/Section.tsx` (and,
 * through it, `Tip.tsx`) into it. Two suites merge here:
 *
 * - the `keep-homepage` block of `keep-mobile-header.test.ts`, whose slot-projection case
 *   goes with the slot — there is no React child left to project, and what replaced it is
 *   asserted below as rendered tiles;
 * - the two `sidenav/Routes` cases from `test/components/home/Tip.test.tsx`, which belong to
 *   whichever element reads that table. The rest of that file is now `keep-tip.test.ts`.
 */

const TAG = 'keep-homepage';

/** The thunk is a network call with its own tests; here it is a marker. */
const SHOW_PAGES = { type: 'test/showPages' } as const;

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  showPages: () => SHOW_PAGES,
}));

/**
 * Mirrors the seven `load` routes in `Views.tsx`.
 *
 * `load` must return a promise — `Router.prefetch` caches it and attaches a `catch` so a
 * failed chunk is not cached. A bare `vi.fn()` returning `undefined` throws there, which is
 * the type doing its job rather than something to harden against.
 */
const stubLoad = () => vi.fn().mockResolvedValue({ default: () => null });

const VIEW_ROUTES = [
  { path: '/', load: stubLoad() },
  { path: '/schema', load: stubLoad() },
  { path: '/schema/:nsfPath/:dbName', load: stubLoad() },
  { path: '/schema/:nsfPath/:dbName/:formName/access', load: stubLoad() },
  { path: '/scope', load: stubLoad() },
  { path: '/apps', load: stubLoad() },
  { path: '/apps/consents', load: stubLoad() },
];

const TILE_URIS = [...databases, ...apps].map((route) => route.uri);

const tiles = (el: Homepage) => [...el.shadowRoot!.querySelectorAll<Tip>('keep-tip')];

const mount = async (navitems: { databases: boolean; apps: boolean }) => {
  store.dispatch(setNavItems(navitems));
  return mountLit<Homepage>(TAG);
};

/** A store dispatch reaches the element through `StoreController.requestUpdate()`. */
const settle = async (el: Homepage) => {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    await el.updateComplete;
  }
};

describe('keep-homepage', () => {
  let dispatched: unknown[];

  beforeEach(() => {
    setRouterForTest(new Router({ history: memoryHistory(['/']) }));
    dispatched = [];
    store.dispatch(setNavItems({ databases: false, apps: false }));
    // Recorded *and* performed: a mock that swallowed the action would leave the navitems
    // assertions below asserting against a store nothing had written to.
    const original = store.dispatch.bind(store);
    vi.spyOn(store, 'dispatch').mockImplementation(((action: unknown) => {
      dispatched.push(action);
      return original(action as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  });

  afterEach(() => {
    cleanupLit();
    vi.restoreAllMocks();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('scrolls its own content', () => {
    // Carried from keep-mobile-header.test.ts: this element is the `/` route's scroll
    // container, and `Views.tsx` sizes the region around it on that assumption.
    expect(Homepage.styles.toString()).toMatch(/overflow-y:\s*auto/);
  });

  it('asks which pages this deployment turns on, once', async () => {
    await mount({ databases: true, apps: true });

    expect(dispatched).toContainEqual(SHOW_PAGES);
    expect(dispatched.filter((action) => action === SHOW_PAGES)).toHaveLength(1);
  });

  describe('the tiles', () => {
    it('mirror the four sidebar destinations', () => {
      // Carried from Tip.test.tsx. The homepage and the rail are two independent ways into
      // the same four routes, and both read this table — which is what stops a tile
      // outliving its route, as the People and Groups ones did for fifteen months (#770).
      expect(TILE_URIS).toEqual(['/schema', '/scope', '/apps', '/apps/consents']);
    });

    it('renders one per allowed route, in sidebar order', async () => {
      const el = await mount({ databases: true, apps: true });

      expect(tiles(el).map((tile) => tile.uri)).toEqual(TILE_URIS);
      expect(tiles(el).map((tile) => tile.heading)).toEqual([
        'Database Management - REST API',
        'Database Management - Activation',
        'Application Management - OAUTH',
        'Consents Management - OAUTH',
      ]);
    });

    it('gives every tile its own image and description', async () => {
      const el = await mount({ databases: true, apps: true });

      const images = tiles(el).map((tile) => tile.image);
      expect(images.every((src) => src.length > 0)).toBe(true);
      expect(new Set(images).size, 'two tiles share an image').toBe(4);
      expect(tiles(el).map((tile) => tile.description)).toEqual([
        'CREATE/UPDATE SCHEMA',
        'CREATE/MANAGE SCOPES',
        'ADMIN',
        'REVIEW/REVOKE CONSENTS',
      ]);
    });

    it.each([
      ['only the database ones when apps are off', { databases: true, apps: false }, ['/schema', '/scope']],
      ['only the app ones when databases are off', { databases: false, apps: true }, ['/apps', '/apps/consents']],
      ['none at all when the deployment allows neither', { databases: false, apps: false }, []],
    ])('shows %s', async (_label, navitems, expected) => {
      const el = await mount(navitems);

      expect(tiles(el).map((tile) => tile.uri)).toEqual(expected);
    });

    it('re-renders when the deployment configuration arrives', async () => {
      // `showPages()` answers after the first paint, so the tiles appear on a store change
      // rather than at mount. Without a subscription the overview page stays empty.
      const el = await mount({ databases: false, apps: false });
      expect(tiles(el)).toHaveLength(0);

      store.dispatch(setNavItems({ databases: true, apps: true }));
      await settle(el);

      expect(tiles(el)).toHaveLength(4);
    });

    it.each(TILE_URIS)('%s resolves to a route that has something to load', (uri) => {
      // Carried from Tip.test.tsx. A tile pointing somewhere unrouted would still render and
      // still navigate — to nothing — and prefetching it would quietly no-op.
      const router = new Router({ history: memoryHistory(['/']) });
      router.setRoutes(VIEW_ROUTES);

      expect(router.prefetch(uri), `no load route matches ${uri}`).toBeDefined();
      router.dispose();
    });
  });

  describe('the block diagram line', () => {
    it('links to the served diagram in a new tab, safely', async () => {
      const el = await mount({ databases: true, apps: true });
      const link = el.shadowRoot!.querySelector('.diagram a')!;

      // ROUTER_BASE is `/admin/ui`; the diagram is served one level up, at `/admin/img/…`.
      expect(link.getAttribute('href')).toBe(
        `${ROUTER_BASE.replace(/\/[^/]+$/, '')}/img/keepblockdiagram.svg`,
      );
      expect(link.getAttribute('target')).toBe('_blank');
      // Was missing: a `target="_blank"` link hands the opened document a `window.opener`.
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.textContent).toContain('DRAPI overview');
    });

    it('no longer truncates the sentence to one clipped line', () => {
      // The line sat in the last light-DOM <section> in the app, so it picked up
      // keep-overrides.css's bare `section` rule — overflow: hidden, ellipsis, nowrap. Only
      // its margin is reproduced here; the three clipping declarations are deliberately not.
      const styles = Homepage.styles.toString();
      expect(styles).toMatch(/\.diagram\s*\{[^}]*margin:\s*5px 0/);
      expect(styles).not.toContain('nowrap');
      expect(styles).not.toContain('text-overflow');
    });
  });

  describe('the tile row', () => {
    /**
     * The space between tiles is a gap on the row, not two touching card margins (#963).
     *
     * As margins it was `--wa-space-l` on each of two neighbours, so the real separation was
     * 48px and nothing that named it said 48. Measured in Chrome at 1440px: 48px before,
     * 24px after, with the tiles absorbing the difference. `css: false` means nothing here
     * can see that, so what is pinned is the shape that produces it — the gap exists on the
     * row, and the inline margin that used to stand in for it is gone from the tile.
     */
    it('separates the tiles with a gap on the row rather than card margins', () => {
      expect(Homepage.styles.toString()).toMatch(
        /\.features\s*\{[^}]*gap:\s*var\(--wa-space-l\)/
      );
    });

    it('drops the justify-content that had nothing left to distribute', () => {
      // The tiles are `flex: 1`, so they already consume the row; `space-between` was inert.
      expect(Homepage.styles.toString()).not.toContain('space-between');
    });
  });

  it('carries no rule for the section-title class, which nothing ever had', () => {
    // It was in the styled block this element replaced, matching a class no element in the
    // screen carried — so it has never rendered anything.
    expect(Homepage.styles.toString()).not.toContain('section-title');
  });
});
