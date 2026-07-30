/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import AppFilter, { type KeepAppFilterChangeDetail } from '../keep-app-filter';

export const KeepAppFilter = createComponent({
  tagName: 'keep-app-filter',
  elementClass: AppFilter,
  react: React,
  events: {
    onFilterChange: 'filter-change' as EventName<CustomEvent<KeepAppFilterChangeDetail>>
  }
});
