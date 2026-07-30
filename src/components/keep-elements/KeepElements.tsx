/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Re-export barrel over `keep-elements/react/*` (#813 step 2).
 *
 * Every wrapper used to be declared here, in one module. That made the file the single
 * eager entry point for all 34 Lit elements and everything they import: a module wanting
 * `KeepTooltip` pulled in Monaco's wrapper, the data table, the source editor and every
 * WebAwesome component they reach. Eight modules on the critical path did exactly that,
 * which is why route splitting alone only moved the eager bundle 17 %.
 *
 * The declarations now live one per file under `./react/`. This barrel stays so the ~50
 * route-local importers and the test suites keep their import path — inside a route
 * chunk the whole set is wanted anyway. **Modules on the eager path import from
 * `./react/<Name>` directly**, and `test/bundle-budget.test.ts` plus the budget gate are
 * what keep it that way.
 *
 * There are fewer wrappers than elements, and that is the healthy direction. A wrapper
 * exists only to let *React* render a `keep-*` element; an element reached only from
 * another element's Lit template needs none. So when #806 converts the last React
 * consumer of an element, the wrapper and its line here go with it —
 * `test/keep-element-wrappers.test.ts` fails if they do not.
 */

export { KeepSource } from './react/KeepSource';
export { KeepTip } from './react/KeepTip';
export { KeepButton } from './react/KeepButton';
export { KeepDropdown } from './react/KeepDropdown';
export { KeepApiErrorDialog } from './react/KeepApiErrorDialog';
export { KeepAlert } from './react/KeepAlert';
export { KeepDrawer } from './react/KeepDrawer';
export { KeepTooltip } from './react/KeepTooltip';
export { KeepMonacoEditor } from './react/KeepMonacoEditor';
export { KeepFooter } from './react/KeepFooter';
export { KeepPageLoading } from './react/KeepPageLoading';
export { KeepHomepage } from './react/KeepHomepage';
export { KeepMobileHeader } from './react/KeepMobileHeader';
export { KeepPageRouters } from './react/KeepPageRouters';
export { KeepErrorWrapper } from './react/KeepErrorWrapper';
export { KeepUnsavedChangesDialog } from './react/KeepUnsavedChangesDialog';
export { KeepFormDialogHeader } from './react/KeepFormDialogHeader';
export { KeepNetworkErrorDialog } from './react/KeepNetworkErrorDialog';
export { KeepScopesMultiView } from './react/KeepScopesMultiView';
export { KeepQuickConfigDrawer } from './react/KeepQuickConfigDrawer';
export { KeepAddModeDialog } from './react/KeepAddModeDialog';
export { KeepConfirmDeleteDialog } from './react/KeepConfirmDeleteDialog';
export { KeepWrapperContainer } from './react/KeepWrapperContainer';
export { KeepCardViewOptions } from './react/KeepCardViewOptions';
export { KeepDatabaseSearch } from './react/KeepDatabaseSearch';
export { KeepNotification } from './react/KeepNotification';
export { KeepSideNav } from './react/KeepSideNav';
export { KeepProfileMenu } from './react/KeepProfileMenu';
export { KeepProfileMenuDialog } from './react/KeepProfileMenuDialog';
export { KeepModeFields } from './react/KeepModeFields';
export { KeepEditView } from './react/KeepEditView';
export { KeepModeCompare } from './react/KeepModeCompare';
export { KeepFieldList } from './react/KeepFieldList';
export { KeepConsents } from './react/KeepConsents';
export { KeepConsentsContainer } from './react/KeepConsentsContainer';
export { KeepTestForm } from './react/KeepTestForm';
export { KeepAppForm } from './react/KeepAppForm';
export { KeepAgentsTab } from './react/KeepAgentsTab';
export { KeepViewsTab } from './react/KeepViewsTab';
export { KeepScopeFormContainer } from './react/KeepScopeFormContainer';
export { KeepSchemasList } from './react/KeepSchemasList';
export { KeepAppsTable } from './react/KeepAppsTable';
export { KeepFormsTab } from './react/KeepFormsTab';
export { KeepDetailsSection } from './react/KeepDetailsSection';
