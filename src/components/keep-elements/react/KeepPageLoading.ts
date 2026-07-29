/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import PageLoading from '../keep-page-loading';

export const KeepPageLoading = createComponent({
  tagName: 'keep-page-loading',
  elementClass: PageLoading,
  react: React
});
