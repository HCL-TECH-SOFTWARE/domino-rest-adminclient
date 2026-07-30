/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ConfirmDeleteDialog, { type KeepConfirmDeleteDetail } from '../keep-confirm-delete-dialog';

/**
 * Two properties and one event. The `open` flag the React component derived from the store
 * is not a property: the element reads it itself, so no parent hands it back on every
 * render. Cancelling is not an event either — the element closes itself.
 */
export const KeepConfirmDeleteDialog = createComponent({
  tagName: 'keep-confirm-delete-dialog',
  elementClass: ConfirmDeleteDialog,
  react: React,
  events: {
    onConfirm: 'confirm-delete' as EventName<CustomEvent<KeepConfirmDeleteDetail>>
  }
});
