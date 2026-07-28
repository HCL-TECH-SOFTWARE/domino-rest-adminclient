/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import DatabaseIcon from '@mui/icons-material/Storage';
import ScopeIcon from '@mui/icons-material/Album';
import Mail from '@mui/icons-material/Email';
import Home from '@mui/icons-material/Home';
import Apps from '@mui/icons-material/Apps';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
/**
 * Route.ts provides menu entries for each of the main pages in the Admin UI.
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

export const appRoutes = [
  {
    uri: '/',
    icon: Home,
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
export const databases = [
  {
    uri: '/schema',
    icon: DatabaseIcon,
    label: 'Schemas',
  },
  {
    uri: '/scope',
    icon: ScopeIcon,
    label: 'Scopes',
  },
];
export const apps = [
  {
    uri: '/apps',
    icon: Apps,
    label: 'Applications',
  },
  {
    uri: '/apps/consents',
    icon: FormatListBulletedIcon,
    label: 'Consents',
  },
];
/*
 * `people` and `groups` are gone with the screens behind them (#770). They were routed in
 * react-router v5 and dropped — not converted — during the v6 upgrade in 9324783
 * (2024-04-25), so for fifteen months these entries rendered links to a blank page on any
 * deployment whose adminui.json set `users` or `groups` true.
 */

export const settings = [
  {
    uri: '/mail',
    icon: Mail,
    label: 'Mail',
  },
];