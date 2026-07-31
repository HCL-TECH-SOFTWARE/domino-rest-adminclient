/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Applications from '../keep-applications';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads `/apps` through this module. A
 * route root has to be a React component because the outlet wraps every `load()` in
 * `React.lazy`, so the route cannot point at the element module even though nothing about the
 * screen is React any more. `KeepConsentsContainer` — the sibling `/apps/consents` route — is
 * loaded the same way from the same file.
 *
 * No properties and no events: the element reads the store itself and everything below it
 * does too, so nothing crosses this boundary.
 */
export const KeepApplications = createComponent({
  tagName: 'keep-applications',
  elementClass: Applications,
  react: React,
});
