/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import SourceTree from '../keep-source';

export const KeepSourceTree = createComponent({
  tagName: 'keep-source-tree',
  elementClass: SourceTree,
  react: React
});
