/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SearchInput, { type KeepSearchChangeDetail } from '../keep-search-input';

/**
 * React spelling of `<keep-search-input>`.
 *
 * **Never pass `value`.** The element does not declare one, and the reason is the same one
 * that makes this wrapper convenient: it re-applies every declared property on every render
 * of the parent, with no dirty check. A `value` fed from parent state would be pushed back
 * into the field on the very render the user's keystroke caused, wiping the rest of what
 * they had typed. Read the text from `onSearch`'s `event.detail.value` instead.
 */
export const KeepSearchInput = createComponent({
  tagName: 'keep-search-input',
  elementClass: SearchInput,
  react: React,
  events: {
    onSearch: 'search-change' as EventName<CustomEvent<KeepSearchChangeDetail>>,
  },
});
