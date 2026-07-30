/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import {
  selectIsDirty,
  selectPendingPath,
} from '../../../src/store/navigationGuard/selectors';
import type { AppState } from '../../../src/store';
import type { NavigationGuardState } from '../../../src/store/navigationGuard/types';

const stateWith = (navigationGuard: NavigationGuardState) => ({ navigationGuard }) as AppState;

describe('navigationGuard selectors', () => {
  it('reads the dirty flag and the held navigation', () => {
    const state = stateWith({ isDirty: true, pendingPath: '/scope' });
    expect(selectIsDirty(state)).toBe(true);
    expect(selectPendingPath(state)).toBe('/scope');
  });

  it('returns null for the held navigation when nothing is held', () => {
    expect(selectPendingPath(stateWith({ isDirty: false, pendingPath: null }))).toBeNull();
  });

  it('returns primitives, so a StoreController can subscribe to them safely', () => {
    // Change detection is `Object.is` on the selector result. A selector that built
    // `{ isDirty, pendingPath }` would never be equal to its previous result and would
    // re-render its host on every store change, whatever the change was.
    const state = stateWith({ isDirty: true, pendingPath: '/scope' });
    expect(Object.is(selectIsDirty(state), selectIsDirty(stateWith({ isDirty: true, pendingPath: null })))).toBe(true);
    expect(Object.is(selectPendingPath(state), selectPendingPath(state))).toBe(true);
  });
});
