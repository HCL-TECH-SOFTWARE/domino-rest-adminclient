/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import NavigationGuard from '../keep-navigation-guard';

/**
 * One consumer: `Views.tsx` mounts the unsaved-changes guard once, as a sibling of the routes.
 *
 * `basename` is the only prop, and there are no events: the guard reads its state from the
 * store, performs navigation through the router singleton, and renders its own dialog. It
 * goes with `RouterOutlet` in #719 P4, when a Lit shell can mount the element directly.
 */
export const KeepNavigationGuard = createComponent({
  tagName: 'keep-navigation-guard',
  elementClass: NavigationGuard,
  react: React,
});
