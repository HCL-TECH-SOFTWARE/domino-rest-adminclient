/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import SideNav from '../keep-side-nav';

/**
 * One property and no events.
 *
 * `expanded` is the shell's own rail state, which it owns and the element only reads. It is a
 * boolean, so `@lit/react` re-applying it on every shell render is a no-op — Lit's default
 * change check is identity.
 *
 * `router` used to come through here as well, because the one instance was created in
 * `App.tsx` and published through React context with nothing an element could reach. #926
 * made it a module singleton and the element carries a `RouterController` now, so the
 * property is gone from both ends; see the element's class note for why a navigation event
 * was never an option for a list of real anchors.
 */
export const KeepSideNav = createComponent({
  tagName: 'keep-side-nav',
  elementClass: SideNav,
  react: React,
});
