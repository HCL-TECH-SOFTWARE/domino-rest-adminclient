/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import OptionList, { type KeepOptionListLogoutDetail } from '../keep-option-list';

export const KeepOptionList = createComponent({
  tagName: 'keep-option-list',
  elementClass: OptionList,
  react: React,
  events: {
    // The element clears the session itself; the handler's job is the navigation it cannot
    // reach from inside a custom element.
    onLogout: 'logout' as EventName<CustomEvent<KeepOptionListLogoutDetail>>
  }
});
