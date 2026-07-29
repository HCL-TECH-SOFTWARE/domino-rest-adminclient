/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import alertReducer from '../../../src/store/alerts/reducer';
import { AlertState } from '../../../src/store/alerts/types';
import { toggleAlert, closeSnackbar } from '../../../src/store/alerts/action';

const initial: AlertState = {
  visible: false,
  message: '',
};

describe('alertReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(alertReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('toggleAlert shows the alert and sets the message', () => {
    const next = alertReducer(initial, toggleAlert('heads up'));
    expect(next).toMatchObject({ visible: true, message: 'heads up' });
  });

  it('toggleAlert keeps the alert visible when a second message arrives', () => {
    // It used to be `visible: !state.visible`, true to the action's name and wrong
    // for its only use. Notification auto-hides after 3s; a second alert inside that
    // window flipped visible back to false, so the new message replaced the old one
    // and was then never shown. Reported as "a second failure hides them
    // instead of showing one" (#792).
    const once = alertReducer(initial, toggleAlert('a'));
    const twice = alertReducer(once, toggleAlert('b'));

    expect(twice.visible).toBe(true);
    expect(twice.message).toBe('b');
  });

  it('toggleAlert re-shows an alert that was dismissed', () => {
    const dismissed = alertReducer(
      { visible: false, message: 'a' },
      toggleAlert('b'),
    );
    expect(dismissed).toEqual({ visible: true, message: 'b' });
  });

  it('closeSnackbar hides the alert but keeps the message', () => {
    // It used to also clear `snackbarMessagE`, a field nothing ever wrote (#707). The
    // message is deliberately left alone: Notification reads `message` while it animates
    // out, so clearing it here would blank the text mid-transition.
    const open: AlertState = { ...initial, visible: true, message: 'msg' };
    const next = alertReducer(open, closeSnackbar());

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
      alertReducer(frozen, toggleAlert('x'))
    ).not.toThrow();
  });
});
