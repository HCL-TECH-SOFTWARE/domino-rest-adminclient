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

export { KeepTip } from './react/KeepTip';
export { KeepTooltip } from './react/KeepTooltip';
export { KeepFooter } from './react/KeepFooter';
export { KeepPageLoading } from './react/KeepPageLoading';
export { KeepHomepage } from './react/KeepHomepage';
export { KeepMobileHeader } from './react/KeepMobileHeader';
export { KeepPageRouters } from './react/KeepPageRouters';
export { KeepUnsavedChangesDialog } from './react/KeepUnsavedChangesDialog';
export { KeepQuickConfigDrawer } from './react/KeepQuickConfigDrawer';
export { KeepNotification } from './react/KeepNotification';
export { KeepSideNav } from './react/KeepSideNav';
export { KeepProfileMenu } from './react/KeepProfileMenu';
export { KeepProfileMenuDialog } from './react/KeepProfileMenuDialog';
export { KeepConsentsContainer } from './react/KeepConsentsContainer';
export { KeepSchemasList } from './react/KeepSchemasList';
export { KeepScopesList } from './react/KeepScopesList';
export { KeepApplications } from './react/KeepApplications';
export { KeepAccessMode } from './react/KeepAccessMode';
