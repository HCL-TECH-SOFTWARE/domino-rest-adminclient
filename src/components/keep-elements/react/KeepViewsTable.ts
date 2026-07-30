/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ViewsTable, {
  type KeepViewOpenDetail,
  type KeepViewsTableToggleDetail
} from '../keep-views-table';

/**
 * Rendered by `forms/TabViews.tsx`, which still owns the list and the activation thunks.
 *
 * `onViewOpen` replaces the two setters the table used to be handed: `detail.active` is
 * false when the view cannot be opened, and the element has already raised the alert.
 *
 * The two toggle events are the table's own, re-emitted from the activation switch inside
 * it, so this contract does not depend on which control the last column holds. Same shape
 * as `KeepAgentsTable`.
 */
export const KeepViewsTable = createComponent({
  tagName: 'keep-views-table',
  elementClass: ViewsTable,
  react: React,
  events: {
    onViewOpen: 'view-open' as EventName<CustomEvent<KeepViewOpenDetail>>,
    onViewActivate: 'view-activate' as EventName<CustomEvent<KeepViewsTableToggleDetail>>,
    onViewDeactivate: 'view-deactivate' as EventName<CustomEvent<KeepViewsTableToggleDetail>>
  }
});
