/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import AppIcon from '../keep-app-icon';

/**
 * No `events` map: the element emits nothing. It is a display leaf — a name in, an image
 * or a slotted fallback out.
 *
 * Callers that need the loaded image styled reach it through `::part(icon)`; there is no
 * property that swaps the image for a component of theirs, which is what kept this
 * conversion parked (see the element's own note).
 */
export const KeepAppIcon = createComponent({
  tagName: 'keep-app-icon',
  elementClass: AppIcon,
  react: React
});
