/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Views from '../keep-views';

/**
 * The last wrapper in the main region, and the only one `keep-views` needs.
 *
 * `AppShell.tsx` is still React (#719 P4's second half), so the one React frame above the
 * routes still has to render this element from JSX. Everything below it is Lit: the route
 * table names its screens by tag and imports their modules directly, which is what let the
 * other eleven wrappers go.
 *
 * **Delete this with `AppShell.tsx`.** A `<keep-views>` inside a Lit shell needs no wrapper —
 * a static import of `../keep-views` registers the element and the tag can be written plainly.
 */
export const KeepViews = createComponent({
  tagName: 'keep-views',
  elementClass: Views,
  react: React,
});
