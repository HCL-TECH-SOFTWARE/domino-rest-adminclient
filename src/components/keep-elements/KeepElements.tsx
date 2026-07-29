/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import Autocomplete from './keep-autocomplete';
import SourceTree from './keep-source';
import SourceContents from './keep-source-header';
import TextForm from './keep-textform';
import TextFormArray from './keep-textform-array';
import DialogHeader from './keep-dialog-header';
import DialogContent from './keep-dialog-content';
import DialogActions from './keep-dialog-actions';
import Button from './keep-button';
import InputDate from './keep-input-date';
import Dropdown from './keep-dropdown';
import AppStatus from './keep-app-status';
import ApiErrorDialog from './keep-api-error-dialog';
import DefaultCard from './keep-default-card';
import Alert from './keep-alert';
import Drawer from './keep-drawer';
import Switch from './keep-switch';
import NsfCard from './keep-nsf-card';
import Tooltip from './keep-tooltip';
import Checkbox from './keep-checkbox';
import MonacoEditor from './keep-monaco-editor';
import Tree, { type KeepTreeSelectDetail } from './keep-tree';
import Footer from './keep-footer';
import PageLoading from './keep-page-loading';
import ZeroResults from './keep-zero-results';
import FormDialogHeader, {
  type KeepFormDialogHeaderCloseDetail
} from './keep-form-dialog-header';
import UnsavedChangesDialog, {
  type KeepUnsavedChangesDialogDetail
} from './keep-unsaved-changes-dialog';
import DataTable, {
  type KeepDataTablePageChangeDetail,
  type KeepDataTableRowsPerPageChangeDetail
} from './keep-data-table';

export const KeepAutocomplete = createComponent({
  tagName: 'keep-autocomplete',
  elementClass: Autocomplete,
  react: React
});

export const KeepSourceTree = createComponent({
  tagName: 'keep-source-tree',
  elementClass: SourceTree,
  react: React
});

export const KeepSource = createComponent({
  tagName: 'keep-source',
  elementClass: SourceContents,
  react: React
});

export const KeepTextform = createComponent({
  tagName: 'keep-textform',
  elementClass: TextForm,
  react: React
});

export const KeepTextformArray = createComponent({
  tagName: 'keep-textform-array',
  elementClass: TextFormArray,
  react: React
});



export const KeepDialogContent = createComponent({
  tagName: 'keep-dialog-content',
  elementClass: DialogContent,
  react: React
});

export const KeepDialogHeader = createComponent({
  tagName: 'keep-dialog-header',
  elementClass: DialogHeader,
  react: React
});

export const KeepDialogActions = createComponent({
  tagName: 'keep-dialog-actions',
  elementClass: DialogActions,
  react: React
});

export const KeepButton = createComponent({
  tagName: 'keep-button',
  elementClass: Button,
  react: React
});

export const KeepInputDate = createComponent({
  tagName: 'keep-input-date',
  elementClass: InputDate,
  react: React,
  events: { onDateChange: 'date-change' },
});

export const KeepDropdown = createComponent({
  tagName: 'keep-dropdown',
  elementClass: Dropdown,
  react: React
});

export const KeepAppStatus = createComponent({
  tagName: 'keep-app-status',
  elementClass: AppStatus,
  react: React
});

export const KeepApiErrorDialog = createComponent({
  tagName: 'keep-api-error-dialog',
  elementClass: ApiErrorDialog,
  react: React
});

export const KeepDefaultCard = createComponent({
  tagName: 'keep-default-card',
  elementClass: DefaultCard,
  react: React
});

export const KeepAlert = createComponent({
  tagName: 'keep-alert',
  elementClass: Alert,
  react: React
});

export const KeepDrawer = createComponent({
  tagName: 'keep-drawer',
  elementClass: Drawer,
  react: React
});

export const KeepSwitch = createComponent({
  tagName: 'keep-switch',
  elementClass: Switch,
  react: React
});

export const KeepNsfCard = createComponent({
  tagName: 'keep-nsf-card',
  elementClass: NsfCard,
  react: React
});

export const KeepTooltip = createComponent({
  tagName: 'keep-tooltip',
  elementClass: Tooltip,
  react: React
});

export const KeepCheckbox = createComponent({
  tagName: 'keep-checkbox',
  elementClass: Checkbox,
  react: React,
  events: {
    onChange: 'change'
  }
});

export const KeepTree = createComponent({
  tagName: 'keep-tree',
  elementClass: Tree,
  react: React,
  events: {
    onItemSelect: 'item-select' as EventName<CustomEvent<KeepTreeSelectDetail>>
  }
});

/**
 * Pagination here is **controlled**: pass `page` and `rowsPerPage` down, and update them
 * from `onPageChange` / `onRowsPerPageChange`. The element never writes them back — see
 * the note in `keep-data-table.ts` for why that matters with this wrapper.
 */
export const KeepDataTable = createComponent({
  tagName: 'keep-data-table',
  elementClass: DataTable,
  react: React,
  events: {
    onPageChange: 'page-change' as EventName<CustomEvent<KeepDataTablePageChangeDetail>>,
    onRowsPerPageChange: 'rows-per-page-change' as EventName<
      CustomEvent<KeepDataTableRowsPerPageChangeDetail>
    >
  }
});

export const KeepMonacoEditor = createComponent({
  tagName: 'keep-monaco-editor',
  elementClass: MonacoEditor,
  react: React,
  events: {
    onChange: 'change'
  }
});

export const KeepFooter = createComponent({
  tagName: 'keep-footer',
  elementClass: Footer,
  react: React
});

export const KeepPageLoading = createComponent({
  tagName: 'keep-page-loading',
  elementClass: PageLoading,
  react: React
});

export const KeepZeroResults = createComponent({
  tagName: 'keep-zero-results',
  elementClass: ZeroResults,
  react: React
});

export const KeepUnsavedChangesDialog = createComponent({
  tagName: 'keep-unsaved-changes-dialog',
  elementClass: UnsavedChangesDialog,
  react: React,
  events: {
    // Prefixed on the element side so they cannot be confused with the native <dialog>
    // `cancel`/`close` events; the React-facing names stay as they were.
    onSave: 'dialog-save' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>,
    onDiscard: 'dialog-discard' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>,
    onCancel: 'dialog-cancel' as EventName<CustomEvent<KeepUnsavedChangesDialogDetail>>
  }
});

export const KeepFormDialogHeader = createComponent({
  tagName: 'keep-form-dialog-header',
  elementClass: FormDialogHeader,
  react: React,
  events: {
    // Maps to `header-close` rather than `close` so it cannot be confused with the native
    // <dialog> event; consumers keep writing `onClose={…}` either way.
    onClose: 'header-close' as EventName<CustomEvent<KeepFormDialogHeaderCloseDetail>>
  }
});
