/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  matchPath,
  matchRoutes,
  memoryHistory,
  Router,
  toHref,
  type RouterHistory,
} from '../../src/router/router';

/**
 * The framework-agnostic half of the #716 router.
 *
 * These are the cases the nine live routes actually exercise, plus the ones that used to be
 * react-router's job and are now this file's: basename handling, params decoding, and the
 * declaration-order matching that replaced specificity ranking.
 */

/** The real route table, so the tests move if the app's routes do. */
const APP_ROUTES = [
  { path: '/callback' },
  { path: '*' },
];

const VIEW_ROUTES = [
  { path: '/' },
  { path: '/schema' },
  { path: '/schema/:nsfPath/:dbName' },
  { path: '/schema/:nsfPath/:dbName/:formName/access' },
  { path: '/scope' },
  { path: '/apps' },
  { path: '/apps/consents' },
];

describe('matchPath', () => {
  it('matches a literal path', () => {
    expect(matchPath('/schema', '/schema')).toEqual({});
  });

  it('is indifferent to leading and trailing slashes', () => {
    expect(matchPath('/schema/', '/schema')).toEqual({});
    expect(matchPath('/schema', '/schema/')).toEqual({});
  });

  it('captures :param segments', () => {
    expect(matchPath('/schema/:nsfPath/:dbName', '/schema/orders.nsf/Alpha')).toEqual({
      nsfPath: 'orders.nsf',
      dbName: 'Alpha',
    });
  });

  it('captures every param of the deepest live route', () => {
    expect(
      matchPath('/schema/:nsfPath/:dbName/:formName/access', '/schema/orders.nsf/Alpha/Order/access')
    ).toEqual({ nsfPath: 'orders.nsf', dbName: 'Alpha', formName: 'Order' });
  });

  it('decodes params, so callers get the value the link encoded', () => {
    expect(matchPath('/schema/:nsfPath/:dbName', '/schema/sub%2Forders.nsf/A%20B')).toEqual({
      nsfPath: 'sub/orders.nsf',
      dbName: 'A B',
    });
  });

  /**
   * A hand-edited address bar can contain a lone `%`. `decodeURIComponent` throws `URIError`
   * on that, and unguarded it would throw out of the render pass and blank the whole app.
   */
  it('survives a malformed escape rather than throwing', () => {
    expect(matchPath('/schema/:nsfPath/:dbName', '/schema/100%/Alpha')).toEqual({
      nsfPath: '100%',
      dbName: 'Alpha',
    });
  });

  it('does not match a different literal', () => {
    expect(matchPath('/schema', '/scope')).toBeNull();
  });

  /** The bug a "startsWith" matcher would have: a list route swallowing its detail route. */
  it('does not match a longer path', () => {
    expect(matchPath('/schema', '/schema/orders.nsf/Alpha')).toBeNull();
  });

  it('does not match a shorter path', () => {
    expect(matchPath('/schema/:nsfPath/:dbName', '/schema/orders.nsf')).toBeNull();
  });

  it('matches everything under a trailing wildcard, including nothing', () => {
    expect(matchPath('*', '/')).toEqual({});
    expect(matchPath('*', '/anything/at/all')).toEqual({});
  });

  it('distinguishes no-match from a match with no params', () => {
    // `{}` is falsy-adjacent in the wrong hands: both are objects, only one is null.
    expect(matchPath('/scope', '/scope')).not.toBeNull();
    expect(matchPath('/scope', '/nope')).toBeNull();
  });
});

describe('matchRoutes', () => {
  it('resolves each live view route to itself', () => {
    const cases: Array<[string, string]> = [
      ['/', '/'],
      ['/schema', '/schema'],
      ['/schema/orders.nsf/Alpha', '/schema/:nsfPath/:dbName'],
      ['/schema/orders.nsf/Alpha/Order/access', '/schema/:nsfPath/:dbName/:formName/access'],
      ['/scope', '/scope'],
      ['/apps', '/apps'],
      ['/apps/consents', '/apps/consents'],
    ];
    for (const [pathname, expected] of cases) {
      expect(matchRoutes(VIEW_ROUTES, pathname)?.route.path, pathname).toBe(expected);
    }
  });

  /**
   * `/apps/consents` is declared after `/apps`, and `/schema/:nsfPath/:dbName` before the
   * deeper `/access` route. Neither shadows the other because lengths must agree — this is
   * what makes declaration-order matching safe without a ranking pass.
   */
  it('does not let a shorter route shadow a longer one', () => {
    expect(matchRoutes(VIEW_ROUTES, '/apps/consents')?.route.path).toBe('/apps/consents');
    expect(matchRoutes(VIEW_ROUTES, '/schema/orders.nsf/Alpha/Order/access')?.route.path).toBe(
      '/schema/:nsfPath/:dbName/:formName/access'
    );
  });

  it('returns null when nothing matches', () => {
    expect(matchRoutes(VIEW_ROUTES, '/settings/account')).toBeNull();
  });

  /** App.tsx's table, and the reason `/callback` is declared before the catch-all. */
  it('reaches /callback because it is declared before the catch-all', () => {
    expect(matchRoutes(APP_ROUTES, '/callback')?.route.path).toBe('/callback');
    expect(matchRoutes(APP_ROUTES, '/schema')?.route.path).toBe('*');
  });

  it('would never reach a route declared after a catch-all', () => {
    expect(matchRoutes([{ path: '*' }, { path: '/callback' }], '/callback')?.route.path).toBe('*');
  });

  it('exposes the params of the route it matched', () => {
    expect(matchRoutes(VIEW_ROUTES, '/schema/orders.nsf/Alpha')?.params).toEqual({
      nsfPath: 'orders.nsf',
      dbName: 'Alpha',
    });
  });
});

