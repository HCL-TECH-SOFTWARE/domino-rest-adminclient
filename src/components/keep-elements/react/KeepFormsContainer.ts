/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import FormsContainer from '../keep-forms-container';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads `/schema/:nsfPath/:dbName`
 * through this module. A route root has to be a React component because the outlet wraps
 * every `load()` in `React.lazy`, so the route cannot point at the element module even though
 * nothing about the screen is React any more. `KeepSchemasList` and `KeepConsentsContainer`
 * are loaded the same way in the same file.
 *
 * That is now the *whole* reason this file exists. It used to supply two things no other
 * frame could: the **router**, created in `App.tsx` and published through context with no
 * module-level instance, and the two **route params**, published through a second context
 * that only the outlet writes. #926 made the router a module singleton with a
 * `RouterController` over it, and that controller matches a pattern itself — so the element
 * reads both out of the URL directly, through the same `matchPath` the outlet used.
 *
 * What is left goes when `RouterOutlet` does (#719 P4): a Lit outlet can mount the element
 * directly, and then the route names `keep-forms-container` and this file is deleted.
 *
 * No events: every event the screen raises is handled inside the element.
 */
export const KeepFormsContainer = createComponent({
  tagName: 'keep-forms-container',
  elementClass: FormsContainer,
  react: React,
});
