/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import PageRouters from '../keep-page-routers';

export const KeepPageRouters = createComponent({
  tagName: 'keep-page-routers',
  elementClass: PageRouters,
  react: React
});
