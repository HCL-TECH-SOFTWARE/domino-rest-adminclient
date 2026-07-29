/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import DeleteDialog from '../keep-delete-dialog';

/**
 * One property, `selected`. The `open` flag the React component took is gone: every call site
 * passed `state.dialog.deleteDialog`, so the element reads it through a `StoreController`
 * instead of being handed its own state back on every parent render.
 */
export const KeepDeleteDialog = createComponent({
  tagName: 'keep-delete-dialog',
  elementClass: DeleteDialog,
  react: React
});
