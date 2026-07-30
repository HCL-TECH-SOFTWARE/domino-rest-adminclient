/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import ModeFields, {
  type KeepFieldIndexChangeDetail,
  type KeepFieldsRemoveDetail
} from '../keep-mode-fields';
import type {
  KeepFieldUpdateDetail,
  KeepRequiredChangeDetail
} from '../keep-field-container';
import type {
  KeepScriptsChangeDetail,
  KeepValidationRulesChangeDetail
} from '../keep-script-editor';

/**
 * Rendered by `access/TabsAccess.tsx`, which stays React and keeps owning the mode: the
 * field lists, the `required` array, the scripts, the validation rules and the selected
 * index all go down as properties and come back as events.
 *
 * The last five events are emitted by `keep-field-container` and `keep-script-editor`,
 * nested inside the element. Every `emit()` is composed and bubbling, so they surface on
 * the host and this map can bind them directly — which is why those two elements no longer
 * need wrappers of their own.
 */
export const KeepModeFields = createComponent({
  tagName: 'keep-mode-fields',
  elementClass: ModeFields,
  react: React,
  events: {
    onFieldsRemove: 'fields-remove' as EventName<CustomEvent<KeepFieldsRemoveDetail>>,
    onFieldIndexChange: 'field-index-change' as EventName<CustomEvent<KeepFieldIndexChangeDetail>>,
    onFieldUpdate: 'field-update' as EventName<CustomEvent<KeepFieldUpdateDetail>>,
    onRequiredChange: 'required-change' as EventName<CustomEvent<KeepRequiredChangeDetail>>,
    onScriptsChange: 'scripts-change' as EventName<CustomEvent<KeepScriptsChangeDetail>>,
    onValidationRulesChange: 'validation-rules-change' as EventName<
      CustomEvent<KeepValidationRulesChangeDetail>
    >,
    onTestFormulas: 'test-formulas' as EventName<CustomEvent<undefined>>
  }
});
