/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import TextFormArray from '../keep-textform-array';

export const KeepTextformArray = createComponent({
  tagName: 'keep-textform-array',
  elementClass: TextFormArray,
  react: React
});
