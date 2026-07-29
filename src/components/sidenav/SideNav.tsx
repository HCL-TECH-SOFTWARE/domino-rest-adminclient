/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { styled } from '@linaria/react';
import { NavLink, useLocation } from '../../router/react';
import { useSelector } from 'react-redux';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { fetchKeepDatabases } from '../../store/databases/action';
import { AppState } from '../../store';
import { appRoutes as routes, apps, databases, settings } from './Routes';
import { showPages } from '../../store/account/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { KeepTooltip } from '../keep-elements/react/KeepTooltip';
import { useAppDispatch } from '../../store/hooks';

/**
 * The route list for `wa-page`'s `navigation` slot (#707).
 *
 * Everything that used to make this a *panel* is gone: the 242px/57px width, the gradient,
 * the trailing border, `calc(100vh - 23px)` and the `.drawer/.open/.close` classes. The rail
 * width now belongs to `--menu-width` on `<wa-page>` and the paint to `::part(menu)`, both
 * in `styles/app-shell.css`; the mobile copy of this list (`MobileSidebar`) is deleted,
 * because `wa-page` re-projects these same nodes into its drawer below the breakpoint.
 *
 * `expanded` no longer drives any width. It survives only so the profile block and the
 * separator spacing can differ between the rail and the open menu; the labels themselves are
 * clipped by `::part(menu)`'s `overflow-x: hidden`, exactly as they were before.
 */
const NavList = styled(List)`
  padding-top: 10px !important;
  display: flex;
  flex-direction: column;
  /* Route labels must sit well outside the 57px rail so no glyph peeks through while the
     width animates. MUI v9 dropped the default ListItemIcon min-width from 56px to 36px,
     which with the 16px ListItemButton padding would start them at ~52px; force the v5
     spacing back. */
  .MuiListItemIcon-root {
    min-width: 56px;
  }
  a {
    display: block;
    text-decoration: none !important;
    .MuiTypography-colorTextPrimary {
      color: var(--keep-sidenav-on) !important;
    }
    svg {
      color: var(--keep-sidenav-on) !important;
    }
    .MuiListItem-button:hover {
      background: var(--keep-sidenav-hover) !important;
    }
  }
  .active {
    .link-container,
    .quick-config,
    .consent-list {
      border-left: 3px solid var(--keep-sidenav-border);
      background: var(--keep-sidenav-active);
      svg {
        margin-left: -4px;
        color: var(--keep-sidenav-on) !important;

        cursor: pointer;
        font-weight: 800;
      }
    }
  }

  .MuiDivider-root {
    height: 0;
  }

  .expandSeparator {
    margin-top: 26px;
  }

  .collapseSeparator {
    margin-top: 50px;
  }
`;

const QuickConfigButton = styled.div``;

interface SidenavProps {
  /** True when the menu shows its labels; false for the 57px rail. */
  expanded: boolean;
}

const SideNav: React.FC<SidenavProps> = ({ expanded }) => {
  const location = useLocation();
  const { navitems } = useSelector((state: AppState) => state.account);
  const { databasePull } = useSelector((state: AppState) => state.databases);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(showPages());
  }, [dispatch]);

  const handleQuickConfig = () => {
    if (!databasePull) {
      dispatch(fetchKeepDatabases());
    }
    dispatch(toggleQuickConfigDrawer());
  };

  return (
    <NavList>
      <ListItemButton className={expanded ? 'expandSeparator' : 'collapseSeparator'} />

      {/* Overview */}
      {routes.map((route) => {
        const Icon = route.icon;
        return (
          <NavLink
            key={route.label}
            className={`full-width /${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
            to={route.uri}>
            <KeepTooltip placement="right" content={route.label} className='full-width'>
              <ListItemButton className="link-container medium-text" key={route.label}>
                <ListItemIcon className='tiny-text'>
                  <Icon className='color-text-primary' />
                </ListItemIcon>
                <ListItemText>
                  <span className="side-nav-text-link color-text-primary">
                    {route.label}
                  </span>
                </ListItemText>
              </ListItemButton>
            </KeepTooltip>
          </NavLink>
        );
      })}

      {navitems.databases &&
        databases.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label} className='full-width' id={`here ${route.label}`}>
                <ListItemButton className="link-container medium-text" key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    <Icon className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="color-text-primary">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}

      <QuickConfigButton className="quick-config full-width">
        <KeepTooltip placement="right" content="Quick Config" className='full-width'>
          <ListItemButton className="link-container medium-text" key="Quick Config" onClick={handleQuickConfig}>
            <ListItemIcon className='tiny-text'>
              <FlashOnIcon className='color-text-primary' />
            </ListItemIcon>
            <ListItemText>
            <span className="side-nav-text-link">
              Quick Config
            </span>
            </ListItemText>
          </ListItemButton>
        </KeepTooltip>
      </QuickConfigButton>

      {navitems.apps &&
        apps.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label} className='full-width'>
                <ListItemButton className={location.pathname === route.uri ? 'link-container medium-text' : 'medium-text'} key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    <Icon className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="side-nav-text-link">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}



      <Divider />

      {/* Mail is intentionally disabled pending LABS-1214 (see #698).
          The `false &&` is the feature switch; restore it to a real
          condition when the page is re-enabled. */}
      {/* eslint-disable-next-line no-constant-binary-expression */}
      {false &&
        settings.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label}>
                <ListItemButton className="link-container medium-text" key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    <Icon className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="side-nav-text-link">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}
    </NavList>
  );
};

export default SideNav;
