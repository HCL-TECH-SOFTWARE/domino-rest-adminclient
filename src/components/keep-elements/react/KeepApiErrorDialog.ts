/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import ApiErrorDialog from '../keep-api-error-dialog';

export const KeepApiErrorDialog = createComponent({
  tagName: 'keep-api-error-dialog',
  elementClass: ApiErrorDialog,
  react: React
});
