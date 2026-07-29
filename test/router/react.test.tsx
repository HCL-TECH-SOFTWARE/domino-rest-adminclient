/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Router, memoryHistory } from '../../src/router/router';
import {
  Link,
  NavLink,
  Navigate,
  RouterOutlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useParams,
  type RouteDef,
} from '../../src/router/react';

/**
 * The React bindings for #716.
 *
 * The hook *shapes* are what 26 leaf components depend on — they were ported by changing an
 * import line, so anything these get wrong shows up as a silently dead button rather than a
 * type error. That is what this file is for.
 */

const routers: Router[] = [];

/** A router over an in-memory stack, disposed after the test. */
const makeRouter = (entry = '/', base?: string) => {
  const router = new Router({ base, history: memoryHistory([entry]) });
  routers.push(router);
  return router;
};

const renderAt = (ui: React.ReactNode, entry = '/', base?: string) => {
  const router = makeRouter(entry, base);
  return { router, ...render(<RouterProvider router={router}>{ui}</RouterProvider>) };
};

afterEach(() => {
  cleanup();
  routers.splice(0).forEach((r) => r.dispose());
});

describe('useLocation', () => {
  const Probe = () => {
    const { pathname, search } = useLocation();
    return <span data-testid="loc">{`${pathname}${search}`}</span>;
  };

  it('reports the current location', () => {
    renderAt(<Probe />, '/schema?view=list');
    expect(screen.getByTestId('loc').textContent).toBe('/schema?view=list');
  });

  it('re-renders the caller when the router navigates', () => {
    const { router } = renderAt(<Probe />, '/');
    act(() => router.navigate('/scope'));
    expect(screen.getByTestId('loc').textContent).toBe('/scope');
  });

  it('reports the base-relative path, not the URL', () => {
    renderAt(<Probe />, '/admin/ui/schema', '/admin/ui');
    expect(screen.getByTestId('loc').textContent).toBe('/schema');
  });
});

describe('useNavigate', () => {
  const Probe = ({ to, options }: { to: any; options?: { replace?: boolean } }) => {
    const navigate = useNavigate();
    return (
      <>
        <button onClick={() => navigate(to, options)}>go</button>
        <span data-testid="loc">{useLocation().pathname + useLocation().search}</span>
      </>
    );
  };

  it('navigates to a string', () => {
    renderAt(<Probe to="/schema" />, '/');
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('loc').textContent).toBe('/schema');
  });

  /** The `changeView` call in SchemasLists and ScopeLists. */
  it('navigates to a { pathname, search } object', () => {
    renderAt(<Probe to={{ pathname: '/scope', search: '?view=list' }} />, '/scope');
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('loc').textContent).toBe('/scope?view=list');
  });

  /** `NavigationGuardContext` restores the pre-`popstate` page with `navigate(-1)`. */
  it('goes back on navigate(-1)', () => {
    const { router } = renderAt(<Probe to={-1} />, '/');
    act(() => router.navigate('/schema'));
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('loc').textContent).toBe('/');
  });

  it('replaces when told to', () => {
    const { router } = renderAt(<Probe to="/scope" options={{ replace: true }} />, '/');
    act(() => router.navigate('/schema'));
    fireEvent.click(screen.getByText('go'));
    act(() => router.navigate(-1));
    expect(screen.getByTestId('loc').textContent).toBe('/');
  });
});

