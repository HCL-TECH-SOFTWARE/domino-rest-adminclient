/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Drawer from '../keep-drawer';

export const KeepDrawer = createComponent({
  tagName: 'keep-drawer',
  elementClass: Drawer,
  react: React
});
