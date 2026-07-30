/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import Consents, { type KeepConsentsCloseDetail } from '../keep-consents';

/**
 * One consumer: `applications/kanban/Kanban.tsx`, which frames this in a full-screen dialog
 * and needs to hear when its close control is pressed. The route form of the same screen is
 * `keep-consents-container`, a Lit parent, and renders the element directly.
 *
 * `dialog` is the only property that crosses, and it is a constant at that call site — so
 * `@lit/react` re-applying every prop on every render (it has no dirty check) cannot disturb
 * anything the user has typed into the table's search boxes.
 */
export const KeepConsents = createComponent({
  tagName: 'keep-consents',
  elementClass: Consents,
  react: React,
  events: {
    onClose: 'consents-close' as EventName<CustomEvent<KeepConsentsCloseDetail>>,
  },
});
