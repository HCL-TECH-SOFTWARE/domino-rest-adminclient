/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SchemaContentsTree, { type KeepSchemaSelectDetail } from '../keep-schema-contents-tree';

export const KeepSchemaContentsTree = createComponent({
  tagName: 'keep-schema-contents-tree',
  elementClass: SchemaContentsTree,
  react: React,
  events: {
    onSchemaSelect: 'schema-select' as EventName<CustomEvent<KeepSchemaSelectDetail>>
  }
});
