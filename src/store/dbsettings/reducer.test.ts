import { describe, it, expect } from 'vitest';
import dbSettingReducer from './reducer';
import { TOGGLE_DBSETTING_DIALOG, DBSettingDialogState } from './types';

const initial: DBSettingDialogState = {
  visible: false,
};

describe('dbSettingReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(dbSettingReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('TOGGLE_DBSETTING_DIALOG flips visible on each dispatch', () => {
    const once = dbSettingReducer(initial, { type: TOGGLE_DBSETTING_DIALOG });
    expect(once.visible).toBe(true);
    expect(dbSettingReducer(once, { type: TOGGLE_DBSETTING_DIALOG }).visible).toBe(false);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      dbSettingReducer(frozen, { type: TOGGLE_DBSETTING_DIALOG })
    ).not.toThrow();
  });
});
