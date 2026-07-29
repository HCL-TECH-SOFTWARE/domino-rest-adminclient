/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import NsfCard from '../keep-nsf-card';

export const KeepNsfCard = createComponent({
  tagName: 'keep-nsf-card',
  elementClass: NsfCard,
  react: React
});
