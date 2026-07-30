/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import WrapperContainer from '../keep-wrapper-container';

export const KeepWrapperContainer = createComponent({
  tagName: 'keep-wrapper-container',
  elementClass: WrapperContainer,
  react: React
});
