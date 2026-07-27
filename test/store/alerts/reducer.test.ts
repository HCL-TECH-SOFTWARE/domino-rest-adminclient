import { describe, it, expect } from 'vitest';
import alertReducer from '../../../src/store/alerts/reducer';
import { TOGGLE_ALERT, CLOSE_SNACKBAR, AlertState } from '../../../src/store/alerts/types';

const initial: AlertState = {
  visible: false,
  message: '',
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

  it('CLOSE_SNACKBAR hides the alert but keeps the message', () => {
    // It used to also clear `snackbarMessagE`, a field nothing ever wrote (#707). The
    // message is deliberately left alone: Notification reads `message` while it animates
    // out, so clearing it here would blank the text mid-transition.
    const open: AlertState = { ...initial, visible: true, message: 'msg' };
    const next = alertReducer(open, { type: CLOSE_SNACKBAR });

    expect(next).toEqual({ visible: false, message: 'msg' });
  });

  it('carries no snackbar fields', () => {
    // `snackbarStatus`/`snackbarMessagE` were dead twice over: no reducer case ever wrote
    // `snackbarStatus`, so SnackbarToaster's <Snackbar open={…}> could never be true, and
    // the component's only mount site was in an unreachable branch of Header.tsx.
    expect(Object.keys(alertReducer(undefined, { type: '@@UNKNOWN' } as any)).sort()).toEqual([
      'message',
      'visible',
    ]);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      alertReducer(frozen, { type: TOGGLE_ALERT, payload: 'x' })
    ).not.toThrow();
  });
});
