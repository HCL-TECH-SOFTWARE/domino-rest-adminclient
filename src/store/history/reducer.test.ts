import { describe, it, expect } from 'vitest';
import historyReducer from './reducer';
import { ADD_HISTORY, HistoryState } from './types';

const initial: HistoryState = {
  histories: [
    { uri: '/', label: 'HCL Notes Admin' },
    { uri: 'server', label: 'Server' },
    { uri: 'keep-api', label: 'HCL Domino REST API' },
  ],
};

describe('historyReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(historyReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('ADD_HISTORY appends the payload to histories', () => {
    const entry = { uri: 'scopes', label: 'Scopes' };
    const next = historyReducer(initial, { type: ADD_HISTORY, payload: entry });
    expect(next.histories).toHaveLength(initial.histories.length + 1);
    expect(next.histories[next.histories.length - 1]).toEqual(entry);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    const entry = { uri: 'scopes', label: 'Scopes' };
    expect(() => historyReducer(frozen, { type: ADD_HISTORY, payload: entry })).not.toThrow();
    const next = historyReducer(frozen, { type: ADD_HISTORY, payload: entry });
    expect(next).not.toBe(frozen);
    expect(frozen.histories).toHaveLength(3);
  });
});
