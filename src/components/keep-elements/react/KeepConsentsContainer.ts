/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import ConsentsContainer from '../keep-consents-container';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads `/apps/consents` through this
 * module. A route root has to be a React component because the outlet wraps every `load()`
 * in `React.lazy`, so the route cannot point at the element module even though nothing about
 * the screen is React any more. `KeepQuickConfigDrawer` is loaded the same way in the same
 * file.
 *
 * No props and no events: the element dispatches its own fetches on connect and everything
 * below it reads the store directly, so nothing crosses this boundary.
 */
export const KeepConsentsContainer = createComponent({
  tagName: 'keep-consents-container',
  elementClass: ConsentsContainer,
  react: React,
});
