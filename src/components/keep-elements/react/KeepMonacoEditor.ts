/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent } from '@lit/react';
import MonacoEditor from '../keep-monaco-editor';

export const KeepMonacoEditor = createComponent({
  tagName: 'keep-monaco-editor',
  elementClass: MonacoEditor,
  react: React,
  events: {
    onChange: 'change'
  }
});
