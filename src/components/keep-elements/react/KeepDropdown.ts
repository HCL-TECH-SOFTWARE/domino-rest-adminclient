/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Dropdown from '../keep-dropdown';

export const KeepDropdown = createComponent({
  tagName: 'keep-dropdown',
  elementClass: Dropdown,
  react: React
});
