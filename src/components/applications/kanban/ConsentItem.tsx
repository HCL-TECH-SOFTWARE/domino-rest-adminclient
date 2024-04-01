/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Box, ButtonBase, Collapse, TableCell, TableRow, Tooltip, Typography } from '@material-ui/core';
import { AppState } from '../../../store';
import { toggleDeleteConsent } from '../../../store/consents/action';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { SchemaDBImage } from '../../schemas/SchemaStyles';
import appIcons from '../../../styles/app-icons';
import { getTheme } from '../../../store/styles/action';
import { Consent } from '../../../store/consents/types';

const StyledTableRow = styled(TableRow)`
  .exp-content {
    display: flex;
    flex-direction: column;
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

const AppDetailContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  border: 1px solid black;
  border-radius: 10px;
  padding: 10px 10px;
  margin: 5px 0 10px 0;

  .details-box {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .app-icon {
    width: 30%;
    height: fit-content;
  }

  .scope-name {
    width: 70%;
  }

  .scope-description {
    width: 100%;
    display: flex;
    height: fit-content;
    padding-top: 5px;
  }
`

const UrlContainer = styled(Box)`
  padding: 0 20px;
  display: flex;
  gap: 5px;
`

interface ConsentItemProps {
  consent: Consent;
  expand: boolean;
}

const ConsentItem: React.FC<ConsentItemProps> = ({
  consent,
  expand,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { apps } = useSelector((state: AppState) => state.apps)
  const { scopes } = useSelector((state: AppState) => state.databases)
  const { themeMode } = useSelector((state: AppState) => state.styles)
  const { users } = useSelector((state: AppState) => state.users)
  const dispatch = useDispatch()

  const scope = scopes.find((scope: any) => scope.apiName === consent.scope)
  const iconName = scope?.iconName

  // Show delete consent dialog when clicking the Revoke button
  const handleClickRevoke = () => {
    dispatch(toggleDeleteConsent(consent.unid));
  }

  const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
  const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
                    ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress :
                    consent.username
  const app = apps.find((app: any) => app.appId === consent.client_id)
  const expirationPast = new Date(consent.code_expires_at).getTime() - new Date().getTime()
  const tokenExpirationPast = new Date(consent.refresh_token_expires_at).getTime() - new Date().getTime()

  useEffect(() => {
    setShowDetails(expand)
  }, [expand])
  
  return (
    (
        <>
            <StyledTableRow>
                <TableCell className='expand off-border'>
                    {!showDetails && <ButtonBase onClick={() => {setShowDetails(true)}}><ExpandMoreIcon /></ButtonBase>}
                    {showDetails && <ButtonBase onClick={() => {setShowDetails(false)}}><ExpandLessIcon /></ButtonBase>}
                </TableCell>
                <TableCell className='user off-border'>{username}</TableCell>
                <TableCell className='app-name off-border'>{app ? app.appName : "-"}</TableCell>
                <TableCell className='expiration exp-content off-border'>
                    <Box className='exp-row'>
                        <Tooltip title={expirationPast > 0 && expirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <circle cx="4.5" cy="4.5" r="4.5" fill={expirationPast < 0 ? '#C3335F' : expirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                            </svg>
                        </Tooltip>
                        <Typography className='text'>Expiration:</Typography>
                        <Typography className='text'>{`${new Date(consent.code_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.code_expires_at).toUTCString() : "-"}`}</Typography>
                    </Box>
                    <Box className='exp-row'>
                        <Tooltip title={tokenExpirationPast > 0 && tokenExpirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <circle cx="4.5" cy="4.5" r="4.5" fill={tokenExpirationPast < 0 ? '#C3335F' : tokenExpirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                            </svg>
                        </Tooltip>
                        <Typography className='text'>Token Expiration:</Typography>
                        <Typography className='text'>{`${new Date(consent.refresh_token_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.refresh_token_expires_at).toUTCString() : "-"}`}</Typography>
                    </Box>
                </TableCell>
                <TableCell className='off-border'><ButtonBase onClick={handleClickRevoke} className='revoke'>Revoke</ButtonBase></TableCell>
            </StyledTableRow>
            <StyledTableRow>
                <TableCell colSpan={5}>
                    <Collapse in={showDetails} timeout="auto" unmountOnExit>
                        {/* <AppDetailContainer>
                            <Box className='details-box'>
                                <Box className='app-icon'>
                                    {!!iconName && <SchemaDBImage
                                    src={`data:image/svg+xml;base64, ${
                                        appIcons[iconName]
                                    }`}
                                    alt="db-icon"
                                    style={{
                                        color: getTheme(themeMode).hoverColor,
                                        width: '98px',
                                        height: '98px',
                                    }}
                                    />}
                                </Box>
                                <Box className='scope-name'>
                                    <Typography style={{ fontWeight: 'bold' }}>{consent.scope}</Typography>
                                </Box>
                            </Box>
                            <Box className='scope-description'>
                                <span className='value'>{consent.scope_description}</span>
                            </Box>
                        </AppDetailContainer> */}
                        <UrlContainer>
                            <span><b>URL:</b></span>
                            <a href={consent.redirect_uri} target='_blank' rel='noreferrer' className='value'>{consent.redirect_uri}</a>
                        </UrlContainer>
                        <UrlContainer>
                            <span><b>Scope Name:</b></span>
                            <text>{consent.scope}</text>
                        </UrlContainer>
                    </Collapse>
                </TableCell>
            </StyledTableRow>
      </>
    )
  );
}

export default ConsentItem