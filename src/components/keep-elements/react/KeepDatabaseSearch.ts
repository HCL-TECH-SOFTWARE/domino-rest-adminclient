/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import DatabaseSearch, {
  type KeepDatabaseSearchChangeDetail,
  type KeepDatabaseSearchTypeChangeDetail
} from '../keep-database-search';

export const KeepDatabaseSearch = createComponent({
  tagName: 'keep-database-search',
  elementClass: DatabaseSearch,
  react: React,
  events: {
    onSearchChange: 'search-change' as EventName<CustomEvent<KeepDatabaseSearchChangeDetail>>,
    onSearchTypeChange:
      'search-type-change' as EventName<CustomEvent<KeepDatabaseSearchTypeChangeDetail>>
  }
});
