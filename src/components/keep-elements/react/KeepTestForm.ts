/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import TestForm from '../keep-test-form';

/**
 * No events: the element owns its form and dispatches `testFormula` itself, and it closes the
 * drawer through the store like the React leaf did.
 *
 * Every property crossing here is read-only page data — the route the drawer opened over, and
 * the five formula texts gathered from the mode being edited. None of them is a control value,
 * which matters because `@lit/react` re-applies every declared property on every parent render
 * with no dirty check: a `value` sent this way would overwrite what the user had typed between
 * renders. The two text fields in this form are owned by the element's `FormController` and are
 * deliberately not reachable from here.
 */
export const KeepTestForm = createComponent({
  tagName: 'keep-test-form',
  elementClass: TestForm,
  react: React,
});
