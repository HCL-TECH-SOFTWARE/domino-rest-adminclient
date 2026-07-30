/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import LoginPage from '../keep-login-page';

/**
 * The login screen, for the one React consumer left: the route table in `App.tsx`.
 *
 * **Also the default export**, which is what makes the route's `load()` work — the router's
 * lazy branch needs a module whose default export is a component, and `createComponent`
 * returns exactly that. Without it the route would need a hand-written `.tsx` shim whose
 * only job is to render this.
 *
 * `onLoginSuccess` is `login-success`: a password login went through. The element cannot
 * navigate — the router is published through React context with no module-level instance and
 * there is no Lit router controller yet (#926) — so the host does it.
 *
 * Deliberately **not** re-exported from `KeepElements.tsx`. That barrel is imported by ~50
 * route-local modules, and a line here would pull this element, `wa-input`, the alert, the
 * dropdown and the dialog into every one of their chunks (#813 step 2). `App.tsx` deep-imports
 * this file, as it already does for `KeepPageLoading`.
 */
export const KeepLoginPage = createComponent({
  tagName: 'keep-login-page',
  elementClass: LoginPage,
  react: React,
  events: {
    onLoginSuccess: 'login-success' as EventName<CustomEvent<void>>,
  },
});

export default KeepLoginPage;
