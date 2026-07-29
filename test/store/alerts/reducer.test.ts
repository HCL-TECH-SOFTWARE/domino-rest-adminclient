/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

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

  it('TOGGLE_ALERT shows the alert and sets the message', () => {
    const next = alertReducer(initial, { type: TOGGLE_ALERT, payload: 'heads up' });
    expect(next).toMatchObject({ visible: true, message: 'heads up' });
  });

  it('TOGGLE_ALERT keeps the alert visible when a second message arrives', () => {
    // It used to be `visible: !state.visible`, true to the action's name and wrong
    // for its only use. Notification auto-hides after 3s; a second alert inside that
    // window flipped visible back to false, so the new message replaced the old one
    // and was then never shown. Reported as "a second failure hides them
    // instead of showing one" (#792).
    const once = alertReducer(initial, { type: TOGGLE_ALERT, payload: 'a' });
    const twice = alertReducer(once, { type: TOGGLE_ALERT, payload: 'b' });

    expect(twice.visible).toBe(true);
    expect(twice.message).toBe('b');
  });

  it('TOGGLE_ALERT re-shows an alert that was dismissed', () => {
    const dismissed = alertReducer(
      { visible: false, message: 'a' },
      { type: TOGGLE_ALERT, payload: 'b' },
    );
    expect(dismissed).toEqual({ visible: true, message: 'b' });
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
