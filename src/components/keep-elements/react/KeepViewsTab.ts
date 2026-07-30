/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ViewsTab, {
  type KeepViewsTabSchemaChangeDetail,
  type KeepViewsTabViewOpenDetail
} from '../keep-views-tab';

/**
 * Rendered by `forms/FormsContainer.tsx`, which still owns `schemaData` and the panel that
 * opens beside this tab.
 *
 * Two events replace the four callback props the tab used to take. `onViewOpen` carries
 * both bits the parent needs — `detail.active` is false when the view cannot be opened, and
 * the alert has already been raised — and `onSchemaChange` is the schema sink the
 * activation thunk calls back on, the same contract `KeepEditView` uses next to it.
 */
export const KeepViewsTab = createComponent({
  tagName: 'keep-views-tab',
  elementClass: ViewsTab,
  react: React,
  events: {
    onViewOpen: 'view-open' as EventName<CustomEvent<KeepViewsTabViewOpenDetail>>,
    onSchemaChange: 'schema-change' as EventName<CustomEvent<KeepViewsTabSchemaChangeDetail>>
  }
});
