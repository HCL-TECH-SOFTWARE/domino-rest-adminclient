/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Box, ButtonBase, Collapse, TableCell, TableRow, Tooltip, Typography } from '@material-ui/core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { AppFormProp, AppProp } from '../../store/applications/types';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { getTheme } from '../../store/styles/action';
import { generateSecret } from '../../store/applications/action';
import { toggleAlert } from '../../store/alerts/action';
import { DeleteIcon } from '../../styles/CommonStyles';
import { FiEdit2 } from 'react-icons/fi';
import { FormikProps } from 'formik';
import { toggleApplicationDrawer } from '../../store/drawer/action';

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

  .delete-icon {
    width: 20px;
    height: 20px;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
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

    .id-secret {
      cursor: pointer;
    }
`

const OptionsContainer = styled(Box)`
    display: flex;
    flex-direction: row;
    gap: 10px;
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
  deleteApplication: (appId: string) => void;
  formik: FormikProps<any>;
}

const AppItem: React.FC<AppItemProps> = ({
  app,
  deleteApplication,
  formik,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { apps } = useSelector((state: AppState) => state.apps)
  const { scopes } = useSelector((state: AppState) => state.databases)
  const { users } = useSelector((state: AppState) => state.users)
  const dispatch = useDispatch()
  const { themeMode } = useSelector((state: AppState) => state.styles)

  const [generating, setGenerating] = useState(false)
  const [appSecret, setAppSecret] = useState('')
  const appSecretTextRef = useRef(null) as any

  const launch = () => {
    window.open(app.appStartPage)
  }

  const handleClickGenerate = () => {
    dispatch(generateSecret(app.appId, app.appStatus, setGenerating, setAppSecret) as any)
  }

  const handleKeyPress = (e: any, callback: any, focus?: boolean) => {
    if (e.key === "Enter") {
      callback();
    }
  }

  const copyToClipboard = (current: any) => {
    const clipValue = current?.currentTarget?.innerText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(clipValue);
      dispatch(toggleAlert(`Copied ${clipValue} to clipboard`));
    } else {
      dispatch(toggleAlert(`Failed to copy to clipboard. Please copy by yourself: ${clipValue} `));
    }
  }

  const viewEdit = () => {
    let formData: AppFormProp = {
      appId: app.appId,
      appName: app.appName,
      appDescription: app.appDescription,
      appStartPage: app.appStartPage,
      appStatus: app.appStatus === 'isActive',
      appScope: app.appScope,
      appIcon: app.appIcon,
      appHasSecret: app.appHasSecret ? true : false,
      appSecret: app.appSecret,
      appCallbackUrlsStr: '',
      appContactsStr: ''
    };

    if (app.appStartPage != null && app.appStartPage.length > 0) {
      formData.appStartPage = app.appStartPage
        .replace(/\s+/g, '');
    }
    formData.appStatus = app.appStatus === 'isActive';

    if (app.appCallbackUrls != null && app.appCallbackUrls.length > 0) {
      formData.appCallbackUrlsStr = ([] as Array<string>).concat(app.appCallbackUrls).sort(
        (a,b) => a.localeCompare(b)
      ).join('\n');
    }
    if (app.appContacts != null && app.appContacts.length > 0) {
      formData.appContactsStr = ([] as Array<string>).concat(app.appContacts).sort(
        (a,b) => a.localeCompare(b)
      ).join('\n');
    }

    // Save values and open the form
    formik.setValues(formData);
    dispatch(toggleApplicationDrawer());
  }

  // console.log(app)
  // console.log("app secret:", appSecret)

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
                    <AppIdSecretContainer>
                      <Typography className='text'>App ID:</Typography>
                      <Tooltip 
                        title="Copy App Id" 
                        arrow 
                        tabIndex={1} 
                        onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}}
                      >
                        <Typography
                          className='text id-secret'
                          style={{ color: '#656565' }}
                          onClick={copyToClipboard}
                        >
                          {app.appId}
                        </Typography>
                      </Tooltip>
                    </AppIdSecretContainer>
                    <AppIdSecretContainer>
                      <Typography className='text'>App Secret:</Typography>
                      {app.appHasSecret ? <Typography className='text' style={{ color: '#505050' }}>This app has an app secret configured.</Typography> :
                        appSecret.length === 0 ? <ButtonBase onClick={handleClickGenerate}>
                          <Typography className='text' style={{ color: '#2873F0' }}>Click to Generate Secret</Typography>
                        </ButtonBase>
                          : <Tooltip 
                              title="Copy Application Secret" 
                              tabIndex={1} 
                              onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                              arrow
                            >
                              <Typography
                                className='text id-secret'
                                style={{ color: '#656565' }}
                                ref={appSecretTextRef}
                                onClick={copyToClipboard}
                              >
                                {appSecret}
                              </Typography>
                            </Tooltip>
                      }
                    </AppIdSecretContainer>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography className='text'>{app.appDescription}</Typography>
                </TableCell>
                <TableCell>
                  <OptionsContainer>
                    <Tooltip title="Edit Application" arrow>
                      <ButtonBase onClick={viewEdit}>
                        <FiEdit2 size='1.4em' />
                      </ButtonBase>
                    </Tooltip>
                    <Box>
                      <div style={{ height: '31px', width: '1px', backgroundColor: 'black'}}></div>  
                    </Box>
                    <Tooltip title="Delete Application" arrow>
                      <ButtonBase onClick={() => deleteApplication(app.appId)}>
                        <DeleteIcon className='delete-icon' />
                      </ButtonBase>
                    </Tooltip>
                  </OptionsContainer>
                </TableCell>
            </StyledTableRow>
      </>
    )
  );
}

export default AppItem