/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import FormDialogHeader, { type KeepFormDialogHeaderCloseDetail } from '../keep-form-dialog-header';

export const KeepFormDialogHeader = createComponent({
  tagName: 'keep-form-dialog-header',
  elementClass: FormDialogHeader,
  react: React,
  events: {
    // Maps to `header-close` rather than `close` so it cannot be confused with the native
    // <dialog> event; consumers keep writing `onClose={…}` either way.
    onClose: 'header-close' as EventName<CustomEvent<KeepFormDialogHeaderCloseDetail>>
  }
});
