/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Box, ButtonBase, Collapse, TableCell, TableRow, Tooltip, Typography } from '@material-ui/core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { AppProp } from '../../store/applications/types';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { getTheme } from '../../store/styles/action';

const StyledTableRow = styled(TableRow)`
  .app-name {
    display: flex;
    flex-direction: row;
    gap: 10px;
    width: 100%;
  }

  .exp-row {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
  }

  .text {
    font-size: 14px;
  }

  .revoke {
    color: #AA1F51;
  }

  .off-border {
    border-bottom: 0;
  }
`

const UrlContainer = styled(Box)`
  padding: 0 20px;
  display: flex;
  gap: 5px;

  .scope-box {
    border: 1px solid #B9B9B9;
    border-radius: 5px;
    padding: 10px;
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .scope {
    border-radius: 20px;
    padding: 5px 10px;
    background-color: #E6EBF5;
  }
`

const AppNameContainer = styled(Box)`
    display: flex;
    flex-direction: row;
    gap: 10px;
    width: 100%;
    align-items: center;

    .status-container {
        display: flex;
        gap: 5px;
        border-radius: 3px;
        background: #A1E596;
        font-color: #000;
        flex-direction: row;
        align-items: center;
        width: fit-content;
        font-size: 10px;
        padding: 0 5px;
    }

    .inactive {
        background: #E6EBF5;
        font-color: #6C7882;
    }
`

const AppIdSecretContainer = styled(Box)`
    display: flex;
    flex-direction: row;
    gap: 5px;
`

const AppImage = styled.img`
  margin-top: 8px;
  background: #D9D9D9;
  border-radius: 8px;
  padding: 6px;
  height: 40px !important;
`;

interface AppItemProps {
  app: AppProp;
}

const AppItem: React.FC<AppItemProps> = ({
  app,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { apps } = useSelector((state: AppState) => state.apps)
  const { scopes } = useSelector((state: AppState) => state.databases)
  const { users } = useSelector((state: AppState) => state.users)
  const dispatch = useDispatch()
  const { themeMode } = useSelector((state: AppState) => state.styles)

  const launch = () => {
    window.open(app.appStartPage)
  }

//   const scope = scopes.find((scope: any) => scope.apiName === consent.scope)

  // Show delete consent dialog when clicking the Revoke button
//   const handleClickRevoke = () => {
//     dispatch(toggleDeleteConsent(consent.unid));
//   }

//   const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
//   const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
//                     ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress :
//                     consent.username
//   const app = apps.find((app: any) => app.appId === consent.client_id)
//   const expirationPast = new Date(consent.code_expires_at).getTime() - new Date().getTime()
//   const tokenExpirationPast = new Date(consent.refresh_token_expires_at).getTime() - new Date().getTime()
//   const consentScopes = consent.scope.split(",")

//   useEffect(() => {
//     setShowDetails(expand)
//   }, [expand])

  
  return (
    (
        <>
            <StyledTableRow>
                <TableCell className='expand'>
                    {/* {!showDetails && <ButtonBase onClick={() => {setShowDetails(true)}}><ExpandMoreIcon /></ButtonBase>}
                    {showDetails && <ButtonBase onClick={() => {setShowDetails(false)}}><ExpandLessIcon /></ButtonBase>} */}
                    {app.appStatus === 'isActive' && <Tooltip title={`Launch ${app.appName}`} arrow>
                        <ButtonBase onClick={launch}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" fill="white"/>
                                <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#5E1EBE" stroke="#5E1EBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </ButtonBase>
                    </Tooltip>}
                    {app.appStatus === 'disabled' && <Tooltip title="This application is inactive." arrow>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" fill="white"/>
                            <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#A5AFBE" stroke="#A5AFBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </Tooltip>}
                </TableCell>
                <TableCell className='app-name'>
                    <AppNameContainer>
                        <AppImage
                            src={`data:image/svg+xml;base64, ${appIcons[app.appIcon]}`}
                            alt="db-icon"
                            style={{
                                color: getTheme(themeMode).hoverColor
                            }}
                        />
                        <Box style={{ flexDirection: 'column' }}>
                            <Typography className='text'>{app.appName}</Typography>
                            <Box className={`status-container ${app.appStatus === 'isActive' ? '' : 'inactive'}`}>
                                <svg width="5" height="5" viewBox="0 0 5 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="2.5" cy="2.5" r="2.5" fill={app.appStatus === 'isActive' ? '#003122' : '#6C7882'}/>
                                </svg>
                                <Typography
                                    style={{ fontSize: '12px', color: `${app.appStatus === 'isActive' ? '#000' : '#6C7882'}` }}
                                >
                                    {app.appStatus === 'isActive' ? "Active" : "Inactive"}
                                </Typography>
                            </Box>
                        </Box>
                    </AppNameContainer>
                </TableCell>
                <TableCell className='expiration exp-content'>
                    <Box>
                        {/* <Tooltip title={expirationPast > 0 && expirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <circle cx="4.5" cy="4.5" r="4.5" fill={expirationPast < 0 ? '#C3335F' : expirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                            </svg>
                        </Tooltip> */}
                        <AppIdSecretContainer>
                            <Typography className='text'>App ID:</Typography>
                            <Typography className='text' style={{ color: '#656565' }}>{app.appId}</Typography>
                        </AppIdSecretContainer>
                        <AppIdSecretContainer>
                            <Typography className='text'>App Secret: {app.appSecret}</Typography>
                            {!app.appHasSecret && <ButtonBase>
                                <Typography className='text' style={{ color: '#2873F0' }}>Click to Generate Secret</Typography>
                            </ButtonBase>}
                        </AppIdSecretContainer>
                    </Box>
                </TableCell>
                <TableCell>
                    <Typography className='text'>{app.appDescription}</Typography>
                </TableCell>
                <TableCell><ButtonBase className='revoke'>Revoke</ButtonBase></TableCell>
            </StyledTableRow>
            {/* <StyledTableRow>
                <TableCell colSpan={5}>
                    <Collapse in={showDetails} timeout="auto" unmountOnExit>
                        <UrlContainer>
                            <span><b>URL:</b></span>
                            <a href={consent.redirect_uri} target='_blank' rel='noreferrer' className='value'>{consent.redirect_uri}</a>
                        </UrlContainer>
                        <UrlContainer style={{ flexDirection: 'column' }}>
                            <span><b>Scopes</b></span>
                            <Box className='scope-box'>
                              {consentScopes.map((scope) =>
                                <text key={scope} className='scope'>{scope}</text>
                              )}
                            </Box>
                        </UrlContainer>
                    </Collapse>
                </TableCell>
            </StyledTableRow> */}
      </>
    )
  );
}

export default AppItem