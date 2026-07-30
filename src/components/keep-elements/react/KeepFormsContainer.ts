/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import FormsContainer from '../keep-forms-container';
import { useParams, useRouter } from '../../../router/react';

/**
 * One consumer, and it is the router: `Views.tsx` lazy-loads `/schema/:nsfPath/:dbName`
 * through this module. A route root has to be a React component because the outlet wraps
 * every `load()` in `React.lazy`, so the route cannot point at the element module even though
 * nothing about the screen is React any more. `KeepSchemasList` and `KeepConsentsContainer`
 * are loaded the same way in the same file.
 *
 * ## Why this one is not just the `createComponent` call
 *
 * The element needs three things this frame is the only place that can supply:
 *
 *  - the **router**, which is created in `App.tsx` and published through context with no
 *    module-level instance. One navigation crosses the boundary — the Forms tab reports a
 *    finished path rather than navigating itself.
 *  - the two **route params**, which the outlet publishes through a second context that only
 *    it writes. `nsfPath` is handed down *raw*, undecoded: `keep-forms-tab` encodes it itself
 *    when it builds the paths it emits, and double-encoding it here would break every link
 *    off this screen for a path containing a space.
 *
 * All three go away with the Lit router controller (#926), which is what lets the element be
 * mounted directly and this module deleted along with the rest of `router/react.tsx`.
 *
 * No events: every event the screen raises is handled inside the element.
 */
const FormsContainerElement = createComponent({
  tagName: 'keep-forms-container',
  elementClass: FormsContainer,
  react: React,
});

export const KeepFormsContainer: React.FC = () => {
  const { nsfPath, dbName } = useParams<{ nsfPath: string; dbName: string }>();
  return React.createElement(FormsContainerElement, { router: useRouter(), nsfPath, dbName });
};
