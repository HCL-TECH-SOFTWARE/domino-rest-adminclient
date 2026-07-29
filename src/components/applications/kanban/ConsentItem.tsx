/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { styled } from '@linaria/react';
import { Box, Collapse } from '@mui/material';
import { AppState } from '../../../store';
import { toggleDeleteConsent } from '../../../store/consents/action';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { Consent } from '../../../store/consents/types';
import { KeepTooltip } from '../../keep-elements/KeepElements';
import { useAppDispatch } from '../../../store/hooks';

const Row = styled.tr`
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
    font-size: var(--wa-font-size-m);
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
    border-radius: var(--wa-border-radius-m);
    padding: 10px;
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .scope {
    border-radius: 20px;
    padding: 5px 10px;
    background-color: var(--keep-surface-highlight);
  }
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
  const { users } = useSelector((state: AppState) => state.users)
  const dispatch = useAppDispatch()

  // Show delete consent dialog when clicking the Revoke
  

  const handleClickRevoke = () => {
    const appName = apps.find((app: any) => app.appId === consent.client_id)?.appName || '';
    const user = consent.username;
    const scope = consent.scope;
    dispatch(toggleDeleteConsent(consent.unid, appName, user, scope));
  }

  const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
  const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
                    ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress :
                    consent.username
  const app = apps.find((app: any) => app.appId === consent.client_id)
  const expirationPast = new Date(consent.code_expires_at).getTime() - new Date().getTime()
  const tokenExpirationPast = new Date(consent.refresh_token_expires_at).getTime() - new Date().getTime()
  const consentScopes = consent.scope.split(",")

  useEffect(() => {
    setShowDetails(expand)
  }, [expand])
  
  return (
    (
        <>
            <Row>
                <td className='expand off-border'>
                    {!showDetails &&
                    <button
                      onClick={() => {setShowDetails(true)}}
                      className='no-background no-border cursor-pointer m-0 p-0'
                    >
                      <ExpandMoreIcon />
                    </button>}
                    {showDetails &&
                    <button
                      onClick={() => {setShowDetails(false)}}
                      className='no-background no-border cursor-pointer m-0 p-0'
                    >
                      <ExpandLessIcon />
                    </button>}
                </td>
                <td className='user off-border'>{username}</td>
                <td className='app-name off-border'>{app ? app.appName : "-"}</td>
                <td className='expiration exp-content off-border'>
                    <Box className='exp-row'>
                        <KeepTooltip content={expirationPast > 0 && expirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <circle cx="4.5" cy="4.5" r="4.5" fill={expirationPast < 0 ? '#C3335F' : expirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                            </svg>
                        </KeepTooltip>
                        <span className='small-text text-bold'>Expiration:</span>
                        <span className='small-text'>
                          {`${new Date(consent.code_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.code_expires_at).toUTCString() : "-"}`}
                        </span>
                    </Box>
                    <Box className='exp-row'>
                        <KeepTooltip content={tokenExpirationPast > 0 && tokenExpirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <circle cx="4.5" cy="4.5" r="4.5" fill={tokenExpirationPast < 0 ? '#C3335F' : tokenExpirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                            </svg>
                        </KeepTooltip>
                        <span className='small-text text-bold'>Token Expiration:</span>
                        <span className='small-text'>
                          {`${new Date(consent.refresh_token_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.refresh_token_expires_at).toUTCString() : "-"}`}
                        </span>
                    </Box>
                </td>
                <td className='off-border'>
                  <button
                    onClick={handleClickRevoke}
                    className='revoke no-background no-border cursor-pointer m-0 p-0'
                  >
                    Revoke
                  </button>
                </td>
            </Row>
            <Row>
                <td colSpan={5}>
                    <Collapse in={showDetails} timeout="auto" unmountOnExit>
                        <UrlContainer>
                            <span><b>URL:</b></span>
                            <a href={consent.redirect_uri} target='_blank' rel='noreferrer' className='value'>{consent.redirect_uri}</a>
                        </UrlContainer>
                        <UrlContainer className='flex-col'>
                            <span><b>Scopes</b></span>
                            <Box className='scope-box'>
                              {consentScopes.map((scope) =>
                                <text key={scope} className='scope'>{scope}</text>
                              )}
                            </Box>
                        </UrlContainer>
                    </Collapse>
                </td>
            </Row>
      </>
    )
  );
}

export default ConsentItem