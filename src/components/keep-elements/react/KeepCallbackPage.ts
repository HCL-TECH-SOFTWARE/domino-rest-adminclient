/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import CallbackPage from '../keep-callback-page';

/**
 * The OIDC redirect landing, for the one React consumer left: the route table in `App.tsx`,
 * which also supplies the `AppShell` the component this replaces wrapped itself in.
 *
 * `onAuthenticated` is `authenticated`: the exchanged token is the one now in storage, so the
 * host may leave for the app. The element cannot navigate itself (#926).
 *
 * Deliberately **not** re-exported from `KeepElements.tsx` — `App.tsx` is on the eager path
 * and deep-imports it, which is the convention that barrel's own note describes (#813).
 */
export const KeepCallbackPage = createComponent({
  tagName: 'keep-callback-page',
  elementClass: CallbackPage,
  react: React,
  events: {
    onAuthenticated: 'authenticated' as EventName<CustomEvent<void>>,
  },
});
