/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import EditView, {
  type KeepEditViewCloseDetail,
  type KeepEditViewSchemaChangeDetail,
} from '../keep-edit-view';

/**
 * Rendered by `forms/FormsContainer.tsx`, which still owns the schema and the open flag.
 *
 * The component this replaces took two closing callbacks — `handleClose` and `setOpen` — and
 * that consumer pointed both at the same state setter, so there is one `onClose` here. The
 * schema setter it passed into the update thunk is `onSchemaChange`, whose detail carries
 * what the update endpoint echoed back.
 */
export const KeepEditView = createComponent({
  tagName: 'keep-edit-view',
  elementClass: EditView,
  react: React,
  events: {
    onClose: 'dialog-close' as EventName<CustomEvent<KeepEditViewCloseDetail>>,
    onSchemaChange: 'schema-change' as EventName<CustomEvent<KeepEditViewSchemaChangeDetail>>
  }
});
