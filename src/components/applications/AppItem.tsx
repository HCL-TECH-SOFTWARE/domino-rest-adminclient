/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Box, TableCell, TableRow } from '@mui/material';
import { AppFormProp, AppProp } from '../../store/applications/types';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { getTheme } from '../../store/styles/action';
import { generateSecret } from '../../store/applications/action';
import { toggleAlert } from '../../store/alerts/action';
import { DeleteIcon } from '../../styles/CommonStyles';
import { MdRefresh, MdEdit } from "react-icons/md";
import { FormikProps } from 'formik';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import '../webcomponents/copyable-text';
import { LitAppStatus, LitButtonNeutral, LitButtonYes, LitTooltip } from '../lit-elements/LitElements';

const StyledTableRow = styled(TableRow)`
  .expand lit-tooltip {
    display: block;
  }

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
    align-content: center;
    align-items: center;

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
  const [isGenerate, setIsGenerate] =  useState(false);
  const [hasAppSecret, setHasAppSecret] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);
  
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

  useEffect(() => {
      if (isGenerate) {
        ref.current?.showModal();
      } else {
        if (ref.current?.close) {
          ref.current?.close();
        }
      }
    }, [isGenerate])

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
                    {app.appStatus === 'isActive' && <LitTooltip content={`Launch ${app.appName}`} className='w-30px'>
                        <button
                          onClick={launch}
                          className='no-background no-border cursor-pointer m-0 p-0 full-width'
                        >
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" fill="transparent"/>
                                <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#5E1EBE" stroke="#5E1EBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </LitTooltip>}
                    {app.appStatus === 'disabled' && <LitTooltip content="This application is inactive.">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" fill="transparent"/>
                            <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#A5AFBE" stroke="#A5AFBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </LitTooltip>}
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
                    <div className='flex flex-col gap-2'>
                        <span className='small-text'>{app.appName}</span>
                        <div style={{ width: '100%' }}>
                          <LitAppStatus status={app.appStatus === 'isActive'} />
                        </div>
                    </div>
                  </AppNameContainer>
                </TableCell>
                <TableCell className='expiration exp-content'>
                  <Box>
                    <AppIdSecretContainer>
                      <span className='small-text'>App ID:</span>
                      <LitTooltip
                        content="Copy App Id"
                        onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}}
                      >
                        <span
                          className='small-text cursor-pointer color-text-hint'
                          onClick={copyToClipboard}
                        >
                          {app.appId}
                        </span>
                      </LitTooltip>
                    </AppIdSecretContainer>
                    { app.usePkce ? (
                      <AppIdSecretContainer>
                        <span className='small-text text-bold'>PKCE</span>
                      </AppIdSecretContainer>
                    ) : (
                      <AppIdSecretContainer>
                        <span className='small-text'>App Secret:</span>
                        {
                          hasAppSecret ? <>
                            <LitTooltip
                              content="Copy Application Secret"
                              onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                            >
                              <span
                                className='small-text cursor-pointer script-editor-help-icon'
                                ref={appSecretTextRef}
                                onClick={copyToClipboard}
                              >
                                {appSecret}
                              </span>
                              </LitTooltip>
                          </> :
                          app.appHasSecret ? <>
                            <button
                              onClick={() => handleClickGenerate(false)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                            >
                              <MdRefresh color='#2873F0' />
                            </button>
                            <span className='small-text color-text-hint'>********************</span>
                          </> : <>
                            {app.appSecret?.length > 0 ? <>
                              <LitTooltip
                                content="Copy Application Secret"
                                onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                              >
                                <span
                                  className='small-text cursor-pointer script-editor-help-icon'
                                  ref={appSecretTextRef}
                                  onClick={copyToClipboard}
                                >
                                  {appSecret}
                                </span>
                              </LitTooltip>
                            </> : <>
                            <button
                              onClick={() => handleClickGenerate(true)}
                              className='no-background no-border cursor-pointer m-0 p-0'
                            >
                              <span className='small-text script-editor-help-icon'>{clickToGenerateText}</span>
                            </button>
                            </>}
                          </>
                        }
                      </AppIdSecretContainer>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <span className='small-text'>{app.appDescription}</span>
                </TableCell>
                <TableCell>
                  <OptionsContainer>
                    <LitTooltip content="Edit Application" className='w-30px flex flex-end'>
                      <button
                        onClick={viewEdit}
                        className='no-background no-border cursor-pointer m-0 p-0 color-text-primary'
                      >
                        <MdEdit size={20} />
                      </button>
                    </LitTooltip>
                    <div>
                      <div style={{ height: '31px', width: '1px', backgroundColor: 'light-dark(black, white)'}}></div>  
                    </div>
                    <LitTooltip content="Delete Application">
                      <button
                        onClick={() => deleteApplication(app.appId)}
                        className='no-background no-border cursor-pointer m-0 p-0'
                      >
                        <DeleteIcon className='delete-icon' />
                      </button>
                    </LitTooltip>
                  </OptionsContainer>
                </TableCell>
            </StyledTableRow>
            <dialog ref={ref} onClose={() => setIsGenerate(false)} className='regen-app-secret-dialog'>
                <div className="dialog-title">
                  <text className='dialog-title-text'>Regenerate App Secret?</text>
                </div>
                <div className='dialog-content'>
                  <text className='dialog-content-text'>
                    WARNING: You are attempting to regenerate the App Secret, doing so may break existing applications.  Are you sure you want to proceed?
                  </text>
                </div>
                <div className='dialog-actions'>
                    <LitButtonNeutral text='No' onClick = {() => setIsGenerate(false)} />
                    <LitButtonYes text='Yes' onClick={regenerateSecret} />
                </div>
            </dialog>
      </>
    )
  );
}

export default AppItem