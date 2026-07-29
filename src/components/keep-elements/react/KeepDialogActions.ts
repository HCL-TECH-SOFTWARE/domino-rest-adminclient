/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import DialogActions from '../keep-dialog-actions';

export const KeepDialogActions = createComponent({
  tagName: 'keep-dialog-actions',
  elementClass: DialogActions,
  react: React
});
