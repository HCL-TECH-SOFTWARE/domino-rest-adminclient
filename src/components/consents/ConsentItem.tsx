/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { AppState } from '../../store';
import {
  ButtonNeutral,
  ButtonNo,
  ButtonYes,
} from '../../styles/CommonStyles';
import appIcons from '../../styles/app-icons';
import styled from 'styled-components';
import { Box, Typography } from '@material-ui/core';
import { toggleDeleteConsent } from '../../store/consents/action';
import { SchemaDBImage } from '../schemas/SchemaStyles';
import { getTheme } from '../../store/styles/action';

const ConsentListItem = styled.div`
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #B8B8B8;
  flex-direction: column;

  .row {
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
  }

  .general-details {
    flex-direction: row-reverse;
  }

  .consent-details {
    padding-top: 10px;
    display: flex;
    flex-direction: column;
  }

  .hidden {
    display: none;
  }

  .type {
    font-weight: bold;
    margin-left: 10px;
    padding: 2px 0;
    width: 30%;
    min-width: 30%;
  }

  .value {
    display: flex;
    flex-grow: 1;
    overflow-wrap: anywhere;
    min-width: calc(70% - 10px);
  }

  .name-text {
    font-size: 16px;
    flex-grow: 1;
    align-items: center;
  }

  .button {
    width: 10%;
    text-transform: none;
  }
`

const QuickConfigFormSchema = Yup.object().shape({
  schemaName: Yup.string()
    .max(256, 'Schema Name is too long (maximum is 256 characters)')
    .required('Schema Name is required.')
    .test('First Character', 'Schema Name must start with a letter', (val) => {
      // Build Issue: character must be converted to an int before the isNaN call
      let retval = true;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    }),
  scopeName: Yup.string()
    .min(4, 'Scope Name is too short (minimum is 4 characters)')
    .max(256, 'Scope Name is too long (maximum is 256 characters)')
    .required('Scope Name is required.')
    .test('First Character', 'Scope Name must begin with a letter', (val) => {
      // Build Issue: character must be converted to an int before the isNaN call
      let retval = false;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    }),
  description: Yup.string()
    .required('Please provide a short description about this schema!'),
  nsfPath: Yup.string()
    .required('Please select a database!'),
});

interface ConsentItemProps {
  consent: any;
  idx: number;
  lastItem: boolean;
}

const ConsentItem: React.FC<ConsentItemProps> = ({
  consent,
  idx,
  lastItem,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { apps } = useSelector((state: AppState) => state.apps);
  const { scopes } = useSelector((state: AppState) => state.databases);
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { users } = useSelector((state: AppState) => state.users);
  const dispatch = useDispatch();

  const app = apps.find((app: any) => app.appId === consent.client_id);
  const scope = scopes.find((scope: any) => scope.apiName === consent.scope);
  const iconName = scope?.iconName;
  const [username, setUsername] = useState(consent.username);

  const handleClickView = () => {
    setShowDetails(!showDetails);
  };

  const handleClickRevoke = (unid: string) => {
    // show delete consent dialog
    dispatch(toggleDeleteConsent(unid));
  }

  useEffect(() => {
    let allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
    allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== '' && setUsername(allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress); 
  }, [users, consent.username]);
  
  return (
    (
      <ConsentListItem className={`${idx % 2 === 0 ? '' : 'row-odd'}`} style={{ borderBottom: `${lastItem} ? 0 : 1px` }}>
        <Box className='row general-details'>
          <ButtonNo className='button' onClick={() => handleClickRevoke(consent.unid)}>Revoke</ButtonNo>
          {!showDetails && <ButtonYes className='button' onClick={handleClickView} style={{ marginRight: '5px' }}>View</ButtonYes>}
          {showDetails && <ButtonNeutral className='button' onClick={handleClickView} style={{ marginRight: '5px' }}>Hide</ButtonNeutral>}
          <Typography className='name-text'>{username}</Typography>
        </Box>
        <Box 
          className={showDetails ? 'consent-details' : 'hidden'}
          style={{ 
            opacity: `${showDetails ? 1 : 0}`, 
            transition: 'all 1s',
            visibility: showDetails ? 'visible' : 'hidden'
          }}
        >
          <Box style={{ display: 'flex', flexDirection: 'column', border: '1px solid black', borderRadius: '10px', padding: '10px 10px', margin: '5px 0 10px 0' }}>
            <Box style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Box style={{ width: '30%', height: 'fit-content' }}>
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
              <Box style={{ width: '70%' }}>
                <Typography style={{ fontWeight: 'bold' }}>
                  {consent.scope}
                </Typography>
              </Box>
            </Box>
            <Box style={{ width: '100%', display: 'flex', height: 'fit-content', paddingTop: '5px' }}>
              <span className='value'>{consent.scope_description}</span>
            </Box>
          </Box>
          <Box style={{ display: 'flex' }}>
            <span className='type'>App Name:</span>
            <span className='value'>{app ? app.appName : "-"}</span>
          </Box>
          <Box style={{ display: 'flex' }}>
            <span className='type'>URL:</span>
            <a href={consent.redirect_uri} target='_blank' rel='noreferrer' className='value'>{consent.redirect_uri}</a>
          </Box>
          <Box style={{ display: 'flex' }}>
            <span className='type'>Expiration:</span>
            <span className='value'>{`${new Date(consent.code_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.code_expires_at).toUTCString() : "-"}`}</span>
          </Box>
          <Box style={{ display: 'flex' }}>
            <span className='type'>Refresh Token Expiration:</span>
            <span className='value'>{`${new Date(consent.refresh_token_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.refresh_token_expires_at).toUTCString() : "-"}`}</span>
          </Box>
        </Box>
      </ConsentListItem>
    )
  );
}

export default ConsentItem