/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { Router, memoryHistory } from '../../../src/router/router';
import { RouterProvider } from '../../../src/router/react';
import Tip from '../../../src/components/home/sections/Tip';
import { databases, apps } from '../../../src/components/sidenav/Routes';

/**
 * The homepage tiles are a second, independent way into four of the seven routes — the
 * sidebar is the other. They are built from the *same* `sidenav/Routes` arrays, so it is
 * easy to assume they behave like the sidebar without checking.
 *
 * Two things worth pinning:
 *
 * - They go through `Link`, so #813's hover prefetching reaches them. `Tip` renders MUI
 *   `CardActionArea` *inside* the anchor, so the pointer lands on a descendant rather than
 *   on the `<a>` itself — React's enter/leave semantics fire the ancestor's handler, but
 *   that is the sort of thing a refactor breaks silently.
 * - Their `uri`s have to keep matching real route patterns. A tile pointing at a path with
 *   no route would still render and still navigate — to nothing — and prefetching it would
 *   quietly no-op.
 */

const TILE_URIS = [...databases, ...apps].map((route) => route.uri);

/**
 * Mirrors the seven `load` routes in `Views.tsx`.
 *
 * `load` must return a promise — `Router.prefetch` caches it and attaches a `catch` so a
 * failed chunk is not cached. A bare `vi.fn()` returning `undefined` throws there, which
 * is the type doing its job rather than something to harden against.
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('homepage tiles', () => {
  it('mirror the four sidebar destinations', () => {
    expect(TILE_URIS).toEqual(['/schema', '/scope', '/apps', '/apps/consents']);
  });

  const renderTip = (uri: string) => {
    const router = new Router({ history: memoryHistory(['/']) });
    router.setRoutes(VIEW_ROUTES);
    const prefetch = vi.spyOn(router, 'prefetch').mockReturnValue(undefined);
    render(
      <RouterProvider router={router}>
        <Tip heading="A tile" description="A description" backgroundImage="x.jpg" uri={uri} />
      </RouterProvider>,
    );
    return { router, prefetch };
  };

  it.each(TILE_URIS)('prefetches %s on hover, like the sidebar does', (uri) => {
    vi.useFakeTimers();
    const { router, prefetch } = renderTip(uri);

    // Hover the image, not the anchor: a real pointer lands on a descendant, and React's
    // enter/leave semantics are what carry that up to the handler on the `<a>`.
    const image = document.querySelector('img');
    expect(image, 'the tile should render an image inside its link').toBeTruthy();
    fireEvent.pointerEnter(image!);
    act(() => void vi.advanceTimersByTime(80));

    expect(prefetch).toHaveBeenCalledWith(uri);
    router.dispose();
  });

  /**
   * The constraint the whole `keep-tip` design turns on.
   *
   * `NavigationGuardContext` catches in-app navigation with a document-level capture
   * listener doing `e.target.closest('a[href]')`. A click originating inside a shadow root
   * is *retargeted*, so that listener would see `<keep-tip>` and `closest` would return
   * `null` — the unsaved-changes prompt would stop appearing, with nothing failing loudly.
   * The router's own click handling and hover prefetching hang off the same anchor.
   *
   * So: the anchor is passed in as slotted light-DOM content and must stay there.
   */
  it('keeps the anchor in the light DOM, where the navigation guard can see it', () => {
    const { router } = renderTip('/schema');

    const anchor = document.querySelector('a[href]');
    expect(anchor, 'the anchor must be a light-DOM child, not inside the shadow root').toBeTruthy();
    expect(anchor!.getAttribute('slot')).toBe('media');
    expect(anchor!.getRootNode()).toBe(document);

    // What the guard actually does, from where a real click starts.
    expect(document.querySelector('img')!.closest('a[href]')).toBe(anchor);

    router.dispose();
  });

  it('renders the heading and description inside the card', async () => {
    const { router } = renderTip('/schema');
    const tip = document.querySelector('keep-tip')!;
    await tip.updateComplete;

    expect(tip.shadowRoot?.textContent).toContain('A tile');
    expect(tip.shadowRoot?.textContent).toContain('A description');
    // Forwarded into wa-card's own media slot: a slot inside a shadow root can itself be
    // assigned to a slot further down.
    expect(tip.shadowRoot?.querySelector('slot[name="media"]')?.getAttribute('slot')).toBe('media');

    router.dispose();
  });

  it.each(TILE_URIS)('%s resolves to a route that has something to load', (uri) => {
    const router = new Router({ history: memoryHistory(['/']) });
    router.setRoutes(VIEW_ROUTES);

    // A tile pointing somewhere unrouted would prefetch nothing and navigate nowhere.
    expect(router.prefetch(uri), `no load route matches ${uri}`).toBeDefined();
    router.dispose();
  });
});
