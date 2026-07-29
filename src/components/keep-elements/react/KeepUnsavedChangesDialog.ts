/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import UnsavedChangesDialog, { type KeepUnsavedChangesDialogDetail } from '../keep-unsaved-changes-dialog';

export const KeepUnsavedChangesDialog = createComponent({
  tagName: 'keep-unsaved-changes-dialog',
  elementClass: UnsavedChangesDialog,
  react: React,
  events: {
    // Prefixed on the element side so they cannot be confused with the native <dialog>
    // `cancel`/`close` events; the React-facing names stay as they were.
    onSave: 'dialog-save' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>,
    onDiscard: 'dialog-discard' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>,
    onCancel: 'dialog-cancel' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>
  }
});