describe('useParams', () => {
  const Probe = () => <span data-testid="params">{JSON.stringify(useParams())}</span>;

  it('exposes the matched route params', () => {
    const routes: RouteDef[] = [{ path: '/schema/:nsfPath/:dbName', element: <Probe /> }];
    renderAt(<RouterOutlet routes={routes} />, '/schema/orders.nsf/Alpha');
    expect(JSON.parse(screen.getByTestId('params').textContent!)).toEqual({
      nsfPath: 'orders.nsf',
      dbName: 'Alpha',
    });
  });

  /**
   * The three `useParams` callers (TabViews, TabAgents, TabForms) are nested well below the
   * route element, not rendered by the outlet directly — context, not props, is what makes
   * that work.
   */
  it('reaches components nested below the route element', () => {
    const Deep = () => (
      <div>
        <div>
          <Probe />
        </div>
      </div>
    );
    renderAt(<RouterOutlet routes={[{ path: '/schema/:dbName', element: <Deep /> }]} />, '/schema/Alpha');
    expect(JSON.parse(screen.getByTestId('params').textContent!)).toEqual({ dbName: 'Alpha' });
  });

  it('is empty outside a matched route', () => {
    renderAt(<Probe />, '/');
    expect(JSON.parse(screen.getByTestId('params').textContent!)).toEqual({});
  });

  it('updates when the same route matches different params', () => {
    const { router } = renderAt(
      <RouterOutlet routes={[{ path: '/schema/:dbName', element: <Probe /> }]} />,
      '/schema/Alpha'
    );
    act(() => router.navigate('/schema/Beta'));
    expect(JSON.parse(screen.getByTestId('params').textContent!)).toEqual({ dbName: 'Beta' });
  });
});

