/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import NetworkErrorDialog from '../keep-network-error-dialog';

/**
 * No props and no events: the element reads `state.dialog` through a `StoreController` and
 * dispatches its own dismissal. Call sites render `<KeepNetworkErrorDialog />` and nothing else.
 */
export const KeepNetworkErrorDialog = createComponent({
  tagName: 'keep-network-error-dialog',
  elementClass: NetworkErrorDialog,
  react: React
});
