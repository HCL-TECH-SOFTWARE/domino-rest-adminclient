/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Footer from '../keep-footer';

export const KeepFooter = createComponent({
  tagName: 'keep-footer',
  elementClass: Footer,
  react: React
});
