/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import DialogHeader from '../keep-dialog-header';

export const KeepDialogHeader = createComponent({
  tagName: 'keep-dialog-header',
  elementClass: DialogHeader,
  react: React
});
