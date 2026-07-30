/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SingleField, { type KeepFieldAddDetail } from '../keep-single-field';

/**
 * Rendered by `access/Fields.tsx`, which still owns `moveTo`. The element never writes the
 * store; fold `field-add` back through the callback the list already had.
 */
export const KeepSingleField = createComponent({
  tagName: 'keep-single-field',
  elementClass: SingleField,
  react: React,
  events: {
    onFieldAdd: 'field-add' as EventName<CustomEvent<KeepFieldAddDetail>>,
  },
});
