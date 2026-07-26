// Copyright (C) 2026 HCL America Inc.
// Licensed under the Apache 2.0 License (https://www.apache.org/licenses/LICENSE-2.0.txt)

/**
 * Registers a self-hosted Font Awesome icon library for `<wa-icon library="fa">`.
 *
 * Two things this deliberately avoids:
 *
 * 1. **Absolute `/admin/...` asset paths.** The previous `<wa-icon src="${IMG_DIR}/...">`
 *    form hardcodes `/admin/img/...`, which only resolves when the app happens to be
 *    mounted at `/admin/`. Anywhere else — `vite dev`, or any other mount point — the
 *    request falls through to the SPA's `index.html`, so `wa-icon` receives HTML
 *    instead of SVG and renders an empty glyph. The button keeps its box and its click
 *    handler, so the icon silently disappears while everything still "works".
 *    These URLs come from Vite instead, so they carry the right base in every build.
 *
 * 2. **Web Awesome's default CDN.** `<wa-icon name="...">` with the built-in resolver
 *    fetches from `ka-f.fontawesome.com` at runtime. For a self-hosted admin UI that
 *    would add an external network dependency (and one the deployment CSP is likely to
 *    block), so the glyphs are bundled from the `@fortawesome/fontawesome-free`
 *    dependency instead.
 *
 * Registered under the explicit name `fa` rather than overriding `default`, so nothing
 * here can affect how Web Awesome's own components resolve their internal icons.
 *
 * To add an icon: import its URL and add it to {@link ICONS}. Only what is listed here
 * is bundled.
 */

import { registerIconLibrary } from '@awesome.me/webawesome/dist/components/icon/library.js';
import { getLogger } from './log-service.js';

import arrowsRotate from '@fortawesome/fontawesome-free/svgs/solid/arrows-rotate.svg?url';
import circlePlus from '@fortawesome/fontawesome-free/svgs/solid/circle-plus.svg?url';
import codeCompare from '@fortawesome/fontawesome-free/svgs/solid/code-compare.svg?url';
import copy from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?url';
import database from '@fortawesome/fontawesome-free/svgs/solid/database.svg?url';
import download from '@fortawesome/fontawesome-free/svgs/solid/download.svg?url';
import file from '@fortawesome/fontawesome-free/svgs/solid/file.svg?url';
import folder from '@fortawesome/fontawesome-free/svgs/solid/folder.svg?url';
import floppyDisk from '@fortawesome/fontawesome-free/svgs/solid/floppy-disk.svg?url';
import magnifyingGlass from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?url';
import pencil from '@fortawesome/fontawesome-free/svgs/solid/pencil.svg?url';
import plus from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?url';
import squareCaretDown from '@fortawesome/fontawesome-free/svgs/solid/square-caret-down.svg?url';
import squareMinus from '@fortawesome/fontawesome-free/svgs/solid/square-minus.svg?url';
import squarePlus from '@fortawesome/fontawesome-free/svgs/solid/square-plus.svg?url';
import trash from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?url';
import xmark from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?url';

const log = getLogger('services/icon-library');

/** Font Awesome name → bundled URL. Keys are the canonical Font Awesome 7 names. */
export const ICONS: Record<string, string> = {
  'arrows-rotate': arrowsRotate,
  'circle-plus': circlePlus,
  'code-compare': codeCompare,
  copy,
  database,
  download,
  file,
  folder,
  'floppy-disk': floppyDisk,
  'magnifying-glass': magnifyingGlass,
  pencil,
  plus,
  'square-caret-down': squareCaretDown,
  'square-minus': squareMinus,
  'square-plus': squarePlus,
  trash,
  xmark
};

/** The library name to pass as `<wa-icon library="...">`. */
export const FA_LIBRARY = 'fa';

registerIconLibrary(FA_LIBRARY, {
  resolver: (name: string) => {
    const url = ICONS[name];
    if (!url) {
      // Returning '' renders an empty glyph, which is exactly the failure mode this
      // module exists to eliminate — so say so rather than fail silently.
      log.warn(`No bundled Font Awesome icon named "${name}"; add it to ICONS in icon-library.ts`);
      return '';
    }
    return url;
  }
});
