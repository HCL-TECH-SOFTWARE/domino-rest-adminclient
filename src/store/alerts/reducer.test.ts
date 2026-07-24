import { describe, it, expect } from 'vitest';
import alertReducer from './reducer';
import { TOGGLE_ALERT, CLOSE_SNACKBAR, AlertState } from './types';

const initial: AlertState = {
  visible: false,
  message: '',
  snackbarStatus: false,
  snackbarMessagE: '',
};

describe('alertReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(alertReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('TOGGLE_ALERT flips visible and sets the message', () => {
    const next = alertReducer(initial, { type: TOGGLE_ALERT, payload: 'heads up' });
    expect(next).toMatchObject({ visible: true, message: 'heads up' });
  });

  it('TOGGLE_ALERT toggles visible back on a second dispatch', () => {
    const once = alertReducer(initial, { type: TOGGLE_ALERT, payload: 'a' });
    const twice = alertReducer(once, { type: TOGGLE_ALERT, payload: 'b' });
    expect(twice.visible).toBe(false);
    expect(twice.message).toBe('b');
  });

  it('CLOSE_SNACKBAR hides the alert and clears snackbarMessagE', () => {
    const open: AlertState = { ...initial, visible: true, snackbarMessagE: 'msg' };
    const next = alertReducer(open, { type: CLOSE_SNACKBAR, payload: '' });
    expect(next).toMatchObject({ visible: false, snackbarMessagE: '' });
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      alertReducer(frozen, { type: TOGGLE_ALERT, payload: 'x' })
    ).not.toThrow();
  });
});
