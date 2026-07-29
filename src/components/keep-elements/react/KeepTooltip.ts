/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Tooltip from '../keep-tooltip';

export const KeepTooltip = createComponent({
  tagName: 'keep-tooltip',
  elementClass: Tooltip,
  react: React
});
