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
  // Cache the theme object to avoid calling getTheme() repeatedly
  const currentTheme = authenticated ? getTheme(themeMode) : getTheme('default');

  return createTheme({
    palette: {
      primary: {
        // light: will be calculated from palette.primary.main,
        main: currentTheme.textColorPrimary,
        dark: 'black',
        // contrastText: will be calculated to contrast with palette.primary.main
      },
      secondary: {
        main: '#f1f1f4',
        // dark: will be calculated from palette.secondary.main,
        contrastText: '#ffffff',
      },
      background: {
        default: currentTheme.bodyColor || '#f5f5f5',
        paper: currentTheme.secondary || 'white',
      },
      // Used by `getContrastText()` to maximize the contrast between
      // the background and the text.
      contrastThreshold: 3,
      // Used by the functions below to shift a color's luminance by approximately
      // two indexes within its tonal palette.
      // E.g., shift from Red 500 to Red 300 or Red 700.
      tonalOffset: 0.2,
      text: {
        primary: currentTheme.textColorPrimary,
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
            color: currentTheme.badgeColor.color,
            backgroundColor: currentTheme.badgeColor.background,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: currentTheme.dialog.title,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            variants: [
              { 
                props: { variant: 'text', color: 'primary' }, 
                style: { color: currentTheme.button.primary, textTransform: 'capitalize', fontSize: 16 } 
              },
              { 
                props: { variant: 'text', color: 'secondary' }, 
                style: { color: currentTheme.button.secondary, textTransform: 'capitalize', fontSize: 16 } 
              },
            ]
          }
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: currentTheme.secondary,
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: currentTheme.textPrimary,
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          colorPrimary: {
            color: currentTheme.loading,
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            background: currentTheme.breadcrumb.background,
          },
          separator: {
            color: currentTheme.textColorPrimary,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            color: currentTheme.textColorPrimary,
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
            color: currentTheme.textColorPrimary,
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: currentTheme.textColorPrimary,
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
