/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import AddImportDialog, {
  type KeepAddImportDialogCloseDetail,
} from '../keep-add-import-dialog';

export const KeepAddImportDialog = createComponent({
  tagName: 'keep-add-import-dialog',
  elementClass: AddImportDialog,
  react: React,
  events: {
    onDialogClose: 'dialog-close' as EventName<CustomEvent<KeepAddImportDialogCloseDetail>>,
  },
});
