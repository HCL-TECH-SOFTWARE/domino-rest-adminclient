/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Homepage from '../keep-homepage';

export const KeepHomepage = createComponent({
  tagName: 'keep-homepage',
  elementClass: Homepage,
  react: React
});
