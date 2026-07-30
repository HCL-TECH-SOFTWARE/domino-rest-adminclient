/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ProfileMenu from '../keep-profile-menu';
import type { KeepOptionListLogoutDetail } from '../keep-option-list';

/**
 * One property and one event.
 *
 * `expanded` is the shell's own rail state, which it owns and the element only reads.
 *
 * `logout` is not this element's event: `keep-option-list` emits it two shadow roots down
 * and `KeepElement.emit` composes it, so it surfaces here. The handler's job is the
 * redirect, which no element can reach — the router is published through React context and
 * there is no Lit controller for it yet (#926). This wrapper is the last thing standing
 * between that event and the router; when the shell converts, the listener moves onto the
 * Lit call site as `@logout=${…}` and this file goes.
 */
export const KeepProfileMenu = createComponent({
  tagName: 'keep-profile-menu',
  elementClass: ProfileMenu,
  react: React,
  events: {
    onLogout: 'logout' as EventName<CustomEvent<KeepOptionListLogoutDetail>>,
  },
});
