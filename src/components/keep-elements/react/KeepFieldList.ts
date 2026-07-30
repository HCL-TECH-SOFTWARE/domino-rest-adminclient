/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import FieldList, { type KeepFieldsAddDetail } from '../keep-field-list';

/**
 * Rendered by `access/AccessMode.tsx`, which still owns `moveTo`. The element reads the
 * store for its own list but never writes it; fold `fields-add` back through the callback
 * the screen already had.
 */
export const KeepFieldList = createComponent({
  tagName: 'keep-field-list',
  elementClass: FieldList,
  react: React,
  events: {
    onFieldsAdd: 'fields-add' as EventName<CustomEvent<KeepFieldsAddDetail>>,
  },
});
