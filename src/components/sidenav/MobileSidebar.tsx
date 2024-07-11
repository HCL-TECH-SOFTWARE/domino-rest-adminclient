/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import { NavLink, useLocation } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import {
  appRoutes as routes,
  apps,
  databases,
  groups,
  people} from './Routes';
import { IMG_DIR, BUILD_VERSION } from '../../config.dev';
import { getTheme } from '../../store/styles/action';
import { AppState } from '../../store';
import { fetchKeepDatabases } from '../../store/databases/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { SideNavContainer } from '../../styles/CommonStyles';

const SideContainer = styled.aside`
  background: white;
  position: relative;
  height: calc(100vh - 56px);
  z-index: 100;
`;

const QuickConfigButton = styled.div`

`;

const SidebarContainer = styled(List)`
  a {
    text-decoration: none !important;
    color: #82cafa;
  }

  .route-active {
    .link-container {
      border-left: 4px solid KEEP_ADMIN_BASE_COLOR;
      // FIXME new ui: border-left: 4px solid ${(props) => getTheme(props.theme.palette.mode).sidenav.border};

      background: #addfff;
      //FIXME new ui： background: ${(props) => getTheme(props.theme.palette.mode).sidenav.active};

      .text-link {
        margin-left: -4px;
        color: ${(props) => getTheme(props.theme.palette.mode).hoverColor} !important;
        font-size: 20px;
      }
      .keep-icon {
        width: 30px;
      }

      svg {
        margin-left: -4px;
        color: ${(props) => getTheme(props.theme.palette.mode).hoverColor} !important;
        font-size: 20px;
        cursor: pointer;
        font-weight: 800;
      }
    }
  }
`;

const Logo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  column-gap: 20px;
  
  img {
    width: 40px;
  }
  
  .title {
    font-size: 1.4rem;
    font-weight: bold;
  }
`;

const LinksContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  margin-top: -50px;
`;

const Copyright = styled.div`
  margin-top: 50px;
  display: flex;
  justify-content: center;
`;


interface SidenavProps {
  open: boolean;
  toggleMenu: () => void;
}

const MobileSidebar: React.FC<SidenavProps> = ({
  open,
  toggleMenu
}) => {
  const location = useLocation();
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { databasePull } = useSelector((state: AppState) => state.databases);
  const dispatch = useDispatch();
  const { navitems } = useSelector((state: AppState) => state.account);
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
        'open': open,
        'close': !open
      })}
    >
      <LinksContainer>
        <SidebarContainer>
          <Logo>
            <img
              src={`${IMG_DIR}/KeepNewIcon.png`}
              alt="HCL Domino REST API Icon"
            />
            <Typography className="title" color="textPrimary">
              HCL Domino REST API
            </Typography>
          </Logo>
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <NavLink
                onClick={toggleMenu}
                key={route.label}
                
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
                          color: getTheme(themeMode).textColorPrimary,
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
                  onClick={toggleMenu}
                  key={route.label}
                  
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
                    <ListItem
                      className="link-container"
                      button
                      key={route.label}
                    >
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).textColorPrimary,
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
                      color: getTheme(themeMode).textColorPrimary,
                      fontSize: 19
                    }}
                  />
                </ListItemIcon>
                <ListItemText>
                  <Typography className="text-link" color="textPrimary">
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
                  onClick={toggleMenu}
                  key={route.label}
                  
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
                    <ListItem
                      className="link-container"
                      button
                      key={route.label}
                    >
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).textColorPrimary,
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

          {navitems.users &&
            people.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  onClick={toggleMenu}
                  key={route.label}
                  
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
                    <ListItem
                      className="link-container"
                      button
                      key={route.label}
                    >
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).textColorPrimary,
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

          {navitems.groups &&
            groups.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  onClick={toggleMenu}
                  key={route.label}
                  
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
                    <ListItem
                      className="link-container"
                      button
                      key={route.label}
                    >
                      <ListItemIcon>
                        <Icon
                          style={{
                            color: getTheme(themeMode).textColorPrimary,
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
          <Copyright>
            <Typography variant="caption" component="p" color="textPrimary">
              {`© ${new Date().getFullYear()}. HCL Software - Build ${BUILD_VERSION}`}
            </Typography>
          </Copyright>
        </SidebarContainer>
      </LinksContainer>
    </SideContainer>
    </SideNavContainer>
  );
};

export default MobileSidebar;
