/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import MobileHeader from '../keep-mobile-header';

export const KeepMobileHeader = createComponent({
  tagName: 'keep-mobile-header',
  elementClass: MobileHeader,
  react: React
});
