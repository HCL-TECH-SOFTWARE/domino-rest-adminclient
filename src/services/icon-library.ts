/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

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
 * Registered under the explicit name `fa`, and **also** as `default` — see below.
 *
 * To add an icon: import its URL and add it to {@link BUNDLED}. Only what is listed here
 * is bundled.
 */

import { registerIconLibrary } from '@awesome.me/webawesome/dist/components/icon/library.js';
import { getLogger } from './log-service.js';

import anglesLeft from '@fortawesome/fontawesome-free/svgs/solid/angles-left.svg?url';
import anglesRight from '@fortawesome/fontawesome-free/svgs/solid/angles-right.svg?url';
import arrowsRotate from '@fortawesome/fontawesome-free/svgs/solid/arrows-rotate.svg?url';
import ban from '@fortawesome/fontawesome-free/svgs/solid/ban.svg?url';
import bars from '@fortawesome/fontawesome-free/svgs/solid/bars.svg?url';
import bolt from '@fortawesome/fontawesome-free/svgs/solid/bolt.svg?url';
import caretDown from '@fortawesome/fontawesome-free/svgs/solid/caret-down.svg?url';
import chevronDown from '@fortawesome/fontawesome-free/svgs/solid/chevron-down.svg?url';
import chevronLeft from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg?url';
import chevronRight from '@fortawesome/fontawesome-free/svgs/solid/chevron-right.svg?url';
import chevronUp from '@fortawesome/fontawesome-free/svgs/solid/chevron-up.svg?url';
import circleCheck from '@fortawesome/fontawesome-free/svgs/solid/circle-check.svg?url';
import circleDot from '@fortawesome/fontawesome-free/svgs/solid/circle-dot.svg?url';
import circleExclamation from '@fortawesome/fontawesome-free/svgs/solid/circle-exclamation.svg?url';
import circleInfo from '@fortawesome/fontawesome-free/svgs/solid/circle-info.svg?url';
import circlePlay from '@fortawesome/fontawesome-free/svgs/solid/circle-play.svg?url';
import circlePlus from '@fortawesome/fontawesome-free/svgs/solid/circle-plus.svg?url';
import circleQuestion from '@fortawesome/fontawesome-free/svgs/solid/circle-question.svg?url';
import circleUser from '@fortawesome/fontawesome-free/svgs/solid/circle-user.svg?url';
import codeCompare from '@fortawesome/fontawesome-free/svgs/solid/code-compare.svg?url';
import copy from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?url';
import database from '@fortawesome/fontawesome-free/svgs/solid/database.svg?url';
import download from '@fortawesome/fontawesome-free/svgs/solid/download.svg?url';
import ellipsis from '@fortawesome/fontawesome-free/svgs/solid/ellipsis.svg?url';
import envelope from '@fortawesome/fontawesome-free/svgs/solid/envelope.svg?url';
import file from '@fortawesome/fontawesome-free/svgs/solid/file.svg?url';
import filter from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?url';
import folder from '@fortawesome/fontawesome-free/svgs/solid/folder.svg?url';
import folderOpen from '@fortawesome/fontawesome-free/svgs/solid/folder-open.svg?url';
import floppyDisk from '@fortawesome/fontawesome-free/svgs/solid/floppy-disk.svg?url';
import house from '@fortawesome/fontawesome-free/svgs/solid/house.svg?url';
import listUl from '@fortawesome/fontawesome-free/svgs/solid/list-ul.svg?url';
import magnifyingGlass from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?url';
import moon from '@fortawesome/fontawesome-free/svgs/solid/moon.svg?url';
import pencil from '@fortawesome/fontawesome-free/svgs/solid/pencil.svg?url';
import penToSquare from '@fortawesome/fontawesome-free/svgs/solid/pen-to-square.svg?url';
import play from '@fortawesome/fontawesome-free/svgs/solid/play.svg?url';
import plus from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?url';
import rightFromBracket from '@fortawesome/fontawesome-free/svgs/solid/right-from-bracket.svg?url';
import robot from '@fortawesome/fontawesome-free/svgs/solid/robot.svg?url';
import rotateLeft from '@fortawesome/fontawesome-free/svgs/solid/rotate-left.svg?url';
import shieldHalved from '@fortawesome/fontawesome-free/svgs/solid/shield-halved.svg?url';
import sort from '@fortawesome/fontawesome-free/svgs/solid/sort.svg?url';
import squareCaretDown from '@fortawesome/fontawesome-free/svgs/solid/square-caret-down.svg?url';
import squareMinus from '@fortawesome/fontawesome-free/svgs/solid/square-minus.svg?url';
import squarePlus from '@fortawesome/fontawesome-free/svgs/solid/square-plus.svg?url';
import sun from '@fortawesome/fontawesome-free/svgs/solid/sun.svg?url';
import tableCellsLarge from '@fortawesome/fontawesome-free/svgs/solid/table-cells-large.svg?url';
import trash from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?url';
import xmark from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?url';

const log = getLogger('services/icon-library');

