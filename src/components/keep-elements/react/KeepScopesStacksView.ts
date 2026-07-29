/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScopesStacksView from '../keep-scopes-stacks-view';
import type { KeepScopeOpenDetail } from '../keep-scopes-default-view';

export const KeepScopesStacksView = createComponent({
  tagName: 'keep-scopes-stacks-view',
  elementClass: ScopesStacksView,
  react: React,
  events: {
    onScopeOpen: 'scope-open' as EventName<CustomEvent<KeepScopeOpenDetail>>
  }
});
