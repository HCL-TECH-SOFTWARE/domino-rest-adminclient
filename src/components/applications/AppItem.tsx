/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Box, DialogActions, DialogContent, DialogContentText, DialogTitle, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import { AppFormProp, AppProp } from '../../store/applications/types';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { getTheme } from '../../store/styles/action';
import { generateSecret } from '../../store/applications/action';
import { toggleAlert } from '../../store/alerts/action';
import { DeleteIcon, CommonDialog } from '../../styles/CommonStyles';
import { MdRefresh } from "react-icons/md";
import { FormikProps } from 'formik';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import '../webcomponents/copyable-text';
import { AppFormContext } from './ApplicationContext';
import { LitAppStatus, LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

const StyledTableRow = styled(TableRow)`
  .app-name {
    gap: 10px;
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
  const dispatch = useDispatch()
  const { themeMode } = useSelector((state: AppState) => state.styles)

  const [generating, setGenerating] = useState(false)
  const [appSecret, setAppSecret] = useState('')
  const appSecretTextRef = useRef(null) as any
  const clickToGenerateText = "Click to Generate Secret"
  const [formContext, setFormContext] = useContext(AppFormContext) as any
  const [isGenerate, setIsGenerate] =  useState(false);
  const [hasAppSecret, setHasAppSecret] = useState(false);

  
  const launch = () => {
    window.open(app.appStartPage)
  }

  const handleClickGenerate = (newSecret: boolean) => {
    if (newSecret) {
      dispatch(generateSecret(app.appId, app.appStatus, setGenerating, setAppSecret) as any)
    } else {
      setIsGenerate(true);
    }
    setHasAppSecret(true)
  }

  const regenerateSecret = () => {
    dispatch(generateSecret(app.appId, app.appStatus, setGenerating, setAppSecret) as any)
    setIsGenerate(false);
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
    setFormContext('Edit')
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
      appContactsStr: '',
      usePkce: app.usePkce
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

  return (
    (
        <>
            <StyledTableRow>
                <TableCell className='expand'>
                    {app.appStatus === 'isActive' && <Tooltip title={`Launch ${app.appName}`} arrow>
                        <button
                          onClick={launch}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                        >
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" fill="white"/>
                                <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#5E1EBE" stroke="#5E1EBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
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
                    <Box style={{ flexDirection: 'column', gap: '2px', display: 'flex' }}>
                        <Typography className='text'>{app.appName}</Typography>
                        <div style={{ width: '100%' }}>
                          <LitAppStatus status={app.appStatus === 'isActive'} />
                        </div>
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
                    { app.usePkce ? (
                      <Typography className='text' fontWeight="bold">PKCE</Typography>
                    ) : (
                      <AppIdSecretContainer>
                        <Typography className='text'>App Secret:</Typography>
                        {
                          hasAppSecret ? <>
                            <Tooltip 
                                  title="Copy Application Secret" 
                                  tabIndex={1} 
                                  onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                                  arrow
                                >
                                  <Typography
                                    className='text id-secret'
                                    style={{ color: '#2873F0' }}
                                    ref={appSecretTextRef}
                                    onClick={copyToClipboard}
                                  >
                                    {appSecret}
                                  </Typography>
                                </Tooltip>
                          </> :
                          app.appHasSecret ? <>
                            <button
                              onClick={() => handleClickGenerate(false)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                            >
                              <MdRefresh color='#2873F0' />
                            </button>
                            <Typography className='text' style={{ color: '#505050' }}>********************</Typography>
                          </> : <>
                            {app.appSecret?.length > 0 ? <>
                              <Tooltip 
                                  title="Copy Application Secret" 
                                  tabIndex={1} 
                                  onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                                  arrow
                                >
                                  <Typography
                                    className='text id-secret'
                                    style={{ color: '#2873F0' }}
                                    ref={appSecretTextRef}
                                    onClick={copyToClipboard}
                                  >
                                    {appSecret}
                                  </Typography>
                                </Tooltip>
                            </> : <>
                            <button
                              onClick={() => handleClickGenerate(true)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                            >
                              <Typography className='text' style={{ color: '#2873F0' }}>{clickToGenerateText}</Typography>
                            </button>
                            </>}
                          </>
                        }
                      </AppIdSecretContainer>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography className='text'>{app.appDescription}</Typography>
                </TableCell>
                <TableCell>
                  <OptionsContainer>
                    <Tooltip title="Edit Application" arrow>
                      <button
                        onClick={viewEdit}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                        </svg>
                      </button>
                    </Tooltip>
                    <Box>
                      <div style={{ height: '31px', width: '1px', backgroundColor: 'black'}}></div>  
                    </Box>
                    <Tooltip title="Delete Application" arrow>
                      <button
                        onClick={() => deleteApplication(app.appId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                      >
                        <DeleteIcon className='delete-icon' />
                      </button>
                    </Tooltip>
                  </OptionsContainer>
                </TableCell>
            </StyledTableRow>
            <CommonDialog open={isGenerate} onClose={() => setIsGenerate(false)}>
                <DialogTitle>
                    <Box className="title">Regenerate App Secret?</Box>
                    <DialogContent>
                      <DialogContentText color={'textPrimary'}>
                        WARNING: You are attempting to regenerate the App Secret, doing so may break existing applications.  Are you sure you want to proceed?
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions style={{ display: 'flex', marginBottom: '20px', padding: '0 30px 20px 0' }}>
                        <LitButtonNeutral text='No' onClick = {() => setIsGenerate(false)} />
                        <LitButtonYes text='Yes' onClick={regenerateSecret} />
                    </DialogActions>
                </DialogTitle>
            </CommonDialog>
      </>
    )
  );
}

export default AppItem