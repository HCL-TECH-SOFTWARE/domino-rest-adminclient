/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ActivateSwitch, {
  type KeepActivateSwitchToggleDetail
} from '../keep-activate-switch';

/**
 * `AgentsTable` and `ViewsTable` are still React, so the two callbacks they used to pass
 * down come back as events. The record travels on `event.detail.view`, which is what both
 * activation thunks take.
 */
export const KeepActivateSwitch = createComponent({
  tagName: 'keep-activate-switch',
  elementClass: ActivateSwitch,
  react: React,
  events: {
    onToggleActive: 'toggle-active' as EventName<CustomEvent<KeepActivateSwitchToggleDetail>>,
    onToggleInactive: 'toggle-inactive' as EventName<CustomEvent<KeepActivateSwitchToggleDetail>>
  }
});
