/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import ErrorWrapper from '../keep-error-wrapper';

export const KeepErrorWrapper = createComponent({
  tagName: 'keep-error-wrapper',
  elementClass: ErrorWrapper,
  react: React
});
