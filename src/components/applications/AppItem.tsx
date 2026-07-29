/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@linaria/react';
import { Box } from '@mui/material';
import { AppFormProp, AppProp } from '../../store/applications/types';
import { AppIcon } from '../commons/AppIcon';
import { generateSecret } from '../../store/applications/action';
import { toggleAlert } from '../../store/alerts/action';
import { DeleteIcon } from '../../styles/CommonStyles';
import { FormikProps } from 'formik';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { KeepAppStatus, KeepButton, KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../store/hooks';

const Row = styled.tr`
  .expand keep-tooltip {
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
    font-size: var(--wa-font-size-m);
  }

  .revoke {
    color: #AA1F51;
  }

  .off-border {
    border-bottom: 0;
  }

  /* Was MdRefresh color='#2873F0', an SVG color attribute. wa-icon paints from
     currentColor, so the colour is a declaration now. The literal is carried over
     unchanged; it is not on the WA token ramp. */
  .regenerate-icon {
    color: #2873F0;
  }

  /* Was MdEdit size={20}, i.e. a 20px SVG box. wa-icon sizes from font-size. */
  .edit-icon {
    font-size: 20px;
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
    border-radius: var(--wa-border-radius-s);
    background: #A1E596;
    font-color: #000;
    flex-direction: row;
    align-items: center;
    width: fit-content;
    font-size: var(--wa-font-size-2xs);
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
  const dispatch = useAppDispatch()

  const [, setGenerating] = useState(false)
  const [appSecret, setAppSecret] = useState('')
  const appSecretTextRef = useRef(null) as any
  const clickToGenerateText = "Click to Generate Secret"
  const [isGenerate, setIsGenerate] =  useState(false);
  const [hasAppSecret, setHasAppSecret] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);
  
  const launch = () => {
    window.open(app.appStartPage)
  }

  /**
   * `setHasAppSecret(true)` belongs to the branch that actually asks for a secret.
   *
   * It used to sit outside the `if`, so the refresh button — which only opens the
   * "Regenerate App Secret?" confirmation — flipped the row into the just-generated
   * branch immediately. That branch renders `appSecret`, still `''` because nothing had
   * been generated, so the masked `********************` was replaced by blank text
   * before the user had confirmed anything, and stayed blank if they cancelled (#844).
   *
   * The confirm path sets it in `regenerateSecret` instead, where a secret is really on
   * its way.
   */
  const handleClickGenerate = (newSecret: boolean) => {
    if (newSecret) {
      dispatch(generateSecret(app.appId, app.appStatus, setGenerating, setAppSecret))
      setHasAppSecret(true)
    } else {
      setIsGenerate(true);
    }
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
    dispatch(generateSecret(app.appId, app.appStatus, setGenerating, setAppSecret))
    setHasAppSecret(true)
    setIsGenerate(false);
  }

  const handleKeyPress = (e: any, callback: any) => {
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
            <Row>
                <td className='expand'>
                    {app.appStatus === 'isActive' && <KeepTooltip content={`Launch ${app.appName}`} className='w-30px'>
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
                    </KeepTooltip>}
                    {app.appStatus === 'disabled' && <KeepTooltip content="This application is inactive.">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" fill="transparent"/>
                            <path d="M20.0007 36.6666C29.2054 36.6666 36.6673 29.2047 36.6673 19.9999C36.6673 10.7952 29.2054 3.33325 20.0007 3.33325C10.7959 3.33325 3.33398 10.7952 3.33398 19.9999C3.33398 29.2047 10.7959 36.6666 20.0007 36.6666Z" fill="#A5AFBE" stroke="#A5AFBE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16.666 13.3333L26.666 19.9999L16.666 26.6666V13.3333Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </KeepTooltip>}
                </td>
                <td className='app-name'>
                  <AppNameContainer>
                    <AppIcon
                        name={app.appIcon}
                        alt="db-icon"
                        className='color-hover'
                        as={AppImage}
                    />
                    <div className='flex flex-col gap-2'>
                        <span className='small-text'>{app.appName}</span>
                        <div className='full-width'>
                          <KeepAppStatus status={app.appStatus === 'isActive'} />
                        </div>
                    </div>
                  </AppNameContainer>
                </td>
                <td className='expiration exp-content'>
                  <Box>
                    <AppIdSecretContainer>
                      <span className='small-text'>App ID:</span>
                      <KeepTooltip
                        content="Copy App Id"
                        onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)})}}
                      >
                        <span
                          className='small-text cursor-pointer color-text-hint'
                          onClick={copyToClipboard}
                        >
                          {app.appId}
                        </span>
                      </KeepTooltip>
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
                            <KeepTooltip
                              content="Copy Application Secret"
                              onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)})}} 
                            >
                              <span
                                className='small-text cursor-pointer script-editor-help-icon'
                                ref={appSecretTextRef}
                                onClick={copyToClipboard}
                              >
                                {appSecret}
                              </span>
                              </KeepTooltip>
                          </> :
                          app.appHasSecret ? <>
                            <button
                              onClick={() => handleClickGenerate(false)}
                              className='no-background no-border cursor-pointer m-0 p-0'
                            >
                              <KeepIcon name='arrows-rotate' label='Regenerate app secret' className='regenerate-icon' />
                            </button>
                            <span className='small-text color-text-hint'>********************</span>
                          </> : <>
                            {/* `app.appSecret`, not the local `appSecret`. This branch is
                                guarded by the prop and used to render the state, which is
                                `''` until something is generated in this session — so a
                                secret the API had supplied showed as an empty span under a
                                "Copy Application Secret" tooltip (#844). Each branch now
                                renders the value it tests. */}
                            {app.appSecret?.length > 0 ? <>
                              <KeepTooltip
                                content="Copy Application Secret"
                                onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)})}}
                              >
                                <span
                                  className='small-text cursor-pointer script-editor-help-icon'
                                  ref={appSecretTextRef}
                                  onClick={copyToClipboard}
                                >
                                  {app.appSecret}
                                </span>
                              </KeepTooltip>
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
                </td>
                <td>
                  <span className='small-text'>{app.appDescription}</span>
                </td>
                <td>
                  <OptionsContainer>
                    <KeepTooltip content="Edit Application" className='w-30px flex flex-end'>
                      <button
                        onClick={viewEdit}
                        className='no-background no-border cursor-pointer m-0 p-0 color-text-primary'
                      >
                        <KeepIcon name='pencil' label='Edit Application' className='edit-icon' />
                      </button>
                    </KeepTooltip>
                    <div>
                      <div className='short-vertical' />
                    </div>
                    <KeepTooltip content="Delete Application">
                      <button
                        onClick={() => deleteApplication(app.appId)}
                        className='no-background no-border cursor-pointer m-0 p-0'
                      >
                        <DeleteIcon className='delete-icon' />
                      </button>
                    </KeepTooltip>
                  </OptionsContainer>
                </td>
            </Row>
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
                    <KeepButton variant="neutral" appearance="outlined"
                      onClick = {() => setIsGenerate(false)}
                    >No</KeepButton>
                    <KeepButton onClick={regenerateSecret}>Yes</KeepButton>
                </div>
            </dialog>
      </>
    )
  );
}

export default AppItem