/**
 * Font Awesome name → bundled URL. Keys are the canonical Font Awesome 7 names.
 *
 * **One weight per name — everything here is `solid`,** which is what the original 17
 * entries were and what the app renders today. The map is flat, so a name cannot hold both
 * a solid and a regular URL; a genuine need for both would have to key them apart
 * (`circle-question-regular`) rather than pick per call site. Several icons this replaced
 * were outline-weight in their old set (`AccountCircleOutlined`, `InfoOutlined`, and
 * everything from Feather) and are solid now. That is deliberate: one coherent weight
 * beats a per-glyph match to four inconsistent legacy sets.
 *
 * Declared with `satisfies` rather than a `Record<string, string>` annotation so the keys
 * survive as string literals and {@link FaIconName} can be derived from them. {@link ICONS}
 * below is the same object under the widened type, which is what the resolver and the
 * guards in `test/services/icon-library.test.ts` index by an arbitrary string.
 *
 * ### Five entries here have no call site yet (#946)
 *
 * `angles-left`, `angles-right`, `circle-exclamation`, `circle-play` and `filter` are staged
 * for the sweep that replaces the app's hand-drawn `<svg>` glyphs — the sites are listed on
 * that issue. They are registered first so each call-site change is a one-line swap that can
 * be looked at in a browser on its own, rather than one sweep mixing registration with
 * fourteen size-and-colour judgements.
 *
 * **Nothing guards against them staying unused.** `icon-library.test.ts` checks that every
 * name the markup asks for is registered, not the reverse, so an entry that never gains a call
 * site will sit here indefinitely. If #946 is abandoned, delete these five with it.
 */
const BUNDLED = {
  'angles-left': anglesLeft,
  'angles-right': anglesRight,
  'arrows-rotate': arrowsRotate,
  ban,
  bars,
  bolt,
  'caret-down': caretDown,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  'chevron-up': chevronUp,
  'circle-check': circleCheck,
  'circle-dot': circleDot,
  'circle-exclamation': circleExclamation,
  'circle-info': circleInfo,
  'circle-play': circlePlay,
  'circle-plus': circlePlus,
  'circle-question': circleQuestion,
  'circle-user': circleUser,
  'code-compare': codeCompare,
  copy,
  database,
  download,
  ellipsis,
  envelope,
  file,
  filter,
  folder,
  'folder-open': folderOpen,
  'floppy-disk': floppyDisk,
  house,
  'list-ul': listUl,
  'magnifying-glass': magnifyingGlass,
  moon,
  pencil,
  'pen-to-square': penToSquare,
  play,
  plus,
  'right-from-bracket': rightFromBracket,
  // The `system` appearance setting (#962) — the machine deciding, rather than the user.
  robot,
  'rotate-left': rotateLeft,
  'shield-halved': shieldHalved,
  sort,
  'square-caret-down': squareCaretDown,
  'square-minus': squareMinus,
  'square-plus': squarePlus,
  sun,
  'table-cells-large': tableCellsLarge,
  trash,
  xmark
} satisfies Record<string, string>;

/**
 * Every bundled glyph name, as a literal union.
 *
 * `test/services/icon-library.test.ts` catches an unregistered name only where it is written
 * as a literal in `.tsx` markup — `<KeepIcon name='house'>`, `<wa-icon name="house">`,
 * `<KeepButton icon="house">`. A name that lives in a data table instead, as the sidenav's
 * route metadata does (`components/sidenav/Routes.ts`), is invisible to that scan and would
 * reach the resolver, log a warning and render an empty glyph. Typing such a field as
 * `FaIconName` moves the same failure to `tsc`, i.e. to `npm run build`.
 */
export type FaIconName = keyof typeof BUNDLED;

/**
 * Font Awesome name → bundled URL.
 *
 * The same object as {@link BUNDLED}, widened: the resolver looks up whatever string a
 * `<wa-icon name>` carries, which a literal-keyed type cannot be indexed by.
 */
export const ICONS: Record<string, string> = BUNDLED;

/** The library name to pass as `<wa-icon library="...">`. */
export const FA_LIBRARY = 'fa';

const resolver = (name: string): string => {
  const url = ICONS[name];
  if (!url) {
    // Returning '' renders an empty glyph, which is exactly the failure mode this
    // module exists to eliminate — so say so rather than fail silently.
    log.warn(`No bundled Font Awesome icon named "${name}"; add it to ICONS in icon-library.ts`);
    return '';
  }
  return url;
};

registerIconLibrary(FA_LIBRARY, { resolver });

/**
 * The same resolver, also registered over Web Awesome's `default` library.
 *
 * An earlier revision of this module deliberately did *not* do this, reasoning that
 * overriding `default` could disturb how Web Awesome's own components resolve their
 * internal icons. Measured, that reasoning was backwards. Of the 41 `<wa-icon>` tags in
 * WebAwesome 3.10's own templates, 37 pass `library="system"` and resolve from glyphs
 * bundled inside the package — untouched by anything here. The remaining four pass no
 * library at all and therefore fall to `default`, whose stock resolver fetches from
 * `ka-f.fontawesome.com` at runtime.
 *
 * One of those four is `<wa-page>`'s navigation toggle, which this app mounts on every
 * authenticated screen (`AppShell.tsx`). So the old arrangement did not protect Web
 * Awesome's internals; it left them on the CDN. Confirmed in a browser against the
 * production build: `https://ka-f.fontawesome.com/releases/v7.3.0/svgs/solid/bars.svg`,
 * HTTP 200, and the SVG that came back is stamped `Font Awesome Pro 7.3.0` while every
 * glyph bundled here is `Free 7.0.0` — so it was served from the network, not from `dist`.
 *
 * `connect-src` carries a wildcard for OIDC, so nothing blocks or reports this; the icon
 * renders and the dependency is invisible. Overriding `default` removes it. A name that is
 * not bundled now warns and renders empty instead of silently reaching the network, which
 * is the failure mode this module exists to make loud.
 *
 * `setIconPath()` is Web Awesome's own supported alternative, but it wants a directory
 * laid out like the Font Awesome download — which means emitting a copy of the icon tree
 * as static assets and resolving names that were never bundled. Reusing {@link ICONS}
 * keeps one registry, one failure mode, and no second copy of Font Awesome.
 */
registerIconLibrary('default', { resolver });
