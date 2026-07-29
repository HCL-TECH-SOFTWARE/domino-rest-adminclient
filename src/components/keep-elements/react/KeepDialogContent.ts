/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import DialogContent from '../keep-dialog-content';

export const KeepDialogContent = createComponent({
  tagName: 'keep-dialog-content',
  elementClass: DialogContent,
  react: React
});
