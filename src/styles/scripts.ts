/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { isAppIconName } from '../services/app-icons';

/**
 * Whether `icon` is one of the 86 known `iconName`s. Exists because unknown names arrive
 * from the backend, where `iconName` is persisted free-form.
 *
 * Answers from the eagerly bundled name list, not the lazily loaded payload map (#772), so
 * it is correct on the very first render — callers use it to choose between an icon and a
 * generic glyph, and a `false` that merely meant "not loaded yet" would make every card
 * render the glyph and then swap once the chunk landed.
 */
export const checkIcon = (icon: string) => isAppIconName(icon);
