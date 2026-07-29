/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  matchRoutes,
  Router,
  type LoadableRoute,
  type RouteParams,
  type RouterLocation,
  type To,
} from './router';

/**
 * React bindings over the framework-agnostic {@link Router} (#716).
 *
 * The hook names and shapes are deliberately the ones react-router used, so the 26
 * leaf components that only call `useNavigate`/`useLocation`/`useParams` changed an import
 * line and nothing else. That keeps the risk of the swap concentrated in the three
 * structural files — `App.tsx`, `Views.tsx`, `NavigationGuardContext.tsx` — where it can
 * actually be reviewed.
 *
 * This file is the disposable half. When the views become Lit elements they subscribe to
 * the same `Router` through a `ReactiveController`, and this module is deleted; `router.ts`
 * is unaffected.
 */

const RouterContext = createContext<Router | null>(null);

/** Params of the route the outlet matched, for components rendered inside it. */
const ParamsContext = createContext<RouteParams>({});

/** Puts a {@link Router} in scope. `App.tsx` mounts the browser one; tests mount memory ones. */
export const RouterProvider: React.FC<{ router: Router; children: React.ReactNode }> = ({
  router,
  children,
}) => <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;

/**
 * The router in scope.
 *
 * Throws rather than falling back to a lazily created browser router: a component rendered
 * outside a provider would otherwise navigate a router nothing is listening to, and the
 * page would simply not change. `react-router` threw here too, and the test helper's
 * `route` option exists precisely so a suite can opt in.
 */
export function useRouter(): Router {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error(
      'No router in scope. Wrap the tree in <RouterProvider>, or pass `route` to renderWithProviders().'
    );
  }
  return router;
}

/** The current location, base stripped. Re-renders the caller on navigation. */
export function useLocation(): RouterLocation {
  const router = useRouter();
  const subscribe = useCallback((onChange: () => void) => router.subscribe(onChange), [router]);
  const snapshot = useCallback(() => router.location(), [router]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Imperative navigation: `navigate('/schema')`, `navigate({ pathname, search })`,
 * `navigate(path, { replace: true })`, or `navigate(-1)` for back.
 */
export function useNavigate(): (to: To | number, options?: { replace?: boolean }) => void {
  const router = useRouter();
  return useCallback((to, options) => router.navigate(to, options), [router]);
}

/** The `:param` values of the enclosing route. `{}` outside a matched route. */
export function useParams<T extends RouteParams = RouteParams>(): T {
  return useContext(ParamsContext) as T;
}

/**
 * Redirect on mount — the element form of `navigate(to, { replace: true })`.
 *
 * The navigation happens in an effect, not during render: navigating while rendering
 * updates another component's store mid-pass, which React reports as an error.
 */
export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to, replace = true }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
};

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

/**
 * How long a pointer must rest on a link before it counts as intent to go there (#813).
 *
 * Without a delay, sweeping the cursor across the sidebar on the way to somewhere else
 * fetches every chunk it crosses. 80 ms is below the threshold at which a deliberate hover
 * feels delayed, and above the time a passing cursor spends on any one item.
 */
const PREFETCH_INTENT_MS = 80;

/** `navigator.connection`, which TypeScript's DOM lib does not declare. */
type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Whether speculative fetching is welcome on this connection.
 *
 * Prefetching spends someone else's bandwidth on a guess. `saveData` is that person saying
 * no outright, and the 2g tiers are a link where a speculative chunk competes with the one
 * the user actually asked for. Absent the API — Safari and Firefox do not ship it — the
 * answer is yes, which is the same default those browsers get for every other heuristic.
 */
const prefetchIsWelcome = (): boolean => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== '2g' && connection.effectiveType !== 'slow-2g';
};

/**
 * Hover/focus intent for a destination, as a pair of start/cancel callbacks.
 *
 * Deliberately thin: deduplication lives in {@link Router.prefetch}, which caches the
 * promise per route, so this never has to remember what it has already asked for — and the
 * Lit `<keep-link>` that replaces {@link Link} in the React removal inherits that for free
 * by calling the same method.
 */
function usePrefetchIntent(to: To): { start: () => void; cancel: () => void } {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = useCallback(() => {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  // A link can be unmounted mid-hover — a route swap, a closing drawer. Without this the
  // timer would still fire and fetch a chunk for a link that is no longer on screen.
  useEffect(() => cancel, [cancel]);

  const start = useCallback(() => {
    if (timer.current !== undefined || !prefetchIsWelcome()) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      router.prefetch(to);
    }, PREFETCH_INTENT_MS);
  }, [router, to]);

  return { start, cancel };
}

export interface LinkProps extends AnchorProps {
  to: string;
  replace?: boolean;
}

/**
 * An in-app anchor. A real `<a href>` with the basename applied, so middle-click, ⌘-click
 * and "copy link address" behave, and so the plain-click handler can be skipped.
 *
 * The href is also load-bearing for `NavigationGuardContext`, which intercepts anchor
 * clicks in the capture phase and reads `href` to work out where the click was headed.
 * That listener runs before this handler and calls `stopPropagation()`, so a guarded
 * navigation never reaches the router.
 */
