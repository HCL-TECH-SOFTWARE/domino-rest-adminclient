/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Retained for one consumer: `applications/AppsTable.tsx`.
 *
 * #806 converted this component to the `keep-zero-results` element and moved its other seven
 * consumers over. `AppsTable.tsx` is one of the six MUI `<Table>` screens that **#771 owns**,
 * and #806 must not touch those files, so the module path stays alive here instead.
 *
 * This is a re-export, not a second implementation - the props are identical, so there is
 * still exactly one empty-state component. Delete this file when #771 converts `AppsTable`
 * and drops the import.
 */
export { KeepZeroResults as default } from '../keep-elements/KeepElements';
