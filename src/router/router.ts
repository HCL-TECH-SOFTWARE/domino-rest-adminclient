/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The router core — history, matching and navigation, with no framework in it.
 *
 * #716 replaces the react-router dependency. There is no forward fix in its 7.x line for the
 * open advisory — 7.18.1 is the newest published, the first non-vulnerable is
 * `react-router@8.3.0`, and the `-dom` package has no 8.x — so removing it is the
 * remediation, not an upgrade.
 *
 * Nothing here imports React. The React bindings live in `./react`, and a Lit
 * `ReactiveController` can subscribe to the same {@link Router} when the views convert —
 * that is the point of the split, and the reason matching returns data rather than markup.
 *
 * Report 04 §10 sketched this around `URLPattern`. The nine live routes use only `:param`
 * segments — no wildcards inside a path, no optionals, no regex groups — so
 * {@link matchPath} does it directly. That is a smaller thing to reason about than
 * `URLPattern`'s grammar, and it carries no browser-support tail.
 */

/** A parsed URL, split the way callers actually consume it. */
export interface RouterLocation {
  /** Path with the basename already stripped, always leading-slash. */
  pathname: string;
  /** Query including its `?`, or `''`. */
  search: string;
  /** Fragment including its `#`, or `''`. */
  hash: string;
}

/** Destination for {@link Router.navigate}. A bare string is a pathname. */
export type To = string | Partial<RouterLocation>;

/** Values captured from `:param` segments, already percent-decoded. */
export type RouteParams = Record<string, string>;

/**
 * Matches one pattern against one pathname.
 *
 * - `:name` captures a segment and decodes it.
 * - A trailing `*` matches the rest of the path, including nothing.
 * - Everything else must match literally.
 *
 * Returns the captured params, or `null` for no match. An empty object is a *successful*
 * match with no params, so callers must test `!== null` rather than truthiness.
 */
export function matchPath(pattern: string, pathname: string): RouteParams | null {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(pathname);
  const params: RouteParams = {};

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];

    // `*` is only meaningful as the last segment, where it swallows the remainder.
    if (part === '*') return i === patternParts.length - 1 ? params : null;

    if (i >= pathParts.length) return null;

    if (part.startsWith(':')) {
      params[part.slice(1)] = safeDecode(pathParts[i]);
      continue;
    }
    if (part !== pathParts[i]) return null;
  }

  // Without a trailing `*` the two must be the same length: `/schema` must not match
  // `/schema/orders.nsf/Alpha`, which has its own route and its own component.
  return patternParts.length === pathParts.length ? params : null;
}

/**
 * The first route in `routes` whose `path` matches, with its params.
 *
 * **Declaration order wins** — deliberately, in place of react-router's specificity
 * ranking. With nine routes an explicit order is something a reader can verify at the
 * table; a ranking algorithm is something they have to trust. The one consequence is that
 * a catch-all `'*'` has to be listed last, which `App.tsx` documents at its table.
 */
export function matchRoutes<T extends { path: string }>(
  routes: readonly T[],
  pathname: string
): { route: T; params: RouteParams } | null {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params !== null) return { route, params };
  }
  return null;
}

/** Splits on `/`, dropping the empty parts leading and trailing slashes produce. */
const splitPath = (path: string): string[] => path.split('/').filter(Boolean);

/**
 * `decodeURIComponent` that returns its input on a malformed escape.
 *
 * A URL like `/schema/100%/Alpha` is reachable by hand-editing the address bar, and a raw
 * `decodeURIComponent` would throw `URIError` out of the render pass and blank the app.
 */
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Renders a {@link To} as a path string, with `search`/`hash` in URL order. */
export function toHref(to: To, fallbackPathname = ''): string {
  if (typeof to === 'string') return to;
  return `${to.pathname ?? fallbackPathname}${to.search ?? ''}${to.hash ?? ''}`;
}

/**
 * The history operations the router needs, so tests can drive it without a real URL bar.
 * `browserHistory` wraps `window.history`; `memoryHistory` keeps an array.
 */
export interface RouterHistory {
  location(): RouterLocation;
  push(href: string): void;
  replace(href: string): void;
  go(delta: number): void;
  /** Subscribe to history-initiated changes (back/forward). Returns an unsubscribe. */
  listen(onChange: () => void): () => void;
}

