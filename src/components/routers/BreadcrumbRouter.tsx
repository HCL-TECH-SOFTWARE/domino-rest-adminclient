/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import { useLocation, useHistory } from 'react-router-dom';
import Tooltip from '@material-ui/core/Tooltip';
import Home from '@material-ui/icons/Home';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { ActionHeader, PageTitle, TopBanner } from '../../styles/CommonStyles';

const BreadcrumbRouterContainer = styled.div<{ theme: string }>`
  .home-icon {
    color: #212121 !important;
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
  const history = useHistory();
  const { pathname } = history.location;

  const activeColor = getTheme(themeMode).breadcrumb.lastActiveColor;
  const pathnameArr = pathname && pathname.split('/');
  let breadcrumbTitle;
  if (pathname.startsWith('/schema')) {
    breadcrumbTitle = 'Schemas';
  } else if (pathname === '/scope') {
    breadcrumbTitle = 'Scopes';
  } else if (pathname === '/apps') {
    breadcrumbTitle = 'Application Management';
  } else {
    breadcrumbTitle = 'HCL Domino REST API Administrator';
  }

  const handleOnClick = (index: number) => {
    if (index > 2) history.push(`/schema/${pathnameArr[2]}/${pathnameArr[index-1]}`);
    else history.push('/schema');
  };

  return (
    <BreadcrumbRouterContainer theme={themeMode}>
      <ActionHeader>
        <PageTitle>
          <TopBanner>
            { pathname === '/' &&
                (<span style={{ float: 'left', fontSize: '24px', color: 'black' }}
                onClick={()=>handleOnClick(2)}
                >
                  {breadcrumbTitle}
                </span>)
            }
            { pathname !== '/' &&
            <Breadcrumbs
              style={{color: 'black', marginTop: '10px'}}
              separator="/"
              aria-label="breadcrumb"
              className="routing"
            >
              <Typography
                color="textPrimary"
                data-testid="overview"
                style={{display: 'flex', alignItems:'center'}}
                onClick={() => {
                  history.push(`/`);
                }}
              >
                <Home className="home-icon" />
                Overview
              </Typography>
              {location.pathname.split('/').length > 1 && (
                <Tooltip
                  enterDelay={700}
                  placement="bottom"
                  title="Back to list of Schema/Scope Management Page"
                  arrow
                >
                  <Typography
                    color="textPrimary"
                    style={
                      location.pathname.split('/').length === 2
                        ? { fontWeight: 600, color: activeColor }
                        : {}
                    }
                    onClick={()=>handleOnClick(2)}
                  >
                    {breadcrumbTitle}
                  </Typography>
                </Tooltip>
              )}

              {location.pathname.split('/').length >= 4 && (
                <Tooltip
                  enterDelay={700}
                  placement="bottom"
                  title={`Go to ${location.pathname.split('/')[3]} Forms`}
                  arrow
                >
                  <Typography
                    color="textPrimary"
                    onClick={()=>handleOnClick(4)}
                    style={
                      location.pathname.split('/').length === 4
                        ? { fontWeight: 600, color: activeColor, whiteSpace: 'nowrap'}
                        : {}
                    }
                  >
                    {location.pathname.split('/')[3]}
                  </Typography>
                </Tooltip>
              )}

              {location.pathname.split('/').length === 5 && (
                <Typography
                  color="textPrimary"
                  style={{
                    fontWeight:
                      location.pathname.split('/').length === 5 ? 600 : 'normal'
                  }}
                >
                  {location.pathname.split('/')[5]}
                </Typography>
              )}

              {location.pathname.split('/').length === 6 && (
                <Typography
                  color="textPrimary"
                  style={
                    location.pathname.split('/').length === 6
                      ? { fontWeight: 600, color: activeColor, whiteSpace: 'nowrap'}
                      : {}
                  }
                >
                  {`${decodeURIComponent(location.pathname.split('/')[4])} Access Mode`}
                </Typography>
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
