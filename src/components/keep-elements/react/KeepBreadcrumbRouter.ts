/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import BreadcrumbRouter from '../keep-breadcrumb-router';

/**
 * One consumer: `Views.tsx` renders the breadcrumb strip on every route.
 *
 * A bare `createComponent`, and deliberately nothing more. This module briefly held a
 * `useRouter()` call, because the element navigates and the router was created in `App.tsx`
 * and published through React context with no module-level instance to reach for. #926 landed
 * in the same wave and gave the element a `RouterController` over a singleton, so the call,
 * the `router` property and the `React.FC` that existed only to bridge them are all gone.
 *
 * What remains is the one thing a wrapper is still for: `Views.tsx` is React, and React needs
 * a component to render. It goes with `RouterOutlet` in #719 P4, when a Lit outlet can mount
 * the element directly.
 *
 * No props and no events — the element reads the URL and handles its own navigation, guard
 * included.
 */
export const KeepBreadcrumbRouter = createComponent({
  tagName: 'keep-breadcrumb-router',
  elementClass: BreadcrumbRouter,
  react: React,
});
