/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Checkbox from '../keep-checkbox';

export const KeepCheckbox = createComponent({
  tagName: 'keep-checkbox',
  elementClass: Checkbox,
  react: React,
  events: {
    onChange: 'change'
  }
});
