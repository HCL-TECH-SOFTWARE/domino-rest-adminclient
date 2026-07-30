/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ModeCompare, { type KeepModeCompareCloseDetail } from '../keep-mode-compare';

/**
 * Rendered by `access/AccessMode.tsx`, which is still React and owns both the open flag and
 * the mode list.
 */
export const KeepModeCompare = createComponent({
  tagName: 'keep-mode-compare',
  elementClass: ModeCompare,
  react: React,
  events: {
    // `dialog-close`, not `close`: the element renders a native <dialog>, whose own `close`
    // event would otherwise be indistinguishable from this one.
    onClose: 'dialog-close' as EventName<CustomEvent<KeepModeCompareCloseDetail>>,
  },
});
