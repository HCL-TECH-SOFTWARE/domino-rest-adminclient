/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ScriptEditor, {
  type KeepScriptsChangeDetail,
  type KeepValidationRulesChangeDetail
} from '../keep-script-editor';

/**
 * Rendered by `access/FieldDndContainer.tsx`. `TabsAccess` above it owns both the mode's
 * script settings and its validation rules, so both arrive as properties and every edit
 * comes back as an event. `onTestFormulas` replaces the `test` callback prop.
 */
export const KeepScriptEditor = createComponent({
  tagName: 'keep-script-editor',
  elementClass: ScriptEditor,
  react: React,
  events: {
    onScriptsChange: 'scripts-change' as EventName<CustomEvent<KeepScriptsChangeDetail>>,
    onValidationRulesChange: 'validation-rules-change' as EventName<
      CustomEvent<KeepValidationRulesChangeDetail>
    >,
    onTestFormulas: 'test-formulas' as EventName<CustomEvent<undefined>>
  }
});
