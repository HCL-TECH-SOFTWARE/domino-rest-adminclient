/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import FormsTable, { type KeepFormOpenDetail } from '../keep-forms-table';

/**
 * Exists only because `TabForms` is still a React component. Delete this file and its
 * barrel line when that conversion lands — the Lit parent will render `<keep-forms-table>`
 * directly and listen for `@form-open`.
 *
 * `form-open` is the navigation the table used to perform itself. The element has no router
 * to reach for, so it names the form and the consumer builds the URL.
 */
export const KeepFormsTable = createComponent({
  tagName: 'keep-forms-table',
  elementClass: FormsTable,
  react: React,
  events: {
    onFormOpen: 'form-open' as EventName<CustomEvent<KeepFormOpenDetail>>
  }
});
