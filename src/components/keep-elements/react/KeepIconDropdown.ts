/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import IconDropdown, { type KeepIconSelectDetail } from '../keep-icon-dropdown';

export const KeepIconDropdown = createComponent({
  tagName: 'keep-icon-dropdown',
  elementClass: IconDropdown,
  react: React,
  events: {
    onIconSelect: 'icon-select' as EventName<CustomEvent<KeepIconSelectDetail>>
  }
});
