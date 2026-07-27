/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { styled } from '@linaria/react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { getTheme } from '../../store/styles/action';
import { switchTheme } from '../../store/styles/action';
import { fetchKeepDatabases } from '../../store/databases/action';
import { AppState } from '../../store';
import { appRoutes as routes, apps, databases, groups, people, settings } from './Routes';
import ProfileMenu from './ProfileMenu';
import { showPages } from '../../store/account/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { SideNavContainer } from '../../styles/CommonStyles';
import { KeepTooltip } from '../keep-elements/KeepElements';
import keepLogo from '../../assets/KeepNewIcon.png';

const SideContainer = styled.aside<{ theme: string }>`
  width: 242px;
  flex-shrink: 0;
  white-space: nowrap;

  height: calc(100vh - 23px);
  border-right: 1px solid ${(props) => getTheme(props.theme).sidenav.border};
  background-image: ${(props) => getTheme(props.theme).sidenav.background};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  /* Clip horizontal overflow at all times so route labels and the
     profile section never peek through the rail while the width is
     animating between open (242px) and closed (57px). */
  overflow-x: hidden;
  @media only screen and (max-width: 768px) {
    display: none;
  }

  .expandSeparator {
    margin-top: 26px;
  }

  .collapseSeparator {
    margin-top: 50px;
  }
`;

const SidebarContainer = styled(List)<{ theme: string }>`
  padding-top: 10px !important;
  flex: 1;
  display: flex;
  flex-direction: column;
  /* MUI v9 reduced the default ListItemIcon min-width from 56px to
     36px (theme.spacing(4.5)). Combined with the 16px ListItemButton
     padding, route labels would start at ~52px and peek through the
     57px collapsed rail. Force the v5 spacing back so labels stay
     well outside the visible area when collapsed. */
  .MuiListItemIcon-root {
    min-width: 56px;
  }
  .keep-icon {
    width: 37px;
    margin-top: 30px;
  }
  .toggle-sidebar {
    margin-bottom: 10px;
  }
  a {
    display: block;
    text-decoration: none !important;
    .MuiTypography-colorTextPrimary {
      color: ${(props) => getTheme(props.theme).sidenav.textColor} !important;
    }
    svg {
      color: ${(props) => getTheme(props.theme).sidenav.iconColor} !important;
    }
    .MuiListItem-button:hover {
      background: ${(props) => getTheme(props.theme).sidenav.hover} !important;
    }
  }
  .active {
    .link-container,
    .quick-config,
    .consent-list {
      border-left: 3px solid ${(props) => getTheme(props.theme).sidenav.border};
      background: ${(props) => getTheme(props.theme).sidenav.active};
      svg {
        margin-left: -4px;
        color: ${(props) => getTheme(props.theme).sidenav.activeIconColor} !important;

        cursor: pointer;
        font-weight: 800;
      }
    }
  }

  .MuiDivider-root {
    height: 0;
  }
`;

const ContentWrapper = styled.div`
  flex-grow: 1;
`;

const Logo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  cursor: pointer;
`;

const Profile = styled.div`
  height: 187px;
  display: flex;
  flex-direction: column-reverse;
  justify-content: center;
`;

const KeepAdmin = styled.div`
  display: flex;
  justify-content: center;
  .title {
    font-size: 16px;
    font-weight: 700;
  }
`;

const ThemeSelectorWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 16px 0;
`;

const ThemeToggleButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  svg {
    font-size: 20px;
  }
`;

const QuickConfigButton = styled.div``;

interface SidenavProps {
  open: boolean;
  toggleMenu: () => void;
}

const SideNav: React.FC<SidenavProps> = ({ open }) => {
  const location = useLocation();
  const { navitems } = useSelector((state: AppState) => state.account);
  const { databasePull } = useSelector((state: AppState) => state.databases);
  const dispatch = useDispatch();
  const { themeMode } = useSelector((state: AppState) => state.styles);
  useEffect(() => {
    dispatch(showPages() as any);
  }, [dispatch]);

  const handleQuickConfig = () => {
    if (!databasePull) {
      dispatch(fetchKeepDatabases() as any);
    }
    dispatch(toggleQuickConfigDrawer());
  };

  return (
    <SideNavContainer>
      <SideContainer
        className={clsx('drawer', {
          open: open,
          close: !open
        })}
        // className={`drawer ${open ? 'open' : 'close'}`}
        theme={themeMode}>
        <SidebarContainer theme={themeMode}>
          <Logo
            onClick={() => {
              window.location.href = window.location.origin;
            }}>
            <img
              className="keep-icon side-nav-logo-img"
              src={keepLogo}
              alt="HCL Domino REST API Icon"
            />
          </Logo>
          {open && (
            <KeepAdmin>
              <span className="medium-text color-text-primary text-bold">
                HCL Domino REST API
              </span>
            </KeepAdmin>
          )}

          <ThemeSelectorWrapper>
            <KeepTooltip content={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} placement="right">
              <ThemeToggleButton
                onClick={() => {
                  const newTheme = themeMode === 'dark' ? 'default' : 'dark';
                  localStorage.setItem('theme', newTheme);
                  dispatch(switchTheme(newTheme));
                }}
              >
                {themeMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
              </ThemeToggleButton>
            </KeepTooltip>
          </ThemeSelectorWrapper>

          <ContentWrapper>
          <ListItemButton className={open ? 'expandSeparator' : 'collapseSeparator'}></ListItemButton>

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

          {navitems.users &&
            people.map((route) => {
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

          {navitems.groups &&
            groups.map((route) => {
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
            </ContentWrapper>
        </SidebarContainer>
        <Profile>
          <ProfileMenu open={open} />
        </Profile>
      </SideContainer>
    </SideNavContainer>
  );
};

export default SideNav;
