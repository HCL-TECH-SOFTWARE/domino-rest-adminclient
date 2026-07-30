/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ConsentsTable, {
  type KeepConsentsTableFiltersOnDetail,
  type KeepConsentsTableResetDetail,
} from '../keep-consents-table';

export const KeepConsentsTable = createComponent({
  tagName: 'keep-consents-table',
  elementClass: ConsentsTable,
  react: React,
  events: {
    onFiltersOnChange: 'filters-on-change' as EventName<
      CustomEvent<KeepConsentsTableFiltersOnDetail>
    >,
    onResetChange: 'reset-change' as EventName<CustomEvent<KeepConsentsTableResetDetail>>,
  },
});
