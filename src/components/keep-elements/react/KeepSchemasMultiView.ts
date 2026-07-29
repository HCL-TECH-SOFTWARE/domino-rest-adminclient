/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SchemasMultiView from '../keep-schemas-multi-view';
import type { KeepSchemaOpenDetail } from '../keep-schemas-cards-view';

export const KeepSchemasMultiView = createComponent({
  tagName: 'keep-schemas-multi-view',
  elementClass: SchemasMultiView,
  react: React,
  events: {
    onSchemaOpen: 'schema-open' as EventName<CustomEvent<KeepSchemaOpenDetail>>
  }
});
