/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import FormsTab, {
  type KeepFormsTabNavigateDetail,
  type KeepFormsTabSchemaChangeDetail,
} from '../keep-forms-tab';

/**
 * Exists only because `FormsContainer` is still a React component. Delete this file and its
 * barrel line when that conversion lands — the Lit parent will render `<keep-forms-tab>`
 * directly and listen for `@form-navigate` / `@schema-change`.
 *
 * `form-navigate` carries a finished in-app path: the element has no router to reach for, so
 * the consumer's handler is `navigate(event.detail.path)` and nothing more. `onSchemaChange`
 * is the schema sink the save thunks call back on — the same contract `KeepViewsTab` and
 * `KeepEditView` use beside it.
 */
export const KeepFormsTab = createComponent({
  tagName: 'keep-forms-tab',
  elementClass: FormsTab,
  react: React,
  events: {
    onNavigate: 'form-navigate' as EventName<CustomEvent<KeepFormsTabNavigateDetail>>,
    onSchemaChange: 'schema-change' as EventName<CustomEvent<KeepFormsTabSchemaChangeDetail>>,
  },
});
