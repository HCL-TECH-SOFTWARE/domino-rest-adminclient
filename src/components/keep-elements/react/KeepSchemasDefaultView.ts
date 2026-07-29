/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SchemasDefaultView from '../keep-schemas-default-view';
import type { KeepSchemaOpenDetail } from '../keep-schemas-cards-view';

/**
 * `onSchemaOpen` replaces the `navigate()` the React view called itself: the router is handed
 * out through React context with no module-level instance, so an element cannot reach it, and
 * the reactive controller `router/react.tsx` promises does not exist yet.
 */
export const KeepSchemasDefaultView = createComponent({
  tagName: 'keep-schemas-default-view',
  elementClass: SchemasDefaultView,
  react: React,
  events: {
    onSchemaOpen: 'schema-open' as EventName<CustomEvent<KeepSchemaOpenDetail>>
  }
});
