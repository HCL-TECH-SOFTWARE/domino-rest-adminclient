/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ProfileMenuDialog from '../keep-profile-menu-dialog';
import type { KeepOptionListLogoutDetail } from '../keep-option-list';

/**
 * No properties, one event.
 *
 * `logout` is not this element's event: `keep-option-list` emits it two shadow roots down
 * and `KeepElement.emit` composes it, so it surfaces here. The handler's job is the
 * redirect, which no element can reach — the router is published through React context and
 * there is no Lit controller for it yet (#926).
 *
 * A wrapper is needed even with no props to bind, because the shell is still React and this
 * is where the event has to be caught. Once `keep-mobile-header`'s consumer is a Lit
 * template the element is written directly, with `@logout=${…}`, and this file goes.
 */
export const KeepProfileMenuDialog = createComponent({
  tagName: 'keep-profile-menu-dialog',
  elementClass: ProfileMenuDialog,
  react: React,
  events: {
    onLogout: 'logout' as EventName<CustomEvent<KeepOptionListLogoutDetail>>,
  },
});
