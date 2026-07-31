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
 * ## What the split does and does not buy, measured
 *
 * `npm run build` **merges both module scripts into one entry chunk** and hoists it into
 * `<head>` — `dist/index.html` carries a single `<script type="module">`, not two. That is
 * Vite's behaviour for multiple module scripts on one page and it is not new: the same is true
 * of the build on `new_code` before #719, where the pair were `index.ts` and `index.tsx`.
 *
 * Inside that chunk the ordering *is* preserved. Rollup emits entries depth-first in
 * declaration order, so this module's body is the first thing after the preload helper —
 * measured at byte ~2.4k of an 89 kB chunk, ahead of everything the app entry pulls in. So the
 * "before the framework" half of the guarantee holds in production.
 *
 * The "before the render-blocking stylesheets" half does not: nothing can execute until the
 * whole 89 kB chunk has arrived, and the stylesheets may well have landed first. That half has
 * only ever held under `vite dev`, which serves the two source modules as two requests. Making
 * it true of the build needs a separate Rollup input — a build-config change with its own
 * verification, so **#987** rather than smuggled in here.
 *
 * Keeping the file separate is therefore not a no-op: it is what preserves the ordering above,
 * and it is the seam that a fix would use. Folding it into `index.ts` would put the write
 * after every static import in that module, which is the whole framework.
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

import { applyTheme } from './services/theme-service';

// TODO: extend to dark, light and system themes rather than dark/default.
applyTheme(localStorage.getItem('theme'));
