/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import dialogReducer, { setApiLoading, toggleDeleteDialog, toggleErrorDialog, toggleResetViewDialog } from '../../../src/store/dialog/reducer';
import { INIT_STATE, DialogStates } from '../../../src/store/dialog/types';

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

  it('setApiLoading sets loading from the payload', () => {
    expect(dialogReducer(initial, setApiLoading(true))).toMatchObject({
      loading: true,
    });
  });

  it('toggleDeleteDialog flips deleteDialog on each dispatch', () => {
    const once = dialogReducer(initial, toggleDeleteDialog());
    expect(once.deleteDialog).toBe(true);
    expect(dialogReducer(once, toggleDeleteDialog()).deleteDialog).toBe(false);
  });

  it('toggleErrorDialog toggles the dialog open and sets the message', () => {
    const next = dialogReducer(initial, toggleErrorDialog('boom'));
    expect(next).toMatchObject({ errorDialogOpen: true, errorDialogMessage: 'boom' });
  });

  it('toggleResetViewDialog sets resetViewDialog from the payload', () => {
    expect(
      dialogReducer(initial, toggleResetViewDialog(true)).resetViewDialog,
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
    expect(() => dialogReducer(frozen, toggleDeleteDialog())).not.toThrow();
  });
});
