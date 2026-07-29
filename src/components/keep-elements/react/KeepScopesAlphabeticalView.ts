/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScopesAlphabeticalView from '../keep-scopes-alphabetical-view';
import type { KeepScopeOpenDetail } from '../keep-scopes-default-view';

export const KeepScopesAlphabeticalView = createComponent({
  tagName: 'keep-scopes-alphabetical-view',
  elementClass: ScopesAlphabeticalView,
  react: React,
  events: {
    onScopeOpen: 'scope-open' as EventName<CustomEvent<KeepScopeOpenDetail>>
  }
});
