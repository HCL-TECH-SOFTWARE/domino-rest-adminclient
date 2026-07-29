/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it.each(TILE_URIS)('prefetches %s on hover, like the sidebar does', (uri) => {
    vi.useFakeTimers();
    const router = new Router({ history: memoryHistory(['/']) });
    router.setRoutes(VIEW_ROUTES);
    const prefetch = vi.spyOn(router, 'prefetch').mockReturnValue(undefined);

    render(
      <RouterProvider router={router}>
        <Tip heading="A tile" description="desc" backgroundImage="x.jpg" uri={uri} />
      </RouterProvider>,
    );

    // Hover the heading, not the anchor: that is where a real pointer lands.
    fireEvent.pointerEnter(screen.getByText('A tile'));
    act(() => void vi.advanceTimersByTime(80));

    expect(prefetch).toHaveBeenCalledWith(uri);
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