const parse = (href: string): RouterLocation => {
  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const withoutHash = hashAt === -1 ? href : href.slice(0, hashAt);

  const searchAt = withoutHash.indexOf('?');
  const search = searchAt === -1 ? '' : withoutHash.slice(searchAt);
  const pathname = searchAt === -1 ? withoutHash : withoutHash.slice(0, searchAt);

  return { pathname: pathname || '/', search, hash };
};

/** Reads and writes the real address bar. */
export const browserHistory = (): RouterHistory => ({
  location: () => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  }),
  push: (href) => window.history.pushState(null, '', href),
  replace: (href) => window.history.replaceState(null, '', href),
  go: (delta) => window.history.go(delta),
  listen: (onChange) => {
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  },
});

/**
 * An in-memory stack, for tests and for rendering without a document.
 *
 * `go` clamps rather than throwing: going back past the first entry is what a user does at
 * the start of a session, and it is a no-op in a browser too.
 */
export const memoryHistory = (initialEntries: string[] = ['/']): RouterHistory => {
  const entries = [...initialEntries];
  let index = entries.length - 1;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());

  return {
    location: () => parse(entries[index]),
    push: (href) => {
      entries.splice(index + 1, entries.length, href);
      index = entries.length - 1;
    },
    replace: (href) => {
      entries[index] = href;
    },
    go: (delta) => {
      const next = Math.min(Math.max(index + delta, 0), entries.length - 1);
      if (next === index) return;
      index = next;
      emit();
    },
    listen: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange) as unknown as void;
    },
  };
};

export interface RouterOptions {
  /** URL prefix the app is served under, e.g. `/admin/ui`. No trailing slash. */
  base?: string;
  history?: RouterHistory;
}

/**
 * Current location, navigation, and a subscription for views to re-render on.
 *
 * The basename is handled in exactly two places: stripped in {@link Router.location} and
 * prefixed in {@link Router.href}. Everything above this line — route tables, `navigate()`
 * calls, `<Link to>` — is written base-relative and never has to think about it.
 */
export class Router {
  readonly base: string;
  private readonly history: RouterHistory;
  private readonly listeners = new Set<() => void>();
  private snapshot: RouterLocation;
  private stopListening: () => void;

  constructor({ base = '', history = browserHistory() }: RouterOptions = {}) {
    this.base = base.replace(/\/$/, '');
    this.history = history;
    this.snapshot = this.read();
    this.stopListening = this.history.listen(this.sync);
  }

  /**
   * The current location, base stripped. Stable between navigations — `useSyncExternalStore`
   * compares snapshots by identity, so this must not build a fresh object per read.
   */
  location(): RouterLocation {
    return this.snapshot;
  }

  /** The full URL for a destination, base included. What goes in an `<a href>`. */
  href(to: To): string {
    const path = toHref(to, this.snapshot.pathname);
    return path.startsWith('/') ? this.base + path : path;
  }

  /**
   * Go to `to`, or move through history when given a number (`-1` is back).
   *
   * Navigating to the URL already showing is dropped rather than pushed: re-clicking the
   * active item in the sidebar should not grow the back stack.
   */
  navigate(to: To | number, { replace = false }: { replace?: boolean } = {}): void {
    if (typeof to === 'number') {
      this.history.go(to);
      return;
    }

    const href = this.href(to);
    const current = this.href(this.snapshot);
    if (href === current && !replace) return;

    if (replace) this.history.replace(href);
    else this.history.push(href);
    this.sync();
  }

  /** Subscribe to location changes. Returns an unsubscribe. */
  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  /** Detach from the underlying history. For tests and teardown. */
  dispose(): void {
    this.stopListening();
    this.listeners.clear();
  }

  /** Re-read the history and notify subscribers if the location actually moved. */
  private sync = (): void => {
    const next = this.read();
    const prev = this.snapshot;
    if (next.pathname === prev.pathname && next.search === prev.search && next.hash === prev.hash) {
      return;
    }
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  };

  private read(): RouterLocation {
    const { pathname, search, hash } = this.history.location();
    const stripped =
      this.base && pathname.startsWith(this.base) ? pathname.slice(this.base.length) : pathname;
    return { pathname: stripped || '/', search, hash };
  }
}
