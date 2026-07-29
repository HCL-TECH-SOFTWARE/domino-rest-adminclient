/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import DefaultCard from '../keep-default-card';

export const KeepDefaultCard = createComponent({
  tagName: 'keep-default-card',
  elementClass: DefaultCard,
  react: React
});
