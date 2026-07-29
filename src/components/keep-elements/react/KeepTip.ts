/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Tip from '../keep-tip';

export const KeepTip = createComponent({
  tagName: 'keep-tip',
  elementClass: Tip,
  react: React
});
