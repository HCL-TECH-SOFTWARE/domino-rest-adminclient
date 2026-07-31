/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import AccessMode from '../keep-access-mode';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads
 * `/schema/:nsfPath/:dbName/:formName/access` through this module. A route root has to be a
 * React component because the outlet wraps every `load()` in `React.lazy`, so the route
 * cannot point at the element module even though nothing about the screen is React any more.
 * `KeepSchemasList` and `KeepConsentsContainer` are loaded the same way in the same file.
 *
 * That is now the *whole* reason this file exists. It used to call `useRouter()` and pass the
 * instance down as a property, because the router was created in `App.tsx` and published
 * through React context with no module-level instance to reach for — and `RouterOutlet`
 * renders the lazy element with no props at all, so this was the last frame that could supply
 * one. #926 made the router a module singleton with a `RouterController` over it, and the
 * element reads its three route names out of it itself.
 *
 * What is left goes when `RouterOutlet` does (#719 P4): a Lit outlet can mount the element
 * directly, and then the route names `keep-access-mode` and this file is deleted.
 *
 * No events: every event the screen raises is handled inside the element.
 */
export const KeepAccessMode = createComponent({
  tagName: 'keep-access-mode',
  elementClass: AccessMode,
  react: React,
});
