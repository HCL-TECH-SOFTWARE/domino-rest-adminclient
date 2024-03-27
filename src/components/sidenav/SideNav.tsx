/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

  import React, { useEffect } from 'react';
  import styled from 'styled-components';
  import { NavLink, useLocation } from 'react-router-dom';
  import clsx from 'clsx';
  import { useDispatch, useSelector } from 'react-redux';
  import Typography from '@material-ui/core/Typography';
  import List from '@material-ui/core/List';
  import ListItem from '@material-ui/core/ListItem';
  import ListItemIcon from '@material-ui/core/ListItemIcon';
  import ListItemText from '@material-ui/core/ListItemText';
  import Tooltip from '@material-ui/core/Tooltip';
  import Divider from '@material-ui/core/Divider';
  import FlashOnIcon from '@material-ui/icons/FlashOn';
  import { getTheme } from '../../store/styles/action';
  import { fetchKeepDatabases } from '../../store/databases/action';
  import { AppState } from '../../store';
  import {
    appRoutes as routes,
    apps,
    databases,
    groups,
    people,
    settings,
  } from './Routes';
  import ProfileMenu from './ProfileMenu';
  import ProfileMenuDialog from './ProfileMenuDialog';
  import { IMG_DIR } from '../../config.dev';
  import { showPages } from '../../store/account/action';
  import { toggleQuickConfigDrawer } from '../../store/drawer/action';

  const SideContainer = styled.aside<{ theme: string }>`
    height: calc(100vh - 23px);
    border-right: 1px solid ${(props) => getTheme(props.theme).sidenav.border};
    background-image: ${(props) => getTheme(props.theme).sidenav.background};
    display: flex;
    flex-direction: column;
    overflow-y: auto;
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
    .keep-icon {
      width: 37px;
      margin-top: 30px;
    }
    .toggle-sidebar {
      margin-bottom: 10px;
    }
    a {
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
      .link-container, .quick-config, .consent-list {
        border-left: 3px solid ${(props) => getTheme(props.theme).sidenav.border};
        background: ${(props) => getTheme(props.theme).sidenav.active};
        .text-link {
          margin-left: -4px;
          color: ${(props) => getTheme(props.theme).sidenav.activeTextColor} !important;
          font-size: 16px;
          font-weight: 400;
        }
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

  const Logo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
    cursor: pointer;
  `;

  const Proflie = styled.div`
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

  const QuickConfigButton = styled.div`

  `;

  interface SidenavProps {
    classes: any;
    open: boolean;
    toggleMenu: () => void;
  }

  const SideNav: React.FC<SidenavProps> = ({ classes, open, toggleMenu }) => {
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
      <SideContainer
        className={clsx(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open
        })}
        theme={themeMode}
      >
        <SidebarContainer theme={themeMode}>
          <Logo onClick={() => {
                    window.location.href = window.location.origin;
                  }}>
            <img
              className="keep-icon"
              src={`${IMG_DIR}/KeepNewIcon.png`}
              alt="HCL Domino REST API Icon"
            />
          </Logo>
          {open && (
            <KeepAdmin>
              <Typography className="title" style={{color:getTheme(themeMode).sidenav.textColor}}>
                HCL Domino REST API
              </Typography>
            </KeepAdmin>
          )}

          <ListItem className={open ? 'expandSeparator' : 'collapseSeparator'}
          >
          </ListItem>

          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <NavLink
                key={route.label}
                exact
                className={
                  `/${location.pathname.split('/')[1]}` === `${route.uri}`
                    ? 'route-active'
                    : ''
                }
                to={route.uri}
              >
                <Tooltip
                  enterDelay={700}
                  placement="right"
                  title={route.label}
                  arrow
                >
                  <ListItem className="link-container" button key={route.label}>
                    <ListItemIcon>
                      <Icon
                        style={{
                          color: getTheme(themeMode).sidenav.iconColor,
                          fontSize: 19
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText>
                      <Typography className="text-link" color="textPrimary">
                        {route.label}
                      </Typography>
                    </ListItemText>
                  </ListItem>
                </Tooltip>
              </NavLink>
            );
          })}

          {navitems.databases &&
            databases.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color: getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })}

          <QuickConfigButton
            className="quick-config">
            <Tooltip
              enterDelay={700}
              placement="right"
              title="Quick Config"
              arrow
            >
              <ListItem className="link-container" button key="Quick Config"
              onClick={handleQuickConfig}>
                <ListItemIcon>
                  <FlashOnIcon
                    style={{
                      color: getTheme(themeMode).sidenav.iconColor,
                      fontSize: 19
                    }}
                  />
                </ListItemIcon>
                <ListItemText>
                  <Typography className="text-link" style={{color: getTheme(themeMode).sidenav.textColor}}>
                    Quick Config
                  </Typography>
                </ListItemText>
              </ListItem>
            </Tooltip>
          </QuickConfigButton>

          {navitems.apps &&
            apps.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color: getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })}

          {/* {navitems.apps &&
            consents.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color: getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })} */}

          {navitems.users &&
            people.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color:getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })}

          {navitems.groups &&
            groups.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color:getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })}

          <Divider />

          {false &&
            settings.map((route) => {
              // TODO Disable Mail page for now LABS-1214
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.label}
                  exact
                  className={
                    `/${location.pathname.split('/')[1]}` === `${route.uri}`
                      ? 'route-active'
                      : ''
                  }
                  to={route.uri}
                >
                  <Tooltip
                    enterDelay={700}
                    placement="right"
                    title={route.label}
                    arrow
                  >
                    <ListItem className="link-container" button key={route.label}>
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).sidenav.iconColor,
                            fontSize: 19
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography className="text-link" style={{color:getTheme(themeMode).sidenav.textColor}}>
                          {route.label}
                        </Typography>
                      </ListItemText>
                    </ListItem>
                  </Tooltip>
                </NavLink>
              );
            })}
        </SidebarContainer>
        <Proflie>
          {open ? <ProfileMenu /> : <ProfileMenuDialog /> }
        </Proflie>
      </SideContainer>
    );
  };

  export default SideNav;
