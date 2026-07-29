/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import TextForm from '../keep-textform';

export const KeepTextform = createComponent({
  tagName: 'keep-textform',
  elementClass: TextForm,
  react: React
});
