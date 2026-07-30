/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import navigationGuardReducer from '../../../src/store/navigationGuard/reducer';
// Through `action`, not `reducer`: that is the path every component imports, and it is the
// one that would break silently if the re-export were dropped.
import {
  allowNavigation,
  blockNavigation,
  cancelNavigation,
  setNavigationDirty,
} from '../../../src/store/navigationGuard/action';
import { BACK_NAVIGATION, INIT_STATE } from '../../../src/store/navigationGuard/types';
import { rootReducer } from '../../../src/store';

/**
 * #806 — `NavigationGuardContext` became this slice.
 *
 * The context published three functions over a `useState` pair and three refs; what moved
 * here is the pair. The behaviour that used the refs — walking `composedPath()`, calling the
 * registered save, performing the navigation — stayed with the component, and is covered by
 * `test/components/navigation/NavigationGuard.test.tsx`.
 */

const unknown = { type: '@@UNKNOWN' } as never;
const initial = () => navigationGuardReducer(undefined, unknown);

/** Dirty, with a navigation held — the state the dialog is up in. */
const blocked = () =>
  navigationGuardReducer(
    navigationGuardReducer(undefined, setNavigationDirty(true)),
    blockNavigation('/scope'),
  );

describe('navigationGuardReducer', () => {
  it('starts clean, holding nothing', () => {
    expect(initial()).toEqual({ isDirty: false, pendingPath: null });
  });

  it('setNavigationDirty records the flag both ways', () => {
    const dirty = navigationGuardReducer(initial(), setNavigationDirty(true));
    expect(dirty.isDirty).toBe(true);
    expect(navigationGuardReducer(dirty, setNavigationDirty(false)).isDirty).toBe(false);
  });

  it('blockNavigation holds the path without touching the dirty flag', () => {
    // Only ever dispatched when already dirty, and clearing the flag here would let the
    // very navigation being held through on the next click.
    expect(blocked()).toEqual({ isDirty: true, pendingPath: '/scope' });
  });

  it('holds a back/forward press as the sentinel rather than a path', () => {
    // `navigate(-1)` is a history move, not a route — see the note on BACK_NAVIGATION.
    const back = navigationGuardReducer(initial(), blockNavigation(BACK_NAVIGATION));
    expect(back.pendingPath).toBe('__BACK__');
  });

  it('cancelNavigation drops the held navigation and stays dirty', () => {
    // The user chose to stay, so the unsaved work — and the guard on it — are still there.
    expect(navigationGuardReducer(blocked(), cancelNavigation())).toEqual({
      isDirty: true,
      pendingPath: null,
    });
  });

  it('allowNavigation clears both, in one transition', () => {
    // Two dispatches would make "clean but still holding a navigation" observable, and a
    // subscriber that saw it would act on a navigation the guard had already released.
    expect(navigationGuardReducer(blocked(), allowNavigation())).toEqual({
      isDirty: false,
      pendingPath: null,
    });
  });

  it('INIT_STATE resets the slice', () => {
    // Matched as the bare literal it is. Declared under `reducers` it would be namespaced to
    // 'navigationGuard/INIT_STATE' and this broadcast — dispatched by logout — would sail
    // past, leaving the next session guarded by the last one's dirty flag.
    expect(navigationGuardReducer(blocked(), { type: INIT_STATE })).toEqual(initial());
  });

  it('does not mutate the state it is given', () => {
    const frozen = Object.freeze(initial());
    expect(() => navigationGuardReducer(frozen, setNavigationDirty(true))).not.toThrow();
  });

  it('is wired into the root reducer, and reacts to nothing else', () => {
    const before = rootReducer(undefined, { type: '@@INIT' } as never);
    expect(before.navigationGuard).toBeDefined();

    const next = rootReducer(before, blockNavigation('/scope') as never);
    expect(next.navigationGuard.pendingPath).toBe('/scope');

    for (const slice of Object.keys(before) as Array<keyof typeof before>) {
      if (slice === 'navigationGuard') continue;
      expect(next[slice], `${slice} reacted to a navigationGuard action`).toEqual(before[slice]);
    }
  });
});
