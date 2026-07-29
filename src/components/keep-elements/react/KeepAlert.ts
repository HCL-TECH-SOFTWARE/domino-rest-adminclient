/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Alert from '../keep-alert';

export const KeepAlert = createComponent({
  tagName: 'keep-alert',
  elementClass: Alert,
  react: React
});
