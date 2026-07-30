/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import AgentsTable, { type KeepAgentsTableToggleDetail } from '../keep-agents-table';

/**
 * `TabAgents` is still React, so the two callbacks it used to pass down come back as
 * events. The record travels on `event.detail.agent`, which is what both activation
 * thunks take.
 */
export const KeepAgentsTable = createComponent({
  tagName: 'keep-agents-table',
  elementClass: AgentsTable,
  react: React,
  events: {
    onAgentActivate: 'agent-activate' as EventName<CustomEvent<KeepAgentsTableToggleDetail>>,
    onAgentDeactivate: 'agent-deactivate' as EventName<CustomEvent<KeepAgentsTableToggleDetail>>
  }
});
