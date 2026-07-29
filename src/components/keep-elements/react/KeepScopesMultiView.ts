/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScopesMultiView from '../keep-scopes-multi-view';
import type { KeepScopeOpenDetail } from '../keep-scopes-default-view';

/**
 * `onScopeOpen` fires for whichever of the four views is showing: the child's event composes,
 * so it crosses both shadow boundaries and retargets to this host.
 */
export const KeepScopesMultiView = createComponent({
  tagName: 'keep-scopes-multi-view',
  elementClass: ScopesMultiView,
  react: React,
  events: {
    onScopeOpen: 'scope-open' as EventName<CustomEvent<KeepScopeOpenDetail>>
  }
});
