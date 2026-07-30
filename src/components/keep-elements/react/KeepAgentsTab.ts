/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import AgentsTab from '../keep-agents-tab';

/**
 * React spelling of `<keep-agents-tab>`, for as long as `FormsContainer` is React.
 *
 * No `events` map: the tab reports nothing upwards. Everything it changes it changes in the
 * store, which is where its parent's siblings read it from — so the two props below are the
 * whole contract. `schemaData` is the schema the activation thunk posts back, and `dbName`
 * is the route's database name, which that thunk needs to address the right slice.
 */
export const KeepAgentsTab = createComponent({
  tagName: 'keep-agents-tab',
  elementClass: AgentsTab,
  react: React,
});
