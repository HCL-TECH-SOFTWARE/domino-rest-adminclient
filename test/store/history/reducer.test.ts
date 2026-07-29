/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import historyReducer, { addHistory } from '../../../src/store/history/reducer';
import type { HistoryState } from '../../../src/store/history/types';

const initial: HistoryState = {
  histories: [
    { uri: '/', label: 'HCL Notes Admin' },
    { uri: 'server', label: 'Server' },
    { uri: 'keep-api', label: 'HCL Domino REST API' },
  ],
};

describe('historyReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(historyReducer(undefined, { type: '@@UNKNOWN' })).toEqual(initial);
  });

  it('addHistory appends the payload to histories', () => {
    const entry = { uri: 'scopes', label: 'Scopes' };
    const next = historyReducer(initial, addHistory(entry));
    expect(next.histories).toHaveLength(initial.histories.length + 1);
    expect(next.histories[next.histories.length - 1]).toEqual(entry);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    const entry = { uri: 'scopes', label: 'Scopes' };
    expect(() => historyReducer(frozen, addHistory(entry))).not.toThrow();
    const next = historyReducer(frozen, addHistory(entry));
    expect(next).not.toBe(frozen);
    expect(frozen.histories).toHaveLength(3);
  });
});
