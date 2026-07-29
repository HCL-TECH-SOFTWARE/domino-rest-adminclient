/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScopesCardsView from '../keep-scopes-cards-view';
import type { KeepScopeOpenDetail } from '../keep-scopes-default-view';

export const KeepScopesCardsView = createComponent({
  tagName: 'keep-scopes-cards-view',
  elementClass: ScopesCardsView,
  react: React,
  events: {
    onScopeOpen: 'scope-open' as EventName<CustomEvent<KeepScopeOpenDetail>>
  }
});
