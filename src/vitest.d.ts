/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/// <reference types="vitest/globals" />
// Makes Vitest's injected globals (describe/it/expect/vi/beforeEach/…) type-check
// project-wide, replacing the removed @types/jest. jest-dom matcher types come
// from `@testing-library/jest-dom/vitest`, imported in test/setupTests.ts.