describe('toHref', () => {
  it('passes a string through', () => {
    expect(toHref('/schema')).toBe('/schema');
  });

  it('assembles pathname, search and hash in URL order', () => {
    expect(toHref({ pathname: '/schema', search: '?view=card', hash: '#top' })).toBe(
      '/schema?view=card#top'
    );
  });

  /** The `changeView` shape in SchemasLists/ScopeLists: search only, path from the caller. */
  it('falls back to the current pathname when the destination omits one', () => {
    expect(toHref({ search: '?view=list' }, '/scope')).toBe('/scope?view=list');
  });
});

describe('memoryHistory', () => {
  it('starts at the last initial entry', () => {
    expect(memoryHistory(['/schema']).location().pathname).toBe('/schema');
  });

  it('splits an entry into pathname, search and hash', () => {
    expect(memoryHistory(['/schema?view=list#top']).location()).toEqual({
      pathname: '/schema',
      search: '?view=list',
      hash: '#top',
    });
  });

  it('pushes and steps back', () => {
    const history = memoryHistory(['/']);
    history.push('/schema');
    expect(history.location().pathname).toBe('/schema');
    history.go(-1);
    expect(history.location().pathname).toBe('/');
  });

  it('replaces without growing the stack', () => {
    const history = memoryHistory(['/']);
    history.replace('/scope');
    history.go(-1);
    expect(history.location().pathname).toBe('/scope');
  });

  it('drops forward entries when pushing after a back', () => {
    const history = memoryHistory(['/']);
    history.push('/schema');
    history.go(-1);
    history.push('/scope');
    history.go(1);
    expect(history.location().pathname).toBe('/scope');
  });

  it('clamps a back past the first entry instead of throwing', () => {
    const history = memoryHistory(['/']);
    expect(() => history.go(-5)).not.toThrow();
    expect(history.location().pathname).toBe('/');
  });
});