export const Link: React.FC<LinkProps> = ({
  to,
  replace,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}) => {
  const router = useRouter();
  const prefetch = usePrefetchIntent(to);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Leave the browser to handle anything that is not a plain left-click: modified clicks
    // open tabs and windows, and a router that swallowed them would break that.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    router.navigate(to, { replace });
  };

  /*
   * Focus as well as hover, or keyboard users get none of this — and blur cancels for the
   * same reason pointerleave does: tabbing through a sidebar should not fetch every item
   * it passes through.
   *
   * The caller's own handler runs first in each pair, matching how `onClick` is treated
   * above, so wiring prefetching in cannot silently swallow a consumer's listener.
   */
  return (
    <a
      href={router.href(to)}
      onClick={handleClick}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        prefetch.start();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        prefetch.cancel();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetch.start();
      }}
      onBlur={(event) => {
        onBlur?.(event);
        prefetch.cancel();
      }}
      {...rest}
    />
  );
};

export interface NavLinkProps extends Omit<LinkProps, 'className'> {
  /** Static, or computed from whether this link's `to` is the current route. */
  className?: string | ((state: { isActive: boolean }) => string);
  /** Match the whole pathname rather than treating `to` as a path prefix. */
  end?: boolean;
}

/**
 * A {@link Link} that knows whether it is the current route.
 *
 * Active means "the current path is at or below `to`", so `/schema/orders.nsf/Alpha` keeps
 * the Schemas item lit — matching what the sidebar did by comparing first path segments.
 * Pass `end` for an exact match. `/` is always exact, or it would match everything.
 */
export const NavLink: React.FC<NavLinkProps> = ({ to, className, end, ...rest }) => {
  const { pathname } = useLocation();
  const isActive =
    end || to === '/' ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={typeof className === 'function' ? className({ isActive }) : className}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    />
  );
};

export interface RouteDef extends LoadableRoute {
  /** Base-relative pattern: literal segments, `:param`, or a trailing `*`. */
  path: string;
  /**
   * The view, rendered eagerly. Mutually exclusive with `load` in practice — give a route
   * one or the other. `element` wins if both are present.
   */
  element?: React.ReactNode;
  /**
   * Rendered only when this returns true — the replacement for wrapping routes in a
   * `<Route element={<PrivateRoutes/>}>` whose `<Outlet/>` was the real child. Called
   * during render, so it may read a hook-derived value from the enclosing component.
   */
  guard?: () => boolean;
  /** Where a failed `guard` sends the user. Renders nothing when omitted. */
  redirectTo?: string;
}

/**
 * `load()` resolves to whatever the bundler hands back; `React.lazy` needs a default
 * export that is a component. Narrowing here rather than in `router.ts` is deliberate —
 * see the note on {@link LoadableRoute}.
 */
type ComponentModule = { default: React.ComponentType };

/**
 * Renders the first route in `routes` that matches the current location, and publishes its
 * params to {@link useParams}.
 *
 * Order is significant and not ranked — see `matchRoutes`. Nothing renders when no route
 * matches; the hosts that need a fallback declare a trailing `'*'`.
 *
 * A route with `load` instead of `element` is code-split (#813). Two things about that are
 * load-bearing:
 *
 * - **The `React.lazy` wrappers are memoised on the route table's identity.** `lazy()`
 *   returns a fresh component type per call, and React remounts when the type changes —
 *   so building them inline would unmount and refetch the view on every render of this
 *   outlet, which `useLocation` makes frequent.
 * - **`guard` is checked before the lazy element is rendered**, and creating a `lazy()`
 *   does not call `load`. So an unauthenticated visitor is redirected without ever
 *   fetching the chunk behind the route they asked for.
 */
export const RouterOutlet: React.FC<{
  routes: readonly RouteDef[];
  /** Shown while a `load` route's chunk is in flight. */
  fallback?: React.ReactNode;
}> = ({ routes, fallback = null }) => {
  const router = useRouter();
  const { pathname } = useLocation();
  const matched = useMemo(() => matchRoutes(routes, pathname), [routes, pathname]);

  const lazyByPath = useMemo(() => {
    const map = new Map<string, React.LazyExoticComponent<React.ComponentType>>();
    for (const route of routes) {
      if (route.load) map.set(route.path, React.lazy(route.load as () => Promise<ComponentModule>));
    }
    return map;
  }, [routes]);

  // Published for `Router.prefetch`, which the hover handlers in `Link`/`NavLink` call.
  useEffect(() => {
    router.setRoutes(routes);
  }, [router, routes]);

  if (!matched) return null;

  const { route, params } = matched;
  if (route.guard && !route.guard()) {
    return route.redirectTo ? <Navigate to={route.redirectTo} /> : null;
  }

  const Lazy = route.element ? undefined : lazyByPath.get(route.path);

  return (
    <ParamsContext.Provider value={params}>
      {Lazy ? (
        <React.Suspense fallback={fallback}>
          <Lazy />
        </React.Suspense>
      ) : (
        route.element
      )}
    </ParamsContext.Provider>
  );
};
