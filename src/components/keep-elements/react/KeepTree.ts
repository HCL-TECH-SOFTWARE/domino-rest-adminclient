/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import Tree, { type KeepTreeSelectDetail } from '../keep-tree';

export const KeepTree = createComponent({
  tagName: 'keep-tree',
  elementClass: Tree,
  react: React,
  events: {
    onItemSelect: 'item-select' as EventName<CustomEvent<KeepTreeSelectDetail>>
  }
});
