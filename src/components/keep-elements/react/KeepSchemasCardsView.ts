/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SchemasCardsView from '../keep-schemas-cards-view';
import type { KeepSchemaOpenDetail } from '../keep-schemas-cards-view';

/**
 * `onSchemaOpen` replaces the `navigate()` the React view called itself: the router is handed
 * out through React context with no module-level instance, so an element cannot reach it, and
 * the reactive controller `router/react.tsx` promises does not exist yet.
 */
export const KeepSchemasCardsView = createComponent({
  tagName: 'keep-schemas-cards-view',
  elementClass: SchemasCardsView,
  react: React,
  events: {
    onSchemaOpen: 'schema-open' as EventName<CustomEvent<KeepSchemaOpenDetail>>
  }
});
