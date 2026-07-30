/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import QuickConfigDrawer from '../keep-quick-config-drawer';

/**
 * No props and no events: the element reads the drawer flag and the databases slice through
 * `StoreController` and dispatches its own actions. Nothing crosses this boundary, which is
 * why `@lit/react` re-applying every prop on every parent render (it has no dirty check)
 * cannot reach the form's values.
 */
export const KeepQuickConfigDrawer = createComponent({
  tagName: 'keep-quick-config-drawer',
  elementClass: QuickConfigDrawer,
  react: React,
});
