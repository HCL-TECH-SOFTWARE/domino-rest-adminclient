/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import appIcons from '../../src/styles/app-icons';
import { APP_ICON_NAMES, DEFAULT_APP_ICON_NAME } from '../../src/styles/app-icon-names';

/**
 * #772 split the icon names out of `app-icons.ts` so the 219 KB of base64 could move to a
 * lazily loaded chunk while `checkIcon()` and the picker ordering stayed synchronous.
 *
 * That split duplicates the names, and the duplication is invisible in review: adding an
 * icon to `app-icons.ts` and forgetting this list produces an icon nobody can pick, and
 * removing one produces a picker entry that renders a permanent skeleton. Worse, the
 * pickers select *by index* (`handleMenuItemClick(_, index)` → `APP_ICON_NAMES[index]`),
 * so a name inserted in the middle of one file but appended to the other silently shifts
 * every choice after it. Hence order, not just membership.
 *
 * `iconName` is persisted server-side, so a rename here is a data migration, not a
 * refactor — the count is pinned to make that show up as a deliberate edit.
 */
describe('APP_ICON_NAMES', () => {
  it('is exactly the keys of app-icons, in the same order', () => {
    expect(APP_ICON_NAMES).toEqual(Object.keys(appIcons));
  });

  it('carries all 86 icons', () => {
    expect(APP_ICON_NAMES).toHaveLength(86);
  });

  it('has no duplicates', () => {
    expect(new Set(APP_ICON_NAMES).size).toBe(APP_ICON_NAMES.length);
  });

  it('contains the default every caller falls back to', () => {
    expect(APP_ICON_NAMES).toContain(DEFAULT_APP_ICON_NAME);
  });
});
