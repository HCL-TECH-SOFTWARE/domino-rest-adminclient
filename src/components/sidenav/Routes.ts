/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { FaIconName } from '../../services/icon-library';

/**
 * Route.ts provides menu entries for each of the main pages in the Admin UI.
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

/**
 * One entry in the sidenav.
 *
 * `icon` is a **glyph name, not a component** (#718). It used to hold the icon component
 * itself, which forced this data module to import six view-layer modules and left the
 * contract undeclared — the field's type was inferred, so a data entry and the four render
 * sites in `SideNav.tsx` could drift apart and still compile. A string keeps the module what
 * it was trying to be: plain data with no JSX and no component imports.
 *
 * `FaIconName` is the literal union of the names registered in `services/icon-library`, so a
 * glyph that is not bundled fails `tsc` here. That matters because the repo's other guard —
 * the source scan in `test/services/icon-library.test.ts` — only sees literal `name='…'` in
 * `.tsx` markup and cannot see a name sitting in this table; without the type an unregistered
 * name would reach the resolver, log a warning and render an empty glyph in the rail. The
 * import is `import type`, so it is erased and pulls none of the icon library's 44 asset
 * imports into whatever loads this module.
 */
export interface NavRoute {
  /** Path the entry links to. */
  uri: string;
  /** Font Awesome glyph name; `SideNav` renders it through `KeepIcon`. */
  icon: FaIconName;
  /** Visible label, and also the tooltip text and the React key. */
  label: string;
}

export const appRoutes: NavRoute[] = [
  {
    uri: '/',
    icon: 'house',
    label: 'Overview',
  },
];

/* Dashboard is intentionally disabled pending LABS-1214 (see #698). Not a TODO in
   this repo: re-enabling it is gated on that ticket, not on work here.
  {
    uri: '/dashboard',
    icon: Dashboard,
    label: 'Dashboard',
  },
*/

// Selectively turn off admin ui pages
export const databases: NavRoute[] = [
  {
    uri: '/schema',
    icon: 'database',
    label: 'Schemas',
  },
  {
    uri: '/scope',
    icon: 'circle-dot',
    label: 'Scopes',
  },
];
export const apps: NavRoute[] = [
  {
    uri: '/apps',
    icon: 'table-cells-large',
    label: 'Applications',
  },
  {
    uri: '/apps/consents',
    icon: 'list-ul',
    label: 'Consents',
  },
];
/*
 * `people` and `groups` are gone with the screens behind them (#770). They were routed in
 * react-router v5 and dropped — not converted — during the v6 upgrade in 9324783
 * (2024-04-25), so for fifteen months these entries rendered links to a blank page on any
 * deployment whose adminui.json set `users` or `groups` true.
 */

export const settings: NavRoute[] = [
  {
    uri: '/mail',
    icon: 'envelope',
    label: 'Mail',
  },
];
