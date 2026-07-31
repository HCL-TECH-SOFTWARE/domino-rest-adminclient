/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Appearance, applied before the app boots (#707).
 *
 * `index.html` loads this as its **first** module script, ahead of `index.ts`, so the class
 * and the colour scheme are on the document before Lit, the store or the router have been
 * evaluated. Without it a dark-mode session paints light first and then corrects itself.
 *
 * ## It has its own chunk and its own tag, which took a build change (#987)
 *
 * `index.html` deliberately does **not** declare a `<script>` tag for this module. Vite emits
 * **one entry chunk per HTML page** however many `<script type="module" src>` tags it finds, so
 * a tag here was concatenated into the ~90 kB app chunk — measured, and moving the tag between
 * `<head>` and `<body>` changed not one byte of output. The ordering *inside* that chunk was
 * right (this module's body sat at byte ~2.4k, ahead of Lit and the store), which is why it
 * looked fine, but the write could not happen until all ~90 kB had arrived.
 *
 * It is now a Rollup input in its own right and the `appearanceBootScript()` plugin in
 * `vite.config.mts` injects the tag at the top of `<head>`, with a `modulepreload` for its one
 * dependency. The emitted chunk is **81 bytes**. On a Slow 3G profile it completes at ~4.05s
 * against ~5.14s for the app entry.
 *
 * ## Honest scope: no flash was reproducible either way
 *
 * Measured on Slow 3G against both builds, the appearance write landed before first paint in
 * *both* — because paint is currently gated on a 113.8 kB render-blocking stylesheet, which is
 * larger than the 89.3 kB entry chunk. So the guarantee held by an accident of relative sizes,
 * not by design, and #987 was a latent defect rather than a live one.
 *
 * That accident is exactly what makes it worth removing. The entry chunk has been shrinking —
 * #719 took it from 454 kB to 89 kB — and the moment it drops below the stylesheet, the flash
 * appears with nothing in the suite or the build able to report it.
 *
 * A module rather than an inline `<script>` for the reason nothing else here is inline: the
 * production CSP sends `script-src 'self'`, so an inline block is refused outright (#752;
 * `test/csp-policy.test.ts` pins the directive).
 *
 * The DOM writes are `services/theme-service`'s rather than a copy of them. They used to be
 * spelled out here, which made this the appearance's *second* writer and the only one free to
 * drift from the other — and it had: the light branch cleared `wa-dark` and set `colorScheme`
 * but left `body[data-theme]` at whatever the previous session had written.
 */

import { applyTheme, followSystemAppearance } from './services/theme-service';

applyTheme(localStorage.getItem('theme'));

/*
 * And keep following, for the `system` setting (#962). Installed here rather than in a
 * component because it has to be live on the login screen as well as behind the shell, and
 * because there is no moment in the session when it should not be.
 */
followSystemAppearance();
