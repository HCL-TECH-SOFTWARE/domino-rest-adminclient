/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import dialogReducer from '../../../src/store/dialog/reducer';
import {
  SET_API_LOADING,
  TOGGLE_DELETE_DIALOG,
  TOGGLE_ERROR_DIALOG,
  TOGGLE_RESET_VIEW_DIALOG,
  INIT_STATE,
  DialogStates,
} from '../../../src/store/dialog/types';

const initial: DialogStates = {
  deleteDialog: false,
  errorDialogOpen: false,
  errorDialogMessage: '',
  loading: false,
  resetViewDialog: false,
};

describe('dialogReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(dialogReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('SET_API_LOADING sets loading from the payload', () => {
    expect(dialogReducer(initial, { type: SET_API_LOADING, payload: true })).toMatchObject({
      loading: true,
    });
  });

  it('TOGGLE_DELETE_DIALOG flips deleteDialog on each dispatch', () => {
    const once = dialogReducer(initial, { type: TOGGLE_DELETE_DIALOG });
    expect(once.deleteDialog).toBe(true);
    expect(dialogReducer(once, { type: TOGGLE_DELETE_DIALOG }).deleteDialog).toBe(false);
  });

  it('TOGGLE_ERROR_DIALOG toggles the dialog open and sets the message', () => {
    const next = dialogReducer(initial, { type: TOGGLE_ERROR_DIALOG, payload: 'boom' });
    expect(next).toMatchObject({ errorDialogOpen: true, errorDialogMessage: 'boom' });
  });

  it('TOGGLE_RESET_VIEW_DIALOG sets resetViewDialog from the payload', () => {
    expect(
      dialogReducer(initial, { type: TOGGLE_RESET_VIEW_DIALOG, payload: true }).resetViewDialog,
    ).toBe(true);
  });

  it('INIT_STATE resets to the initial state', () => {
    const dirty: DialogStates = {
      ...initial,
      deleteDialog: true,
      loading: true,
      errorDialogMessage: 'x',
    };
    expect(dialogReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => dialogReducer(frozen, { type: TOGGLE_DELETE_DIALOG })).not.toThrow();
  });
});
