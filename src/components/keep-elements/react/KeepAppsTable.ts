/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import AppsTable from '../keep-apps-table';
import type { KeepAppItemDeleteDetail, KeepAppItemEditDetail } from '../keep-app-item';

/**
 * `Kanban` is still React, so the two callbacks it used to pass down come back as events.
 *
 * `app-edit` carries the seed values for the Application form, which still travel through the
 * Formik object `Kanban` holds and `FormDrawer` reads; `app-delete` carries the id the delete
 * confirmation is opened against.
 */
export const KeepAppsTable = createComponent({
  tagName: 'keep-apps-table',
  elementClass: AppsTable,
  react: React,
  events: {
    onAppEdit: 'app-edit' as EventName<CustomEvent<KeepAppItemEditDetail>>,
    onAppDelete: 'app-delete' as EventName<CustomEvent<KeepAppItemDeleteDetail>>
  }
});
