/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Notification from '../keep-notification';

/**
 * No props and no events. The element reads `state.alert` through `StoreController` and
 * dispatches `closeSnackbar` itself — the shell never selected that slice, so nothing crosses
 * this boundary and `@lit/react`'s prop re-application (it has no dirty check) has nothing to
 * re-apply.
 */
export const KeepNotification = createComponent({
  tagName: 'keep-notification',
  elementClass: Notification,
  react: React,
});
