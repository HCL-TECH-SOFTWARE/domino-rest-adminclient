/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import drawerReducer, {
  toggleDrawer,
  toggleApplicationDrawer,
  toggleAppFilterDrawer,
  toggleQuickConfigDrawer,
  toggleConsentsDrawer,
} from '../../../src/store/drawer/reducer';
import { INIT_STATE, DrawerState } from '../../../src/store/drawer/types';

const initial: DrawerState = {
  visible: false,
  applicationDrawer: false,
  appFilterDrawer: false,
  quickConfigDrawer: false,
  consentsDrawer: false,
};

describe('drawerReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(drawerReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('toggleDrawer flips visible on each dispatch', () => {
    const once = drawerReducer(initial, toggleDrawer());
    expect(once.visible).toBe(true);
    expect(drawerReducer(once, toggleDrawer()).visible).toBe(false);
  });

  it('toggleApplicationDrawer flips applicationDrawer', () => {
    expect(drawerReducer(initial, toggleApplicationDrawer()).applicationDrawer).toBe(true);
  });

  it('toggleAppFilterDrawer flips appFilterDrawer', () => {
    expect(drawerReducer(initial, toggleAppFilterDrawer()).appFilterDrawer).toBe(
      true,
    );
  });

  it('toggleQuickConfigDrawer flips quickConfigDrawer', () => {
    expect(drawerReducer(initial, toggleQuickConfigDrawer()).quickConfigDrawer).toBe(true);
  });

  it('toggleConsentsDrawer flips consentsDrawer', () => {
    expect(drawerReducer(initial, toggleConsentsDrawer()).consentsDrawer).toBe(true);
  });

  it('INIT_STATE resets to the initial state', () => {
    const dirty: DrawerState = {
      visible: true,
      applicationDrawer: true,
      appFilterDrawer: true,
      quickConfigDrawer: true,
      consentsDrawer: true,
    };
    expect(drawerReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => drawerReducer(frozen, toggleDrawer())).not.toThrow();
    expect(drawerReducer(frozen, toggleDrawer())).not.toBe(frozen);
  });
});
