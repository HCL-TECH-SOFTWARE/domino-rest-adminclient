/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ColumnDetails, {
  type KeepColumnEditDetail,
  type KeepColumnRemoveDetail,
} from '../keep-column-details';

/**
 * Rendered by `forms/EditView.tsx`, which still owns the chosen-column list. Pass the list
 * as `columns` and fold the two events back into that state — the element writes nothing.
 */
export const KeepColumnDetails = createComponent({
  tagName: 'keep-column-details',
  elementClass: ColumnDetails,
  react: React,
  events: {
    onColumnRemove: 'column-remove' as EventName<CustomEvent<KeepColumnRemoveDetail>>,
    onColumnEdit: 'column-edit' as EventName<CustomEvent<KeepColumnEditDetail>>
  }
});
