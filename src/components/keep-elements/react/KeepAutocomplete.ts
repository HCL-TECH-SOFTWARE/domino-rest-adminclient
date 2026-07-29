/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import Autocomplete from '../keep-autocomplete';

export const KeepAutocomplete = createComponent({
  tagName: 'keep-autocomplete',
  elementClass: Autocomplete,
  react: React
});
