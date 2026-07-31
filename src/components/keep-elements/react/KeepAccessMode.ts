/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import AccessMode from '../keep-access-mode';
import { useRouter } from '../../../router/react';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads
 * `/schema/:nsfPath/:dbName/:formName/access` through this module. A route root has to be a
 * React component because the outlet wraps every `load()` in `React.lazy`, so the route
 * cannot point at the element module even though nothing about the screen is React any more.
 * `KeepSchemasList` and `KeepConsentsContainer` are loaded the same way in the same file.
 *
 * ## Why this one is not just the `createComponent` call
 *
 * The screen reads three names out of the URL and navigates away once a new form has been
 * created, and the router is created in `App.tsx` and published through React context with no
 * module-level instance to reach for. `RouterOutlet` renders the lazy element with no props
 * at all, so the one `useRouter()` call the screen needs lives here, in the last React frame
 * above it. It goes away with the Lit router controller (#926).
 *
 * No events: every event the screen raises is handled inside the element.
 */
const AccessModeElement = createComponent({
  tagName: 'keep-access-mode',
  elementClass: AccessMode,
  react: React,
});

export const KeepAccessMode: React.FC = () =>
  React.createElement(AccessModeElement, { router: useRouter() });
