/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import searchReducer, { toggleSearch, closeSearch } from '../../../src/store/search/reducer';
import type { SearchState } from '../../../src/store/search/types';

const initial: SearchState = {
  show: false,
};

describe('searchReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(searchReducer(undefined, { type: '@@UNKNOWN' })).toEqual(initial);
  });

  it('toggleSearch flips show on each dispatch', () => {
    const once = searchReducer(initial, toggleSearch());
    expect(once.show).toBe(true);
    expect(searchReducer(once, toggleSearch()).show).toBe(false);
  });

  it('closeSearch forces show to false', () => {
    const open: SearchState = { show: true };
    expect(searchReducer(open, closeSearch()).show).toBe(false);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => searchReducer(frozen, toggleSearch())).not.toThrow();
    expect(searchReducer(frozen, toggleSearch())).not.toBe(frozen);
    expect(frozen.show).toBe(false);
  });
});
