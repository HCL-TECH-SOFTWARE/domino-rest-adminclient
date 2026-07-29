/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Button from '../keep-button';

export const KeepButton = createComponent({
  tagName: 'keep-button',
  elementClass: Button,
  react: React
});
