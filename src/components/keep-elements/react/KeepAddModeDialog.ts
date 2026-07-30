/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import AddModeDialog, {
  type KeepAddModeDialogDetail,
  type KeepAddModeNameChangeDetail
} from '../keep-add-mode-dialog';

export const KeepAddModeDialog = createComponent({
  tagName: 'keep-add-mode-dialog',
  elementClass: AddModeDialog,
  react: React,
  events: {
    // `dialog-save` / `dialog-close` are prefixed on the element side so they cannot be
    // mistaken for the native <dialog> events of nearly those names.
    onSave: 'dialog-save' as EventName<CustomEvent<KeepAddModeDialogDetail>>,
    onClose: 'dialog-close' as EventName<CustomEvent<KeepAddModeDialogDetail>>,
    // `detail` is the text as it now reads, so the parent never has to reach into the
    // element for it.
    onModeNameChange: 'mode-name-change' as EventName<CustomEvent<KeepAddModeNameChangeDetail>>
  }
});
