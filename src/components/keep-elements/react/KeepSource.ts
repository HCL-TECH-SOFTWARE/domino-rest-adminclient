/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import SourceContents from '../keep-source-header';

export const KeepSource = createComponent({
  tagName: 'keep-source',
  elementClass: SourceContents,
  react: React
});
