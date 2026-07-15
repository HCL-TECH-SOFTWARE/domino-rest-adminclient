/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { styled } from '@linaria/react';
import { useLocation } from 'react-router-dom';
import { useNavigationGuard } from '../navigation/NavigationGuardContext';
import Home from '@mui/icons-material/Home';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { ActionHeader, PageTitle, TopBanner } from '../../styles/CommonStyles';
import { LitTooltip } from '../lit-elements/LitElements';

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
                (<span
                  className='float-left huge-text color-text-primary'
                  onClick={()=>handleOnClick(2)}
                >
                  {breadcrumbTitle}
                </span>)
            }
            { pathname !== '/' &&
            <Breadcrumbs
              separator={<span className='color-text-primary'>/</span>}
              aria-label="breadcrumb"
              className="color-text-primary mt-10"
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
                <LitTooltip
                  placement="bottom"
                  content={`Back to ${location.pathname.split('/')[1].charAt(0).toUpperCase() + location.pathname.split('/')[1].slice(1)} Management Page`}
                >
                  <span
                    className={`color-text-primary${location.pathname.split('/').length === 2 ? ' weight-600' : ''}`}
                    onClick={()=>handleOnClick(2)}
                  >
                    {breadcrumbTitle}
                  </span>
                </LitTooltip>
              )}

              {location.pathname.split('/').length === 3 && (
                <span
                  className={`color-text-primary${location.pathname.split('/').length === 3 ? ' weight-600 nowrap' : ''}`}
                >
                  {location.pathname.split('/')[2].charAt(0).toUpperCase() + location.pathname.split('/')[2].slice(1)}
                </span>
              )}

              {location.pathname.split('/').length >= 4 && (
                <LitTooltip
                  placement="bottom"
                  content={`Go to ${location.pathname.split('/')[3]} Forms`}
                >
                  <span
                    className={`color-text-primary${location.pathname.split('/').length === 4 ? ' weight-600 nowrap' : ''}`}
                    onClick={()=>handleOnClick(4)}
                  >
                    {location.pathname.split('/')[3]}
                  </span>
                </LitTooltip>
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
