/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import SideNav from '../keep-side-nav';

/**
 * Two properties and no events.
 *
 * `expanded` is the shell's own rail state, which it owns and the element only reads.
 * `router` is the app's single `Router` instance, handed down because it is created in
 * `App.tsx` and published through React context, so an element cannot reach it.
 * `keep-side-nav`'s class note explains why the alternative — emitting a navigation event and
 * letting the shell navigate — does not work for a list of real anchors.
 *
 * Both are stable references, so `@lit/react` re-applying them on every shell render is a
 * no-op: Lit's default change check is identity.
 */
export const KeepSideNav = createComponent({
  tagName: 'keep-side-nav',
  elementClass: SideNav,
  react: React,
});
