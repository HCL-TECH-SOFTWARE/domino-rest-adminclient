import { describe, it, expect } from 'vitest';
import drawerReducer from './reducer';
import {
  TOGGLE_DRAWER,
  TOGGLE_APPLICATION_DRAWER,
  TOGGLE_APPLICATION_FILTER_DRAWER,
  TOGGLE_QUICKCONFIG_DRAWER,
  TOGGLE_CONSENTS_DRAWER,
  INIT_STATE,
  DrawerState,
} from './types';

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

  it('TOGGLE_DRAWER flips visible on each dispatch', () => {
    const once = drawerReducer(initial, { type: TOGGLE_DRAWER });
    expect(once.visible).toBe(true);
    expect(drawerReducer(once, { type: TOGGLE_DRAWER }).visible).toBe(false);
  });

  it('TOGGLE_APPLICATION_DRAWER flips applicationDrawer', () => {
    expect(drawerReducer(initial, { type: TOGGLE_APPLICATION_DRAWER }).applicationDrawer).toBe(true);
  });

  it('TOGGLE_APPLICATION_FILTER_DRAWER flips appFilterDrawer', () => {
    expect(drawerReducer(initial, { type: TOGGLE_APPLICATION_FILTER_DRAWER }).appFilterDrawer).toBe(
      true,
    );
  });

  it('TOGGLE_QUICKCONFIG_DRAWER flips quickConfigDrawer', () => {
    expect(drawerReducer(initial, { type: TOGGLE_QUICKCONFIG_DRAWER }).quickConfigDrawer).toBe(true);
  });

  it('TOGGLE_CONSENTS_DRAWER flips consentsDrawer', () => {
    expect(drawerReducer(initial, { type: TOGGLE_CONSENTS_DRAWER }).consentsDrawer).toBe(true);
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
    expect(() => drawerReducer(frozen, { type: TOGGLE_DRAWER })).not.toThrow();
    expect(drawerReducer(frozen, { type: TOGGLE_DRAWER })).not.toBe(frozen);
  });
});
