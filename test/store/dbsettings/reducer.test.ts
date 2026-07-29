/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import dbSettingReducer, { toggleSettings } from '../../../src/store/dbsettings/reducer';
import type { DBSettingDialogState } from '../../../src/store/dbsettings/types';

const initial: DBSettingDialogState = {
  visible: false,
};

describe('dbSettingReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(dbSettingReducer(undefined, { type: '@@UNKNOWN' })).toEqual(initial);
  });

  it('toggleSettings flips visible on each dispatch', () => {
    const once = dbSettingReducer(initial, toggleSettings());
    expect(once.visible).toBe(true);
    expect(dbSettingReducer(once, toggleSettings()).visible).toBe(false);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => dbSettingReducer(frozen, toggleSettings())).not.toThrow();
    expect(dbSettingReducer(frozen, toggleSettings())).not.toBe(frozen);
    expect(frozen.visible).toBe(false);
  });
});
