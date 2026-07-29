/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import InputDate from '../keep-input-date';

export const KeepInputDate = createComponent({
  tagName: 'keep-input-date',
  elementClass: InputDate,
  react: React,
  events: { onDateChange: 'date-change' }
});
