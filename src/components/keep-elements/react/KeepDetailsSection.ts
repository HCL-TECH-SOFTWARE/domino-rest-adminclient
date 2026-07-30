/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import DetailsSection, {
  type KeepDetailsSectionSchemaChangeDetail,
} from '../keep-details-section';

/**
 * Rendered by `forms/FormsContainer.tsx`, which still owns the schema and already selects
 * the scope list for its own rendering.
 *
 * The `setSchemaData` callback the component this replaces took is `onSchemaChange`, whose
 * detail carries what the parent's copy of the schema should become — the record the update
 * endpoint echoed back, or the current one with `prohibitRefresh` flipped. Same name and
 * same shape as `KeepEditView`'s, which that consumer already wires.
 *
 * The `nsfPathProp` that consumer also passed is gone: the component destructured three of
 * its four props and never read that one.
 */
export const KeepDetailsSection = createComponent({
  tagName: 'keep-details-section',
  elementClass: DetailsSection,
  react: React,
  events: {
    onSchemaChange: 'schema-change' as EventName<CustomEvent<KeepDetailsSectionSchemaChangeDetail>>
  }
});
