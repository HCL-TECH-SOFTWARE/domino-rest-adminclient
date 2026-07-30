/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import AppForm from '../keep-app-form';

/**
 * No events: the element owns its form, dispatches its own save and toggles the drawer flag
 * through the store, which is what the React leaf did.
 *
 * `initialValues` is a **seed**, not a control value. `@lit/react` re-applies every declared
 * property on every parent render with no dirty check, so a live value sent this way would
 * overwrite what the user had typed between renders. The element guards against that by
 * comparing the object's identity and only re-seeding when it genuinely changes — which,
 * because the still-React ancestors only replace it through `setValues` and `resetForm`,
 * happens exactly when a different application is being edited.
 */
export const KeepAppForm = createComponent({
  tagName: 'keep-app-form',
  elementClass: AppForm,
  react: React,
});
