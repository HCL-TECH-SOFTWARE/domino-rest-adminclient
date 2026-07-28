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
  useSyncExternalStore,
} from 'react';
import {
  matchRoutes,
  Router,
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
export const Link: React.FC<LinkProps> = ({ to, replace, onClick, ...rest }) => {
  const router = useRouter();

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

  return <a href={router.href(to)} onClick={handleClick} {...rest} />;
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

export interface RouteDef {
  /** Base-relative pattern: literal segments, `:param`, or a trailing `*`. */
  path: string;
  element: React.ReactNode;
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
 * Renders the first route in `routes` that matches the current location, and publishes its
 * params to {@link useParams}.
 *
 * Order is significant and not ranked — see `matchRoutes`. Nothing renders when no route
 * matches; the hosts that need a fallback declare a trailing `'*'`.
 */
export const RouterOutlet: React.FC<{ routes: readonly RouteDef[] }> = ({ routes }) => {
  const { pathname } = useLocation();
  const matched = useMemo(() => matchRoutes(routes, pathname), [routes, pathname]);

  if (!matched) return null;

  const { route, params } = matched;
  if (route.guard && !route.guard()) {
    return route.redirectTo ? <Navigate to={route.redirectTo} /> : null;
  }

  return <ParamsContext.Provider value={params}>{route.element}</ParamsContext.Provider>;
};
