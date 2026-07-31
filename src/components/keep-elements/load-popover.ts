/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Registers `wa-popover` off the eager path.
 *
 * ## Why this is not a plain side-effect import
 *
 * The two profile elements are rendered by `AppShell`, which is eager, so a static
 * `import '…/components/popover/popover.js'` puts Web Awesome's popover **and** the
 * positioning engine it pulls with it into the entry closure. Measured against this
 * app's own budget script: **36.9 kB raw / 12.1 kB gzip**, which is the difference
 * between 911.3 kB (over budget) and 874.4 kB (18.1 kB under).
 *
 * That is a lot of first-paint weight for a menu that only exists while the navigation
 * rail is collapsed and only opens on a click. Deferring it costs nothing a user can
 * perceive: the popover starts closed, so the only visible state before the module
 * resolves is a closed popover, and `:not(:defined)` hides it until then.
 *
 * ## The `:not(:defined)` rule is required, not defensive
 *
 * Before the module resolves, `<wa-popover>` is an unknown element — an inline box that
 * renders its children as ordinary content. Its children here are the user's name and
 * the sign-out list, so without the rule they would flash inline underneath the avatar
 * on every load. Each element that calls this must carry
 * `wa-popover:not(:defined) { display: none }` in its `static styles`.
 *
 * ## One import, shared
 *
 * The promise is memoised at module scope, so the two elements — which are on screen at
 * the same time, one for the rail and one for the mobile header — share a single fetch,
 * and re-connecting an element does not start another.
 *
 * Tests import the popover module directly instead of calling this, so registration is
 * synchronous there and no test has to await a dynamic import to assert on the popover.
 */
let inFlight: Promise<unknown> | undefined;

export function loadPopover(): Promise<unknown> {
  inFlight ??= import('@awesome.me/webawesome/dist/components/popover/popover.js');
  return inFlight;
}
