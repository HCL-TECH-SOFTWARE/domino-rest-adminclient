/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The barrel for the Database page's actions and thunks.
 *
 * This file was 2,929 lines and roughly 60 exports across six unrelated
 * concerns. #711 split it into the modules below; it is kept as the barrel so
 * that no consumer import had to change.
 *
 * Prefer importing from the concern module directly in new code. Import from
 * here only where a file genuinely spans concerns.
 *
 * To read the history of a thunk that moved, search by content rather than by
 * path — `git log --follow` will not cross this split, because the split was
 * not a rename and this file still exists:
 *
 *   git log -S'export const changeScope' -- src/store/databases/
 *
 * `shared` holds the four symbols every concern needs — the logger, the error
 * accessor and the two DB-error actions. Keeping them there is what makes the
 * module graph a tree: no concern imports another except along the edges
 * below, so a new module cannot introduce a cycle.
 *
 *   shared    ← everything
 *   schemas   ← scopes
 *   agents    ← views
 *   forms     ← fields
 *   databases ← forms
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 */

export * from './shared';
export * from './databases';
export * from './schemas';
export * from './scopes';
export * from './forms';
export * from './fields';
export * from './folders';
export * from './views';
export * from './agents';
export * from './formulas';
