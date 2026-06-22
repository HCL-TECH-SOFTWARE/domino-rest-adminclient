/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import { useNavigationGuard } from '../navigation/NavigationGuardContext';
import Home from '@mui/icons-material/Home';
import { useSelector } from 'react-redux';
import StorageIcon from '@mui/icons-material/Storage';
import ApplicationIcon from '@mui/icons-material/Apps';
import ScopeIcon from '@mui/icons-material/Album';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { ActionHeader, PageTitle, TopBanner } from '../../styles/CommonStyles';

const BreadcrumbRouterContainer = styled.div<{ theme: string }>`
  .home-icon {
    color: ${(props) => getTheme(props.theme).textColorPrimary} !important;
    font-size: 18px !important;
    margin-right: 5px;
    display: 'flex';
    alignItems:'center'
  }

  .MuiBreadcrumbs-root {
    background-color: transparent !important;
    .MuiBreadcrumbs-li {
      cursor: pointer;

      p {
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      svg {
        color: white;
      }
    }
  }

  .MuiSvgIcon-root {
    font-size: 16px;
  }
`;

const BreadcrumbRouter: React.FC = () => {
  const location = useLocation();
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { guardedNavigate } = useNavigationGuard();
  const { pathname } = location;

  const activeColor = getTheme(themeMode).breadcrumb.lastActiveColor;
  const pathnameArr = pathname && pathname.split('/');
  let breadcrumbTitle;
  if (pathname.startsWith('/schema')) {
    breadcrumbTitle = 'Schemas';
  } else if (pathname === '/scope') {
    breadcrumbTitle = 'Scopes';
  } else if (pathname.slice(0, 5) === '/apps') {
    breadcrumbTitle = 'Application Management';
  } else {
    breadcrumbTitle = 'HCL Domino REST API Administrator';
  }

  const handleOnClick = (index: number) => {
    if (index > 2) guardedNavigate(`/schema/${pathnameArr[2]}/${pathnameArr[index-1]}`);
    else guardedNavigate('/schema');
  };

  return (
    <BreadcrumbRouterContainer theme={themeMode}>
      <ActionHeader>
        <PageTitle>
          <TopBanner>
            { pathname === '/' &&
                (<span style={{ float: 'left', fontSize: '24px', color: getTheme(themeMode).textColorPrimary }}
                onClick={()=>handleOnClick(2)}
                >
                  {breadcrumbTitle}
                </span>)
            }
            { pathname !== '/' &&
            <Breadcrumbs
              style={{color: getTheme(themeMode).textColorPrimary, marginTop: '10px'}}
              separator={<span style={{ color: getTheme(themeMode).textColorPrimary }}>/</span>}
              aria-label="breadcrumb"
              className="routing"
            >
              <span
                className="color-text-primary flex items-center"
                data-testid="overview"
                onClick={() => {
                  guardedNavigate(`/`);
                }}
              >
                <Home className="home-icon" />
                Overview
              </span>
              {location.pathname.split('/').length > 1 && (
                <Tooltip
                  enterDelay={700}
                  placement="bottom"
                  title={`Back to ${location.pathname.split('/')[1].charAt(0).toUpperCase() + location.pathname.split('/')[1].slice(1)} Management Page`}
                  arrow
                >
                  <span
                    className={`color-text-primary${location.pathname.split('/').length === 2 ? ' weight-600' : ''}`}
                    style={location.pathname.split('/').length === 2 ? { color: activeColor } : {}}
                    onClick={()=>handleOnClick(2)}
                  >
                    {breadcrumbTitle}
                  </span>
                </Tooltip>
              )}

              {location.pathname.split('/').length === 3 && (
                <span
                  className={`color-text-primary${location.pathname.split('/').length === 3 ? ' weight-600 nowrap' : ''}`}
                  style={location.pathname.split('/').length === 3 ? { color: activeColor } : {}}
                >
                  {location.pathname.split('/')[2].charAt(0).toUpperCase() + location.pathname.split('/')[2].slice(1)}
                </span>
              )}

              {location.pathname.split('/').length >= 4 && (
                <Tooltip
                  enterDelay={700}
                  placement="bottom"
                  title={`Go to ${location.pathname.split('/')[3]} Forms`}
                  arrow
                >
                  <span
                    className={`color-text-primary${location.pathname.split('/').length === 4 ? ' weight-600 nowrap' : ''}`}
                    style={location.pathname.split('/').length === 4 ? { color: activeColor } : {}}
                    onClick={()=>handleOnClick(4)}
                  >
                    {location.pathname.split('/')[3]}
                  </span>
                </Tooltip>
              )}

              {location.pathname.split('/').length === 5 && (
                <span
                  className={`color-text-primary${location.pathname.split('/').length === 5 ? ' weight-600' : ''}`}
                >
                  {location.pathname.split('/')[5]}
                </span>
              )}

              {location.pathname.split('/').length === 6 && (
                <span
                  className={`color-text-primary${location.pathname.split('/').length === 6 ? ' weight-600 nowrap' : ''}`}
                  style={location.pathname.split('/').length === 6 ? { color: activeColor } : {}}
                >
                  {`${decodeURIComponent(location.pathname.split('/')[4])} Access Mode`}
                </span>
              )}
            </Breadcrumbs>
            }
          </TopBanner>
        </PageTitle>
      </ActionHeader>
    </BreadcrumbRouterContainer>
  );
};

export default BreadcrumbRouter;