describe('Link', () => {
  it('renders a real href with the basename applied', () => {
    renderAt(<Link to="/schema">Schemas</Link>, '/', '/admin/ui');
    expect(screen.getByText('Schemas').getAttribute('href')).toBe('/admin/ui/schema');
  });

  it('navigates on a plain left-click without reloading', () => {
    const { router } = renderAt(<Link to="/schema">Schemas</Link>, '/');
    fireEvent.click(screen.getByText('Schemas'));
    expect(router.location().pathname).toBe('/schema');
  });

  /**
   * ⌘/ctrl/shift/middle clicks are how people open things in a new tab. Swallowing them is
   * the classic hand-rolled-router bug, and it is invisible until someone complains.
   */
  it.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('leaves a %s click to the browser', (_label, modifier) => {
    const { router } = renderAt(<Link to="/schema">Schemas</Link>, '/');
    fireEvent.click(screen.getByText('Schemas'), modifier);
    expect(router.location().pathname).toBe('/');
  });

  it('runs a caller onClick before navigating', () => {
    const onClick = vi.fn();
    const { router } = renderAt(
      <Link to="/schema" onClick={onClick}>
        Schemas
      </Link>,
      '/'
    );
    fireEvent.click(screen.getByText('Schemas'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(router.location().pathname).toBe('/schema');
  });

  it('does not navigate when the caller preventDefaults', () => {
    const { router } = renderAt(
      <Link to="/schema" onClick={(e) => e.preventDefault()}>
        Schemas
      </Link>,
      '/'
    );
    fireEvent.click(screen.getByText('Schemas'));
    expect(router.location().pathname).toBe('/');
  });
});

describe('NavLink', () => {
  it('is active on an exact match', () => {
    renderAt(<NavLink to="/scope" className={({ isActive }) => (isActive ? 'on' : 'off')}>Scopes</NavLink>, '/scope');
    expect(screen.getByText('Scopes').className).toBe('on');
  });

  /** `/schema/orders.nsf/Alpha` must keep the Schemas item lit, as the old sidebar did by
   *  comparing first path segments. */
  it('is active for a descendant path', () => {
    renderAt(
      <NavLink to="/schema" className={({ isActive }) => (isActive ? 'on' : 'off')}>Schemas</NavLink>,
      '/schema/orders.nsf/Alpha'
    );
    expect(screen.getByText('Schemas').className).toBe('on');
  });

  it('is not active for an unrelated path', () => {
    renderAt(<NavLink to="/scope" className={({ isActive }) => (isActive ? 'on' : 'off')}>Scopes</NavLink>, '/apps');
    expect(screen.getByText('Scopes').className).toBe('off');
  });

  /** Without the special case, `/` is a prefix of every path and the Home item never dims. */
  it('treats / as exact so it is not active everywhere', () => {
    renderAt(<NavLink to="/" className={({ isActive }) => (isActive ? 'on' : 'off')}>Home</NavLink>, '/schema');
    expect(screen.getByText('Home').className).toBe('off');
  });

  it('does not treat a shared prefix as a descendant', () => {
    renderAt(<NavLink to="/app" className={({ isActive }) => (isActive ? 'on' : 'off')}>App</NavLink>, '/apps');
    expect(screen.getByText('App').className).toBe('off');
  });

  it('accepts a plain string className, as the sidebar passes', () => {
    renderAt(<NavLink to="/scope" className="full-width">Scopes</NavLink>, '/scope');
    expect(screen.getByText('Scopes').className).toBe('full-width');
  });

  it('marks the active link for assistive tech', () => {
    renderAt(<NavLink to="/scope">Scopes</NavLink>, '/scope');
    expect(screen.getByText('Scopes').getAttribute('aria-current')).toBe('page');
  });

  it('honours `end` for an exact-only match', () => {
    renderAt(
      <NavLink to="/schema" end className={({ isActive }) => (isActive ? 'on' : 'off')}>Schemas</NavLink>,
      '/schema/orders.nsf/Alpha'
    );
    expect(screen.getByText('Schemas').className).toBe('off');
  });
});

describe('Navigate', () => {
  it('redirects on mount, replacing the entry', () => {
    const { router } = renderAt(<Navigate to="/" />, '/schema');
    expect(router.location().pathname).toBe('/');
  });
});

describe('RouterOutlet', () => {
  const routes: RouteDef[] = [
    { path: '/', element: <span>home</span> },
    { path: '/schema', element: <span>schemas</span> },
    { path: '/schema/:dbName', element: <span>forms</span> },
  ];

  it('renders the matching route', () => {
    renderAt(<RouterOutlet routes={routes} />, '/schema');
    expect(screen.getByText('schemas')).toBeTruthy();
  });

  it('swaps the rendered route on navigation', () => {
    const { router } = renderAt(<RouterOutlet routes={routes} />, '/');
    expect(screen.getByText('home')).toBeTruthy();
    act(() => router.navigate('/schema/Alpha'));
    expect(screen.getByText('forms')).toBeTruthy();
    expect(screen.queryByText('home')).toBeNull();
  });

  it('renders nothing when no route matches', () => {
    const { container } = renderAt(<RouterOutlet routes={routes} />, '/settings/account');
    expect(container.textContent).toBe('');
  });

  describe('guard', () => {
    const guarded: RouteDef[] = [
      { path: '/', element: <span>home</span> },
      { path: '/schema', element: <span>schemas</span>, guard: () => false, redirectTo: '/' },
    ];

    it('renders the route when the guard passes', () => {
      renderAt(
        <RouterOutlet routes={[{ path: '/schema', element: <span>schemas</span>, guard: () => true }]} />,
        '/schema'
      );
      expect(screen.getByText('schemas')).toBeTruthy();
    });

    it('redirects when the guard fails', () => {
      const { router } = renderAt(<RouterOutlet routes={guarded} />, '/schema');
      expect(router.location().pathname).toBe('/');
      expect(screen.queryByText('schemas')).toBeNull();
    });

    it('renders nothing when the guard fails with no redirect', () => {
      const { container } = renderAt(
        <RouterOutlet routes={[{ path: '/schema', element: <span>schemas</span>, guard: () => false }]} />,
        '/schema'
      );
      expect(container.textContent).toBe('');
    });
  });

  describe('load', () => {
    /**
     * #813 — code-split routes. `load` replaces `element`, and `RouterOutlet` wraps the
     * result in `React.lazy` + `Suspense`.
     *
     * Two of these pin contracts the app now depends on and that nothing else would catch:
     * `App.tsx` fetches the whole shell through `load`, and `Views.tsx` guards seven routes
     * on authentication.
     */
    const lazyRoute = (load: () => Promise<{ default: React.ComponentType }>): RouteDef[] => [
      { path: '/schema', load },
    ];

    const page = (text: string) => ({ default: () => <span>{text}</span> });

    it('shows the fallback, then the loaded component', async () => {
      let resolve!: (m: { default: React.ComponentType }) => void;
      const load = () => new Promise<{ default: React.ComponentType }>((r) => (resolve = r));

      renderAt(
        <RouterOutlet routes={lazyRoute(load)} fallback={<span>loading</span>} />,
        '/schema',
      );
      expect(screen.getByText('loading')).toBeTruthy();

      await act(async () => resolve(page('schemas')));
      expect(screen.getByText('schemas')).toBeTruthy();
    });

    /**
     * The memoisation contract. `React.lazy` returns a fresh component type per call and
     * React remounts when the type changes, so the wrappers are memoised on the route
     * table's identity — which makes a *stable* `routes` reference the caller's
     * responsibility. `App.tsx` builds its table in a `useMemo` for exactly this reason;
     * without it the shell would unmount and refetch on every render.
     */
    it('does not reload while the routes array keeps its identity', async () => {
      const load = vi.fn().mockResolvedValue(page('schemas'));
      const routes = lazyRoute(load);

      const { router, rerender } = renderAt(<RouterOutlet routes={routes} />, '/schema');
      await screen.findByText('schemas');

      // Re-wrapped in the provider: `rerender` replaces the whole tree, so passing the
      // outlet bare would drop the router out of scope.
      const again = (r: RouteDef[]) =>
        rerender(
          <RouterProvider router={router}>
            <RouterOutlet routes={r} />
          </RouterProvider>,
        );
      again(routes);
      again(routes);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('reloads when a new routes array is passed, which is why callers memoise', async () => {
      const load = vi.fn().mockResolvedValue(page('schemas'));

      const { router, rerender } = renderAt(<RouterOutlet routes={lazyRoute(load)} />, '/schema');
      await screen.findByText('schemas');

      rerender(
        <RouterProvider router={router}>
          <RouterOutlet routes={lazyRoute(load)} />
        </RouterProvider>,
      );
      await screen.findByText('schemas');

      expect(load).toHaveBeenCalledTimes(2);
    });

    /**
     * Creating a `lazy()` must not call `load`. Otherwise an unauthenticated visitor
     * hitting a guarded URL would still fetch the view they are being redirected away
     * from — every one of `Views.tsx`'s seven routes is guarded on `authenticated`.
     */
    it('never calls load when the guard fails', () => {
      const load = vi.fn().mockResolvedValue(page('schemas'));

      const { router } = renderAt(
        <RouterOutlet routes={[{ path: '/schema', load, guard: () => false, redirectTo: '/' }]} />,
        '/schema',
      );

      expect(load).not.toHaveBeenCalled();
      expect(router.location().pathname).toBe('/');
    });

    it('prefers element over load when a route somehow has both', () => {
      const load = vi.fn().mockResolvedValue(page('lazy'));
      renderAt(
        <RouterOutlet routes={[{ path: '/schema', element: <span>eager</span>, load }]} />,
        '/schema',
      );
      expect(screen.getByText('eager')).toBeTruthy();
      expect(load).not.toHaveBeenCalled();
    });
  });

  it('matches in declaration order, so a catch-all shadows what follows it', () => {
    renderAt(
      <RouterOutlet
        routes={[
          { path: '*', element: <span>catch-all</span> },
          { path: '/schema', element: <span>schemas</span> },
        ]}
      />,
      '/schema'
    );
    expect(screen.getByText('catch-all')).toBeTruthy();
  });
});

describe('without a provider', () => {
  /**
   * Silently no-op'ing here would mean a component rendered outside a provider navigates a
   * router nothing listens to — a dead button with no error anywhere. The test helper's
   * `route` option is the opt-in, and this message names it.
   */
  it('throws a message that names the fix', () => {
    const Probe = () => {
      useNavigate();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/renderWithProviders/);
    spy.mockRestore();
  });
});
