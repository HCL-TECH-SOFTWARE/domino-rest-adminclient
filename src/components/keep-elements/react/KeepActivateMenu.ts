/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ActivateMenu, { type KeepActivateFormDetail } from '../keep-activate-menu';

/**
 * Exists only because `FormsTable` is still a React component. Delete this file and its
 * barrel line when that conversion lands — the Lit parent will render `<keep-activate-menu>`
 * directly and listen for `@activate-form`.
 *
 * `toggleActivate` was a callback prop; it is the `activate-form` event now, carrying the
 * form name in `detail` rather than relying on the closure the parent happened to pass.
 */
export const KeepActivateMenu = createComponent({
  tagName: 'keep-activate-menu',
  elementClass: ActivateMenu,
  react: React,
  events: {
    onActivateForm: 'activate-form' as EventName<CustomEvent<KeepActivateFormDetail>>
  }
});
