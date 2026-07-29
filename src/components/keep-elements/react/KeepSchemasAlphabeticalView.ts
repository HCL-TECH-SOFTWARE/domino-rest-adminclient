/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SchemasAlphabeticalView from '../keep-schemas-alphabetical-view';
import type { KeepSchemaOpenDetail } from '../keep-schemas-cards-view';

export const KeepSchemasAlphabeticalView = createComponent({
  tagName: 'keep-schemas-alphabetical-view',
  elementClass: SchemasAlphabeticalView,
  react: React,
  events: {
    onSchemaOpen: 'schema-open' as EventName<CustomEvent<KeepSchemaOpenDetail>>
  }
});
