/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import WaPage from '@awesome.me/webawesome/dist/react/page/index.js';
import CollapseMenuIcon from '@mui/icons-material/ChevronLeftRounded';
import ExpandMenuIcon from '@mui/icons-material/ChevronRightRounded';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import './App.css';
import './styles/app-shell.css';
import Views from './Views';
import theme from './theme';
import MobileHeader from './components/header/MobileHeader';
import Notification from './components/alerts/Notification';
import SideNav from './components/sidenav/SideNav';
import ProfileMenu from './components/sidenav/ProfileMenu';
import { KeepFooter, KeepTooltip } from './components/keep-elements/KeepElements';
import { applyTheme } from './services/theme-service';
import { AppState } from './store';
import { getTheme, switchTheme } from './store/styles/action';
import keepLogo from './assets/KeepNewIcon.png';
import { useAppDispatch } from './store/hooks';

/**
 * The application shell for an authenticated session, built on `<wa-page>` (#707).
 *
 * `wa-page` owns the viewport and scaffolds the regions itself, so this component is a
 * mapping from the app's parts onto its slots rather than a layout. What it replaced —
 * `HomeElement`'s `AppContainer` flex row, the `RightPanel` `width: calc(100% - 241px|50px)`
 * arithmetic, `SideNavContainer`'s width animation and the whole duplicated `MobileSidebar`
 * — is deleted, not ported.
 *
 * Two regions are deliberately *not* used:
 *
 *   - `footer`. `keep-footer`'s bar is `position: fixed; bottom: 0` and 23px tall, which is
 *     where the `calc(100vh - 23px)` in this app's ~20 page-level rules comes from. Slotting
 *     it would add a grid row and change every one of them. It stays a fixed overlay outside
 *     the page element.
 *   - `subheader`. The obvious tenant is `PageRouters`, but it renders inside `Views`'
 *     `NavigationGuardProvider` and needs the router context; hoisting it is its own change.
 *
 * The React subtrees inside each slot are untouched: `wa-page` slots light DOM, so the
 * reconciler, the Redux tree and the MUI components inside them all keep working. Only the
 * outer scaffolding changed.
 */

/**
 * Feeds `wa-page`'s `mobile-breakpoint`. `styles/app-shell.css` repeats the number in two
 * media queries (a media condition cannot read a custom property) and `test/app-shell.test.ts`
 * fails if they drift.
 */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Written in the same form as the query `wa-page` compiles into its shadow root from
 * `mobile-breakpoint`, so React and the component agree on which side of 768 the boundary
 * pixel falls. MUI's `useMediaQuery('(max-width:768px)')`, which `HomeElement` used, said
 * "mobile" at exactly 768px where `wa-page` says "desktop".
 */
const MOBILE_QUERY = `(width < ${MOBILE_BREAKPOINT_PX}px)`;

/**
 * `wa-page` reflects the same state on its `view` attribute, but only after a
 * `ResizeObserver` has run — it renders `desktop` first regardless of width. `matchMedia`
 * is correct on the very first render, which is what the conditional slots below need.
 */
function useMobileView(): boolean {
  const query = useMemo(() => window.matchMedia(MOBILE_QUERY), []);
  const subscribe = useCallback(
    (onChange: () => void) => {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => query.matches);
}

interface AppShellProps {
  /**
   * Content for the main region. Defaults to the router. `CallbackPage` substitutes its own
   * while the OIDC exchange is still in flight, which is the one case where the shell is on
   * screen without `Views` behind it.
   */
  children?: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // Collapsed is the initial state, as it was when this was `HomeElement`'s `open` flag.
  const [collapsed, setCollapsed] = React.useState(true);
  const isMobile = useMobileView();
  const dispatch = useAppDispatch();

  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { authenticated } = useSelector((state: AppState) => state.account);

  /*
   * The rail is a desktop affordance. On mobile the nav lives in `wa-page`'s drawer, where
   * a 57px rail would be nonsense, so the expanded rendering is forced there instead of
   * resetting `collapsed` — that way the desktop choice survives a trip through a narrow
   * viewport and back.
   */
  const expanded = isMobile || !collapsed;

  const currentTheme = useMemo(
    () => theme(authenticated, getTheme, themeMode),
    [authenticated, themeMode]
  );

  // Sync Redux themeMode with localStorage (e.g. after login page toggle)
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'default';
    if (storedTheme !== themeMode) {
      dispatch(switchTheme(storedTheme));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'default' : 'dark';
    localStorage.setItem('theme', newTheme);
    dispatch(switchTheme(newTheme));
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <WaPage
        mobileBreakpoint={`${MOBILE_BREAKPOINT_PX}px`}
        /*
         * A class and not `data-toggle-nav`: `wa-page` hides its own hamburger the moment it
         * finds that attribute anywhere in its light DOM, which would leave mobile with no
         * way to open the drawer. The rail is switched from here and read back through CSS
         * only. (A plain `data-collapsed` would do as well, but `@lit/react`'s props derive
         * from `React.HTMLAttributes`, which has no `data-*` index signature.)
         */
        className={collapsed ? 'nav-collapsed' : undefined}
      >
        {/*
          Mobile-only, because the desktop app has no top bar — #751 deleted the dead one.
          An empty header part measures 0px, so `--header-height` stays 0 on desktop.
        */}
        {isMobile && (
          <div slot="header">
            <MobileHeader />
          </div>
        )}

        <div slot="navigation-header" className="nav-header">
          <button
            type="button"
            className="nav-logo"
            aria-label="HCL Domino REST API home"
            onClick={() => {
              window.location.href = window.location.origin;
            }}
          >
            <img className="keep-icon side-nav-logo-img" src={keepLogo} alt="" />
          </button>
          {expanded && (
            <span className="medium-text color-text-primary text-bold nav-title">
              HCL Domino REST API
            </span>
          )}
          <KeepTooltip
            content={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            placement="right"
          >
            <button type="button" className="nav-theme-toggle" onClick={toggleTheme}>
              {themeMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
            </button>
          </KeepTooltip>
        </div>

        <div slot="navigation">
          <SideNav expanded={expanded} />
        </div>

        <div slot="navigation-footer">
          <ProfileMenu open={expanded} />
        </div>

        {children ?? <Views />}

        {!isMobile && (
          <button
            type="button"
            className="nav-collapse-toggle"
            aria-label={collapsed ? 'expand menu' : 'collapse menu'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ExpandMenuIcon /> : <CollapseMenuIcon />}
          </button>
        )}
      </WaPage>

      {/* Both sit outside the page element on purpose: the snackbar portals to
          document.body and the footer is a fixed overlay. See the note above. */}
      <Notification />
      <KeepFooter />
    </ThemeProvider>
  );
};

export default AppShell;
