/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Switch from '../keep-switch';

export const KeepSwitch = createComponent({
  tagName: 'keep-switch',
  elementClass: Switch,
  react: React
});
