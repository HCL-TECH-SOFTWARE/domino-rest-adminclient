/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import CardViewOptions, { type KeepViewChangeDetail } from '../keep-card-view-options';

export const KeepCardViewOptions = createComponent({
  tagName: 'keep-card-view-options',
  elementClass: CardViewOptions,
  react: React,
  events: {
    onViewChange: 'view-change' as EventName<CustomEvent<KeepViewChangeDetail>>
  }
});
