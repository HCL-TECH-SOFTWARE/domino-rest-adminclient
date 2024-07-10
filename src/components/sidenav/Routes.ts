/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import DatabaseIcon from '@mui/icons-material/Storage';
import ScopeIcon from '@mui/icons-material/Album';
import Mail from '@mui/icons-material/Email';
import Home from '@mui/icons-material/Home';
import Apps from '@mui/icons-material/Apps';
import Groups from '@mui/icons-material/Group';
import People from '@mui/icons-material/Person';
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

/* TODO: Disable Dashboard page for now  LABS-1214
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
export const people = [
  {
    uri: '/people',
    icon: People,
    label: 'People',
  },
];
export const groups = [
  {
    uri: '/groups',
    icon: Groups,
    label: 'Groups',
  },
];

export const settings = [
  {
    uri: '/mail',
    icon: Mail,
    label: 'Mail',
  },
];