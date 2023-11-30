/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  ADJUST_DATABASE_STYLE,
  RESET_DATABASE_STYLE,
  TOGGLE_FULLSCREEN,
  SET_MOBILE_VIEWPORT,
  SWITCH_THEME,
} from './types';
import {
  DARK_PRIMARY_COLOR,
  DARK_SECONDARY_COLOR,
  HCL_BASE_COLOR,
  KEEP_ADMIN_BASE_COLOR,
} from '../../config.dev';

export function adjustDatabaseStyle(size: number) {
  return {
    type: ADJUST_DATABASE_STYLE,
    payload: size,
  };
}

export function resetDatabaseStyle() {
  return {
    type: RESET_DATABASE_STYLE,
  };
}

export function toggleFullscreen() {
  return {
    type: TOGGLE_FULLSCREEN,
  };
}

export function setViewport() {
  return {
    type: SET_MOBILE_VIEWPORT,
  };
}

// Dispatch theme
export function switchTheme(theme: string) {
  return {
    type: SWITCH_THEME,
    payload: theme,
  };
}

// Get Selected theme
export const getTheme = (theme: string) => {
  switch (theme) {
    // Dark Mode Theme
    case 'dark': {
      return {
        primary: DARK_PRIMARY_COLOR,
        secondary: DARK_SECONDARY_COLOR,
        textColorPrimary: '#f1f1f4',
        textColorSecondary: '#f1f1f4',
        borderColor: '#A5AFBE',
        button: DARK_PRIMARY_COLOR,
        bodyColor: DARK_PRIMARY_COLOR,
        hoverColor: '#f1f1f4',
        dialog: {
          header: DARK_PRIMARY_COLOR,
          title: '#f1f1f4',
        },
        badgeColor: {
          background: '#f1f1f4',
          color: DARK_PRIMARY_COLOR,
        },
        sidenav: {
          border: '#f1f1f4',
          background: DARK_SECONDARY_COLOR,
          active: DARK_PRIMARY_COLOR,
          hover: DARK_PRIMARY_COLOR,
          textColor: '#f1f1f4',
          iconColor:'#fff',
          activeTextColor: '#f1f1f4',
          activeIconColor: '#fff',
        },
        breadcrumb: {
          background: '#000000cc',
          lastActiveColor: 'black',
        },
        activeIcon: KEEP_ADMIN_BASE_COLOR,
        shimmerGradient:
          'linear-gradient(to right,#272726 4%,#3c3c3c 25%,#272726 36%)',
      };
    }
    // HCL Skin Theme
    case 'hcl': {
      return {
        primary: HCL_BASE_COLOR,
        secondary: '#065a99',
        textColorPrimary: '#f1f1f4',
        textColorSecondary: '#f1f1f4',
        button: HCL_BASE_COLOR,
        borderColor: '#0d5284',
        bodyColor: '#065a99',
        dialog: {
          header: 'white',
        },
        badgeColor: {
          background: 'white',
          color: HCL_BASE_COLOR,
        },
        sidenav: {
          border: 'white',
          background: '#07436fc4',
          active: '#07436fc4',
          hover: '#07436fc4',
          textColor: '#f1f1f4',
          iconColor:'#000',
          activeTextColor: '#f1f1f4',
          activeIconColor: '#000',
        },
        breadcrumb: {
          background: 'white',
          lastActiveColor: 'black',
        },
        activeIcon: HCL_BASE_COLOR,
        shimmerGradient:
          'linear-gradient(to right,#272726 4%,#3c3c3c 25%,#272726 36%)',
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
