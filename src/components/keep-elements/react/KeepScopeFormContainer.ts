/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import ScopeFormContainer from '../keep-scope-form-container';

/**
 * Two properties and no events: the drawer flag, the permissions and every dispatch live
 * inside the element, so only the list view's own selection crosses this boundary.
 *
 * `permissions` was a third prop and is gone. Every call site read it from the store, which is
 * the `@lit/react` hazard in its purest form — the bridge re-applies every prop on every parent
 * render with no dirty check, so the element would be handed its own state back by a parent
 * that read it from the store the element can read itself.
 */
export const KeepScopeFormContainer = createComponent({
  tagName: 'keep-scope-form-container',
  elementClass: ScopeFormContainer,
  react: React,
});
