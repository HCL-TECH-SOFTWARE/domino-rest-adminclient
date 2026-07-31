/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Router } from './router';

/**
 * The application router, as a module singleton (#926) — the counterpart to `store/store.ts`.
 *
 * It used to be built in `App.tsx` with `useMemo` and handed to `<RouterProvider>`, which
 * made React the only way to reach it. A Lit element has no provider to read from, so four
 * `@lit/react` wrappers existed for no other purpose than to call `useRouter()` and pass the
 * instance down as a property. `RouterController` replaces all of that, and it needs the
 * router to be importable like any other module first.
 *
 * `<RouterProvider>` still wraps the React tree and is handed *this* instance, so both
 * bindings drive the same history — which is what lets a screen convert one element at a
 * time instead of all at once.
 *
 * ## Why a function rather than an exported const
 *
 * The store is `export const store = configureStore(…)`; this cannot be, for two reasons.
 *
 * 1. **The constructor has a side effect.** It attaches a `popstate` listener to `window`,
 *    so an eagerly constructed instance would install one in every module graph that so
 *    much as names the router — including all ~250 test files, which import elements that
 *    import this.
 * 2. **Tests replace it.** Building it lazily means {@link setRouterForTest} can install a
 *    memory-backed router *before* anything asks for one, so no test ever touches the real
 *    address bar by accident.
 */

/**
 * Where the UI is served. Every route table, `navigate()` and `<Link to>` in the app is
 * written base-relative and never sees it — {@link Router} strips it on read and prefixes it
 * on `href`.
 */
export const ROUTER_BASE = '/admin/ui';

let instance: Router | null = null;

/** The app's one {@link Router}, created on first use. */
export function getRouter(): Router {
  instance ??= new Router({ base: ROUTER_BASE });
  return instance;
}

/**
 * Test seam: make `next` the app's router for the rest of the current test.
 *
 * Returns what it was given, so a test can install and capture in one expression:
 *
 * ```ts
 * const router = setRouterForTest(new Router({ history: memoryHistory(['/schema']) }));
 * ```
 *
 * Any previous instance is disposed, so a lazily created browser-backed one does not leave
 * its `popstate` listener behind. `test/setupTests.ts` calls {@link resetRouterForTest} in a
 * global `afterEach`, which is what stops one test's route from being visible to the next.
 */
export function setRouterForTest(next: Router): Router {
  instance?.dispose();
  instance = next;
  return next;
}

/** Test seam: drop the installed router, so the next call to {@link getRouter} builds one. */
export function resetRouterForTest(): void {
  instance?.dispose();
  instance = null;
}
