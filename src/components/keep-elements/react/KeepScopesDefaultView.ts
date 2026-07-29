/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScopesDefaultView, { type KeepScopeOpenDetail } from '../keep-scopes-default-view';

export const KeepScopesDefaultView = createComponent({
  tagName: 'keep-scopes-default-view',
  elementClass: ScopesDefaultView,
  react: React,
  events: {
    onScopeOpen: 'scope-open' as EventName<CustomEvent<KeepScopeOpenDetail>>
  }
});
