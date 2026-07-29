/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { RESET_DATABASE_STYLE } from './types';

/**
 * `createSlice` generates these action creators now (#710). Re-exported so callers
 * keep the import path and the names they already use.
 */
export { adjustDatabaseStyle, toggleFullscreen, setViewport, switchTheme } from './reducer';

/**
 * Dead before this change and dead after it: no reducer has ever had a case for
 * RESET_DATABASE_STYLE. Left dispatching the raw type rather than folded into the
 * slice, so that converting the reducer does not quietly give it an effect it has
 * never had. Deleting it is a separate call.
 */
export function resetDatabaseStyle() {
  return {
    type: RESET_DATABASE_STYLE,
  };
}


import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';

// Get Selected theme
export const getTheme = (theme: string) => {
  switch (theme) {
    // Dark Mode Theme
    case 'dark': {
      return {
        primary: '#1e1e2e',
        secondary: '#252535',
        textColorPrimary: '#e0e0e0',
        textColorSecondary: '#e0e0e0',
        textSecondary: '#e0e0e0',
        borderColor: '#3a3a4a',
        button: {
          primary: '#8B6CE0',
          secondary: '#9e9e9e',
        },
        bodyColor: '#181825',
        hoverColor: '#8B6CE0',
        dialog: {
          header: '#8B6CE0',
          title: '#e0e0e0',
        },
        badgeColor: {
          background: '#8B6CE0',
          color: '#fff',
        },
        sidenav: {
          border: '#CFCFCF',
          background: 'linear-gradient(180deg, #5E1EBE 10.94%, #3B91FF 57.29%, #8CC7F9 100%)',
          active: '#002C70',
          hover: '#0A3E8F',
          textColor: '#fff',
          iconColor: '#fff',
          activeTextColor: '#fff',
          activeIconColor: '#fff',
        },
        breadcrumb: {
          background: '#1e1e2e',
          lastActiveColor: '#e0e0e0',
        },
        activeIcon: '#8B6CE0',
        shimmerGradient:
          'linear-gradient(to right,#272726 4%,#3c3c3c 25%,#272726 36%)',
        loading: '#8B6CE0',
      };
    }
    // Keep Skin Theme (Default)
    default:
      return {
        primary: 'white',
        secondary: 'white',
        textColorPrimary: '#383838',
        textSecondary: '#f1f1f4',
        borderColor: '#e6e8f1',
        button: {
          primary: KEEP_ADMIN_BASE_COLOR,
          secondary: '#757575',
        },
        bodyColor: '#f5f5f5',
        hoverColor: KEEP_ADMIN_BASE_COLOR,
        dialog: {
          header: KEEP_ADMIN_BASE_COLOR,
          title: '#383838',
        },
        badgeColor: {
          background: KEEP_ADMIN_BASE_COLOR,
          color: 'white',
        },
        sidenav: {
          border: '#CFCFCF',
          background: 'linear-gradient(180deg, #5E1EBE 10.94%, #3B91FF 57.29%, #8CC7F9 100%)',
          active: '#002C70',
          hover: '#0A3E8F',
          textColor: '#fff',
          iconColor: '#fff',
          activeTextColor: '#fff',
          activeIconColor: '#fff'
        },
        breadcrumb: {
          background: 'white',
          lastActiveColor: 'black',
        },
        activeIcon: KEEP_ADMIN_BASE_COLOR,
        shimmerGradient:
          'linear-gradient(to right, #f0f9ff 0%,#cbebff 47%,#a1dbff 100%)',
        loading: KEEP_ADMIN_BASE_COLOR,
      };
  }
};
