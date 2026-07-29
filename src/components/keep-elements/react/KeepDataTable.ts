/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import DataTable, { type KeepDataTablePageChangeDetail, type KeepDataTableRowsPerPageChangeDetail } from '../keep-data-table';

/**
 * Pagination here is **controlled**: pass `page` and `rowsPerPage` down, and update them
 * from `onPageChange` / `onRowsPerPageChange`. The element never writes them back — see
 * the note in `keep-data-table.ts` for why that matters with this wrapper.
 */
export const KeepDataTable = createComponent({
  tagName: 'keep-data-table',
  elementClass: DataTable,
  react: React,
  events: {
    onPageChange: 'page-change' as EventName<CustomEvent<KeepDataTablePageChangeDetail>>,
    onRowsPerPageChange: 'rows-per-page-change' as EventName<
      CustomEvent<KeepDataTableRowsPerPageChangeDetail>
    >
  }
});
