/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createTheme } from '@material-ui/core/styles';

const theme = (
  authenticated: boolean,
  getTheme: (theme: string) => any,
  themeMode: string
) => {
  return createTheme({
    palette: {
      primary: {
        // light: will be calculated from palette.primary.main,
        main: authenticated
          ? getTheme(themeMode).textColorPrimary
          : getTheme('default').textColorPrimary,
        dark: 'black',
        // contrastText: will be calculated to contrast with palette.primary.main
      },
      secondary: {
        main: '#f1f1f4',
        // dark: will be calculated from palette.secondary.main,
        contrastText: '#ffffff',
      },
      // Used by `getContrastText()` to maximize the contrast between
      // the background and the text.
      contrastThreshold: 3,
      // Used by the functions below to shift a color's luminance by approximately
      // two indexes within its tonal palette.
      // E.g., shift from Red 500 to Red 300 or Red 700.
      tonalOffset: 0.2,
      text: {
        primary: authenticated
          ? getTheme(themeMode).textColorPrimary
          : getTheme('default').textColorPrimary,
        secondary: '#fafafa',
      },
    },
    typography: {
      caption: {
        fontSize: 14,
      },
    },
    overrides: {
      MuiTooltip: {
        tooltip: {
          fontSize: 12,
        },
      },
      MuiBadge: {
        badge: {
          color: getTheme(themeMode).badgeColor.color,
          backgroundColor: getTheme(themeMode).badgeColor.background,
        },
      },
      MuiDialogTitle: {
        root: {
          color: getTheme(themeMode).dialog.title,
        },
      },
      MuiButton: {
        textPrimary: {
          color: getTheme(themeMode).button.primary,
          textTransform: 'capitalize',
          fontSize: 16,
        },
        textSecondary: {
          color: getTheme(themeMode).button.secondary,
          textTransform: 'capitalize',
          fontSize: 16,
        },
      },
      MuiPaper: {
        root: {
          backgroundColor: getTheme(themeMode).secondary,
        },
      },
      MuiListItemIcon: {
        root: {
          color: getTheme(themeMode).textPrimary,
        },
      },
      MuiCircularProgress: {
        colorPrimary: {
          color: getTheme(themeMode).loading,
        },
      },
      MuiBreadcrumbs: {
        root: {
          background: getTheme(themeMode).breadcrumb.background,
        },
      },
      MuiInputBase: {
        input: {
          color: getTheme(themeMode).textColorPrimary,
        },
      },
      MuiTab: {
        root: {
          '@media (min-width: 600px)': {
            minWidth: 0
          }
        },
        textColorPrimary: {
          color: getTheme(themeMode).textColorPrimary,
        },
        wrapper: {
          flexDirection: "row",
          justifyContent: "flex-start"
        }
      },
      MuiFormLabel: {
        root: {
          color: getTheme(themeMode).textColorPrimary,
        },
      },
    },
  });
};
export default theme;
