/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createTheme } from '@mui/material/styles';

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
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 12,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            color: getTheme(themeMode).badgeColor.color,
            backgroundColor: getTheme(themeMode).badgeColor.background,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: getTheme(themeMode).dialog.title,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
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
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: getTheme(themeMode).secondary,
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: getTheme(themeMode).textPrimary,
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          colorPrimary: {
            color: getTheme(themeMode).loading,
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            background: getTheme(themeMode).breadcrumb.background,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            color: getTheme(themeMode).textColorPrimary,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '@media (min-width: 600px)': {
              minWidth: 0
            }
          },
          textColorPrimary: {
            color: getTheme(themeMode).textColorPrimary,
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: getTheme(themeMode).textColorPrimary,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            color: 'white',
            '&$checked' : {
              color: '#3874cb',
              '& + $track':{
                opacity: 1,
                backgroundColor: '#9cbae5',
              }
            },
            '&$checked + $track': {
              backgroundColor: 'black',
            },
          }
        }
      }
    },
  });
};
export default theme;
