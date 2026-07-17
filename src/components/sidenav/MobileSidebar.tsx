/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';
import { NavLink, useLocation } from 'react-router-dom';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { appRoutes as routes, apps, groups, people } from './Routes';
import { IMG_DIR, BUILD_VERSION } from '../../config.dev';
import { getTheme } from '../../store/styles/action';
import { AppState } from '../../store';
import { fetchKeepDatabases } from '../../store/databases/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { SideNavContainer } from '../../styles/CommonStyles';
import { LitTooltip } from '../lit-elements/LitElements';

const SideContainer = styled.aside`
  background: white;
  position: relative;
  height: calc(100vh - 56px);
  z-index: 100;
`;

const QuickConfigButton = styled.div``;

const SidebarContainer = styled(List)<{ theme: string }>`
  a {
    display: block;
    text-decoration: none !important;
    color: #82cafa;
  }

  .route-active {
    .link-container {
      border-left: 4px solid KEEP_ADMIN_BASE_COLOR;

      background: #addfff;

      .text-link {
        margin-left: -4px;
        color: ${(props) => getTheme(props.theme).hoverColor || '#C5C5C5'} !important;
        font-size: 20px;
      }
      .keep-icon {
        width: 30px;
      }

      svg {
        margin-left: -4px;
        color: ${(props) => getTheme(props.theme).hoverColor || '#C5C5C5'} !important;
        font-size: 20px;
        cursor: pointer;
        font-weight: 800;
      }
    }
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

const MobileSidebar: React.FC<SidenavProps> = ({ open, toggleMenu }) => {
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
          open: open,
          close: !open
        })}>
        <LinksContainer>
          <SidebarContainer theme={themeMode}>
            <Logo>
              <img src={`${IMG_DIR}/KeepNewIcon.png`} alt="HCL Domino REST API Icon" />
              <span className="title color-text-primary">
                HCL Domino REST API
              </span>
            </Logo>
            <ContentWrapper>
            {routes.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  onClick={toggleMenu}
                  key={route.label}
                  className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
                  to={route.uri}>
                  <LitTooltip placement="right" content={route.label}>
                    <ListItemButton className="link-container" key={route.label}>
                      <ListItemIcon>
                        <Icon className='color-text-primary big-text' />
                      </ListItemIcon>
                      <ListItemText>
                        <span className="text-link color-text-primary">
                          {route.label}
                        </span>
                      </ListItemText>
                    </ListItemButton>
                  </LitTooltip>
                </NavLink>
              );
            })}

            <QuickConfigButton className="quick-config">
              <LitTooltip placement="right" content="Quick Config">
                <ListItemButton className="link-container" key="Quick Config" onClick={handleQuickConfig}>
                  <ListItemIcon>
                    <FlashOnIcon className='color-text-primary big-text' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="text-link color-text-primary">
                      Quick Config
                    </span>
                  </ListItemText>
                </ListItemButton>
              </LitTooltip>
            </QuickConfigButton>

            {navitems.apps &&
              apps.map((route) => {
                const Icon = route.icon;
                return (
                  <NavLink
                    onClick={toggleMenu}
                    key={route.label}
                    className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
                    to={route.uri}>
                    <LitTooltip placement="right" content={route.label}>
                      <ListItemButton className="link-container" key={route.label}>
                        <ListItemIcon>
                          <Icon className='color-text-primary big-text' />
                        </ListItemIcon>
                        <ListItemText>
                          <span className="text-link color-text-primary">
                            {route.label}
                          </span>
                        </ListItemText>
                      </ListItemButton>
                    </LitTooltip>
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
                    className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
                    to={route.uri}>
                    <LitTooltip placement="right" content={route.label}>
                      <ListItemButton className="link-container" key={route.label}>
                        <ListItemIcon>
                          <Icon className='color-text-primary big-text' />
                        </ListItemIcon>
                        <ListItemText>
                          <span className="text-link color-text-primary">
                            {route.label}
                          </span>
                        </ListItemText>
                      </ListItemButton>
                    </LitTooltip>
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
                    className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
                    to={route.uri}>
                    <LitTooltip placement="right" content={route.label}>
                      <ListItemButton className="link-container" key={route.label}>
                        <ListItemIcon>
                          <Icon className='color-text-primary big-text' />
                        </ListItemIcon>
                        <ListItemText>
                          <span className="text-link color-text-primary">
                            {route.label}
                          </span>
                        </ListItemText>
                      </ListItemButton>
                    </LitTooltip>
                  </NavLink>
                );
              })}
            </ContentWrapper>
            <Copyright>
              <span className="tiny-text color-text-primary">
                {`© ${new Date().getFullYear()}. HCL Software - Build ${BUILD_VERSION}`}
              </span>
            </Copyright>
          </SidebarContainer>
        </LinksContainer>
      </SideContainer>
    </SideNavContainer>
  );
};

export default MobileSidebar;
