/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import searchReducer from '../../../src/store/search/reducer';
import { TOGGLE_SEARCH, CLOSE_SEARCH, SearchState } from '../../../src/store/search/types';

const initial: SearchState = {
  show: false,
};

describe('searchReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(searchReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('TOGGLE_SEARCH flips show on each dispatch', () => {
    const once = searchReducer(initial, { type: TOGGLE_SEARCH });
    expect(once.show).toBe(true);
    expect(searchReducer(once, { type: TOGGLE_SEARCH }).show).toBe(false);
  });

  it('CLOSE_SEARCH forces show to false', () => {
    const open: SearchState = { show: true };
    expect(searchReducer(open, { type: CLOSE_SEARCH }).show).toBe(false);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => searchReducer(frozen, { type: TOGGLE_SEARCH })).not.toThrow();
  });
});
