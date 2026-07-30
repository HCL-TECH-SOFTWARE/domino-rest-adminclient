/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import ScopesList from '../keep-scopes-list';
import { useRouter } from '../../../router/react';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads `/scope` through this module.
 * A route root has to be a React component because the outlet wraps every `load()` in
 * `React.lazy`, so the route cannot point at the element module even though nothing about the
 * screen is React any more. `KeepSchemasList` — this screen's twin — is loaded the same way in
 * the same file.
 *
 * ## Why this one is not just the `createComponent` call
 *
 * The element navigates: it records the chosen view in the query string, and the router is
 * created in `App.tsx` and published through React context with no module-level instance to
 * reach for. `AppShell` solves that for `keep-side-nav` by reading the context and passing
 * `router` down as a property; this route cannot, because `RouterOutlet` renders the lazy
 * element with no props at all.
 *
 * So the one `useRouter()` call the screen needs lives here, in the last React frame above
 * it. It goes away with the Lit router controller (#926), which is what lets the element be
 * mounted directly and this module deleted along with the rest of `router/react.tsx`.
 *
 * No events: every event the screen raises is handled inside the element.
 */
const ScopesListElement = createComponent({
  tagName: 'keep-scopes-list',
  elementClass: ScopesList,
  react: React,
});

export const KeepScopesList: React.FC = () =>
  React.createElement(ScopesListElement, { router: useRouter() });