describe('Router', () => {
  const routers: Router[] = [];
  const make = (entries: string[], base?: string) => {
    const router = new Router({ base, history: memoryHistory(entries) });
    routers.push(router);
    return router;
  };

  afterEach(() => {
    routers.splice(0).forEach((r) => r.dispose());
  });

  it('reports the current location', () => {
    expect(make(['/schema?view=list']).location()).toEqual({
      pathname: '/schema',
      search: '?view=list',
      hash: '',
    });
  });

  describe('basename', () => {
    it('strips the base from the location it reports', () => {
      expect(make(['/admin/ui/schema'], '/admin/ui').location().pathname).toBe('/schema');
    });

    it('reports / at the base root, not an empty string', () => {
      expect(make(['/admin/ui'], '/admin/ui').location().pathname).toBe('/');
    });

    it('prefixes the base onto hrefs', () => {
      expect(make(['/admin/ui'], '/admin/ui').href('/schema')).toBe('/admin/ui/schema');
    });

    it('tolerates a base written with a trailing slash', () => {
      expect(make(['/admin/ui/schema'], '/admin/ui/').location().pathname).toBe('/schema');
    });

    it('leaves absolute URLs alone', () => {
      expect(make(['/'], '/admin/ui').href('https://example.com/x')).toBe('https://example.com/x');
    });

    it('round-trips: what href() writes, location() reads back', () => {
      const router = make(['/admin/ui'], '/admin/ui');
      router.navigate('/schema/orders.nsf/Alpha');
      expect(router.location().pathname).toBe('/schema/orders.nsf/Alpha');
    });
  });

  describe('navigate', () => {
    it('moves to a string destination', () => {
      const router = make(['/']);
      router.navigate('/schema');
      expect(router.location().pathname).toBe('/schema');
    });

    it('moves to an object destination, keeping search', () => {
      const router = make(['/scope']);
      router.navigate({ pathname: '/scope', search: '?view=list' });
      expect(router.location()).toMatchObject({ pathname: '/scope', search: '?view=list' });
    });

    it('goes back on a negative number', () => {
      const router = make(['/']);
      router.navigate('/schema');
      router.navigate(-1);
      expect(router.location().pathname).toBe('/');
    });

    it('replaces without growing the stack', () => {
      const router = make(['/']);
      router.navigate('/schema');
      router.navigate('/scope', { replace: true });
      router.navigate(-1);
      expect(router.location().pathname).toBe('/');
    });

    /**
     * Re-clicking the active sidebar item should not grow the back stack — otherwise the
     * back button appears to do nothing for as many presses as the user made clicks.
     */
    it('ignores a navigation to the URL already showing', () => {
      const router = make(['/schema']);
      const onChange = vi.fn();
      router.subscribe(onChange);

      router.navigate('/schema');

      expect(onChange).not.toHaveBeenCalled();
      router.navigate(-1);
      expect(router.location().pathname).toBe('/schema');
    });

    it('still treats a search-only change as a real navigation', () => {
      const router = make(['/schema']);
      router.navigate({ pathname: '/schema', search: '?view=list' });
      expect(router.location().search).toBe('?view=list');
    });
  });

  describe('subscribe', () => {
    it('notifies on navigation', () => {
      const router = make(['/']);
      const onChange = vi.fn();
      router.subscribe(onChange);

      router.navigate('/schema');

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('stops notifying after unsubscribe', () => {
      const router = make(['/']);
      const onChange = vi.fn();
      router.subscribe(onChange)();

      router.navigate('/schema');

      expect(onChange).not.toHaveBeenCalled();
    });

    /** `useSyncExternalStore` compares snapshots by identity — a fresh object each read
     *  would re-render on every store tick, forever. */
    it('hands out the same location object until something moves', () => {
      const router = make(['/schema']);
      expect(router.location()).toBe(router.location());

      const before = router.location();
      router.navigate('/scope');
      expect(router.location()).not.toBe(before);
    });

    it('notifies when the underlying history moves on its own (back/forward)', () => {
      const history = memoryHistory(['/']);
      const router = new Router({ history });
      routers.push(router);
      const onChange = vi.fn();
      router.subscribe(onChange);

      router.navigate('/schema');
      onChange.mockClear();
      history.go(-1);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(router.location().pathname).toBe('/');
    });
  });

  describe('prefetch', () => {
    /**
     * #813 — the chunk-loading half of route splitting.
     *
     * `prefetch` exists so a hover can start the fetch before the click. That makes
     * "at most once per route" the property that matters: `pointerenter` fires repeatedly
     * while a cursor rests on a link, and the click that follows would be a third request
     * for a chunk already in flight.
     */
    const withRoutes = (load: () => Promise<unknown>) => {
      const router = new Router({ history: memoryHistory(['/']) });
      router.setRoutes([
        { path: '/schema', load },
        { path: '/scope' },
        { path: '/apps/:id', load },
      ]);
      return router;
    };

    it('invokes load once however many times it is asked', async () => {
      const load = vi.fn().mockResolvedValue({ default: () => null });
      const router = withRoutes(load);

      const first = router.prefetch('/schema');
      const second = router.prefetch('/schema');
      await Promise.all([first, second]);
      router.prefetch('/schema');

      expect(load).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('matches parameterised routes', async () => {
      const load = vi.fn().mockResolvedValue({ default: () => null });
      const router = withRoutes(load);

      await router.prefetch('/apps/42');

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for a route with no load, and for no match at all', () => {
      const load = vi.fn().mockResolvedValue({ default: () => null });
      const router = withRoutes(load);

      expect(router.prefetch('/scope')).toBeUndefined();
      expect(router.prefetch('/nowhere')).toBeUndefined();
      expect(load).not.toHaveBeenCalled();
    });

    it('does not cache a failure, so a dropped connection can be retried', async () => {
      const load = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue({ default: () => null });
      const router = withRoutes(load);

      await expect(router.prefetch('/schema')).rejects.toThrow('offline');
      await router.prefetch('/schema');

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('prefetches nothing before setRoutes is called', () => {
      const router = new Router({ history: memoryHistory(['/']) });

      expect(router.prefetch('/schema')).toBeUndefined();
    });

    it('resolves a destination object, not just a pathname string', async () => {
      const load = vi.fn().mockResolvedValue({ default: () => null });
      const router = withRoutes(load);

      await router.prefetch({ pathname: '/schema', search: '?view=list' });

      expect(load).toHaveBeenCalledTimes(1);
    });
  });

  it('detaches from its history on dispose', () => {
    const stop = vi.fn();
    const history: RouterHistory = {
      location: () => ({ pathname: '/', search: '', hash: '' }),
      push: () => {},
      replace: () => {},
      go: () => {},
      listen: () => stop,
    };

    new Router({ history }).dispose();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
