/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import FieldContainer, {
  type KeepFieldUpdateDetail,
  type KeepRequiredChangeDetail
} from '../keep-field-container';

/**
 * Rendered by `access/FieldDndContainer.tsx`, which still owns the mode's field list and
 * its `required` array. Pass both down and fold the two events back into that state — the
 * element edits a copy and writes nothing itself.
 */
export const KeepFieldContainer = createComponent({
  tagName: 'keep-field-container',
  elementClass: FieldContainer,
  react: React,
  events: {
    onFieldUpdate: 'field-update' as EventName<CustomEvent<KeepFieldUpdateDetail>>,
    onRequiredChange: 'required-change' as EventName<CustomEvent<KeepRequiredChangeDetail>>
  }
});
