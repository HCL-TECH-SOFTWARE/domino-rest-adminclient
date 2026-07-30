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
import './App.css';
import './styles/app-shell.css';
import Views from './Views';
import theme from './theme';
import { KeepProfileMenu } from './components/keep-elements/react/KeepProfileMenu';
import { KeepProfileMenuDialog } from './components/keep-elements/react/KeepProfileMenuDialog';
import { KeepFooter } from './components/keep-elements/react/KeepFooter';
import { KeepMobileHeader } from './components/keep-elements/react/KeepMobileHeader';
import { KeepNotification } from './components/keep-elements/react/KeepNotification';
import { KeepSideNav } from './components/keep-elements/react/KeepSideNav';
import { KeepTooltip } from './components/keep-elements/react/KeepTooltip';
import { KeepIcon } from './components/keep-elements/react/KeepIcon';
import { useRouter } from './router/react';
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
  // Read, not subscribed: the instance is stable for the life of the app. `keep-side-nav`
  // takes it as a property (its own subscription is what re-renders it on navigation), and
  // the sign-out handler below navigates with it.
  const router = useRouter();

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

  /*
   * The redirect half of signing out (#806).
   *
   * `keep-option-list` clears the session and emits `logout`; the event is composed, so it
   * crosses the profile elements' shadow roots and arrives on their wrappers. The navigation
   * has to happen out here because the router is only reachable through React — the same
   * reason `keep-side-nav` takes the instance as a property. It moves onto the element when
   * the Lit router controller lands (#926).
   */
  const handleLogout = useCallback(() => {
    router.navigate('/');
  }, [router]);

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
            {/* The profile control crosses into `keep-mobile-header` as slotted light DOM,
                which is what its unnamed slot is for. */}
            <KeepMobileHeader>
              <KeepProfileMenuDialog onLogout={handleLogout} />
            </KeepMobileHeader>
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
              {/*
                No `size` on either arm. `.nav-theme-toggle svg` in `styles/app-shell.css`
                set 20px, and a descendant selector outranks `.MuiSvgIcon-root`, so 20px is
                what this glyph renders today rather than MUI's 24px default; the rule is
                retargeted to `wa-icon` there and keeps sizing it. A `size` prop would have
                been silently inert against it anyway.

                `label` because the glyph is the button's only content — the icon shows the
                current mode, so the accessible name states the action instead, matching the
                tooltip above it word for word.
              */}
              {themeMode === 'dark' ? (
                <KeepIcon name="moon" label="Switch to Light Mode" />
              ) : (
                <KeepIcon name="sun" label="Switch to Dark Mode" />
              )}
            </button>
          </KeepTooltip>
        </div>

        {/*
          `router` is passed down rather than reached for. `keep-side-nav` renders real anchors
          — the unsaved-changes guard, modified clicks and route prefetching all depend on that
          — so it needs the basename, the current pathname and `navigate`, and the one instance
          lives in React context. See the element's class note; it goes away with #806's router
          controller.
        */}
        <div slot="navigation">
          <KeepSideNav expanded={expanded} router={router} />
        </div>

        <div slot="navigation-footer">
          <KeepProfileMenu expanded={expanded} onLogout={handleLogout} />
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
            {/*
              The modules were ChevronRightRounded and ChevronLeftRounded; the
              Expand/Collapse aliases described the action, not the glyph. Font Awesome has
              no rounded variant, so these are the square-ended chevrons.

              No `size`: `.nav-collapse-toggle svg` set 19px and outranked `.MuiSvgIcon-root`
              the same way, so 19px is the current rendering and the retargeted rule keeps
              it. No `label` either — the button already carries an aria-label that switches
              with the state, and a second name on the icon would only compete with it.
            */}
            {collapsed ? (
              <KeepIcon name="chevron-right" />
            ) : (
              <KeepIcon name="chevron-left" />
            )}
          </button>
        )}
      </WaPage>

      {/* Both sit outside the page element on purpose: the toast is fixed to the top of the
          viewport and the footer is a fixed overlay. See the note above. */}
      <KeepNotification />
      <KeepFooter />
    </ThemeProvider>
  );
};

export default AppShell;
