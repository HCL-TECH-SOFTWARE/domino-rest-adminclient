/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useRef, useContext } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import ApplicationIcon from '@mui/icons-material/Apps';
import GenerateIcon from '@mui/icons-material/RotateLeft';
import RemoveIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import { FormikProps } from 'formik';
import { styled } from '@linaria/react';
import Button from '@mui/material/Button';
import { AppProp, AppFormProp } from '../../../store/applications/types';
import { toggleApplicationDrawer } from '../../../store/drawer/action';
import appIcons from '../../../styles/app-icons';
import { getToken } from '../../../store/account/action';
import { AppFormContext } from '../ApplicationContext';
import { toggleAlert } from '../../../store/alerts/action';
import { SETUP_KEEP_API_URL } from '../../../config.dev';
import {
  Action,
  CardContainer,
  Footer,
  Header,
  InputContainer
} from '../../../styles/CommonStyles';
import { checkIcon } from '../../../styles/scripts';
import { apiRequestWithRetry } from '../../../utils/api-retry';
import { KeepTooltip } from '../../keep-elements/KeepElements';
import { useAppDispatch } from '../../../store/hooks';

const AppImage = styled.img`
  margin-top: 8px;
  background: #383838;
  border-radius: 8px;
  padding: 6px;
  height: 40px !important;
`;

const Icon = styled.div`
  padding-right: 10px;
`;
interface AppCardProps {
  item: AppProp;
  deleteApplication: (appId: string) => void;
  formik: FormikProps<any>;
}

const AppCard: React.FC<AppCardProps> = ({
  item,

  deleteApplication,
  formik
}) => {
  const dispatch = useAppDispatch();
  const [, setFormContext] = useContext(AppFormContext) as any;
  const [generating, setGenerating] = useState(false);
  const [appSecret, setAppSecret] = useState(null);
  const appSecretTextRef = useRef(null) as any;
  const [showActions, setShowActions] = useState(false);

  // Data for the Update App form
  let formData: AppFormProp = {
    appId: item.appId,
    appName: item.appName,
    appDescription: item.appDescription,
    appStartPage: item.appStartPage,
    appStatus: item.appStatus === 'isActive',
    appScope: item.appScope,
    appIcon: item.appIcon,
    appHasSecret: item.appHasSecret ? true : false,
    appSecret: item.appSecret,
    appCallbackUrlsStr: '',
    appContactsStr: '',
    usePkce: item.usePkce
  };

  const viewEdit = () => {
    setFormContext('Edit');

    if (item.appStartPage != null && item.appStartPage.length > 0) {
      formData.appStartPage = item.appStartPage
        .replace(/\s+/g, '');
    }
    formData.appStatus = item.appStatus === 'isActive';

    if (item.appCallbackUrls != null && item.appCallbackUrls.length > 0) {
      formData.appCallbackUrlsStr = ([] as Array<string>).concat(item.appCallbackUrls).sort(
        (a,b) => a.localeCompare(b)
      ).join('\n');
    }
    if (item.appContacts != null && item.appContacts.length > 0) {
      formData.appContactsStr = ([] as Array<string>).concat(item.appContacts).sort(
        (a,b) => a.localeCompare(b)
      ).join('\n');
    }

    // Save values and open the form
    formik.setValues(formData);
    dispatch(toggleApplicationDrawer());
  };

  const copyToClipboard = (current: any) => {
    const clipValue = current?.currentTarget?.innerText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(clipValue);
      dispatch(toggleAlert(`Copied ${clipValue} to clipboard`));
    } else {
      dispatch(toggleAlert(`Failed to copy to clipboard. Please copy by yourself: ${clipValue} `));
    }
  };

  const launch = () => {
    window.open(item.appStartPage);
  };

  const generate = async (appId: string, status: string) => {
    setGenerating(true);
    
    try {
      const { data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application/${appId}/secret?force=true`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({ status: status })
        })
      )

      setGenerating(false);
      setAppSecret(data.client_secret);
    } catch (err: any) {
      if (err.response && err.response.statusText) {
        dispatch(
          toggleAlert(
            `Error Generating App Secret: ${err.response.statusText}`
          )
        );
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Generating App Secret: ${err.message}`));
      }
    }
  };

  const handleKeyPress = (e: any, callback: any, focus?: boolean) => {
    if (e.key === "Enter") {
      callback();
    };
    if (focus) {
      setShowActions(false);
    }
  };

  const handleCardFocus = () => {
    setShowActions(false);
  }

  return (
    <>
      <CardContainer 
        tabIndex={1}
        onFocus={() => {setShowActions(true)}}
        onMouseEnter={() => {setShowActions(true)}}
        onMouseLeave={() => {setShowActions(false)}}
      >
        <Action
          className={`actions ${showActions ? 'visible' : 'hidden'}`}
          onFocus={() => {setShowActions(true)}}
        >
          {
            item.appHasSecret ? (
              <KeepTooltip content="This application has an application secret configured">
                <SecurityIcon />
              </KeepTooltip>
            ) : (
              ''
            )
          }
          <KeepTooltip 
            content="Delete" 
            onKeyDown={(e) => {handleKeyPress(e, () => {deleteApplication(item.appId)})}}
            onFocus={() => {setShowActions(false)}}
          >
            <RemoveIcon onClick={() => deleteApplication(item.appId)} />
          </KeepTooltip>
          <KeepTooltip 
            content="Edit" 
            onKeyDown={(e) => {handleKeyPress(e, () => {viewEdit()})}}
          >
            <EditIcon onClick={viewEdit} />
          </KeepTooltip>
          <KeepTooltip 
            content="Generate Application Secret" 
            onKeyDown={(e) => {handleKeyPress(e, () => {generate(item.appId, item.appStatus)})}} 
          >
            <GenerateIcon
              onClick={() => generate(item.appId, item.appStatus)}
              className="generate"
            />
          </KeepTooltip>
        </Action>
        <Header>
          <Icon>
            {checkIcon(item.appIcon) ? (
              <AppImage
                src={`data:image/svg+xml;base64, ${appIcons[item.appIcon]}`}
                alt="db-icon"
                className='color-hover'
              />
            ) : (
              <ApplicationIcon className='app-card-app-icon' />
            )}
          </Icon>
          <KeepTooltip content={item.appName}>
            <span className="appName" color="textPrimary">
              {item.appName}
            </span>
          </KeepTooltip>
        </Header>
        <KeepTooltip content={item.appDescription ? item.appDescription : ''}>
          <span className="appDescription" color="textPrimary">
            {item.appDescription
              ? item.appDescription
              : 'No Description Available'}
          </span>
        </KeepTooltip>
        <Footer className="footer-actions">
          <span className="heading" color="textPrimary">
            App Id:
          </span>
          <KeepTooltip 
            content="Copy App Id" 
            onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
            onFocus={handleCardFocus}
          >
            <span
              className="app-secret"
              color="textPrimary"
              onClick={copyToClipboard}
            >
              {item.appId}
            </span>
          </KeepTooltip>
        </Footer>
        <Footer className="footer-actions">
          {generating ? (
            <span className="generating">
              Generating New Secret ...
            </span>
          ) : (
            appSecret && (
              <>
                <span className="heading" color="textPrimary">
                  App Secret:
                </span>
                <KeepTooltip 
                  content="Copy Application Secret" 
                  onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                >
                  <span
                    ref={appSecretTextRef}
                    onClick={copyToClipboard}
                    className="app-secret"
                    color="textPrimary"
                  >
                    {appSecret}
                  </span>
                </KeepTooltip>
              </>
            )
          )}
        </Footer>
        <InputContainer className='p-0 pt-2 pb-2 flex justify-center'>
          {item.appStatus === 'isActive' && item.appStartPage !== 'null' ? (
            <Button className="launch" onClick={launch} onKeyDown={(e) => {handleKeyPress(e, () => {launch()}, true)}}>
              Launch
            </Button>
          ) : (
            <Button className="launchdisabled" tabIndex={-1} disabled>
              Launch
            </Button>
          )}
        </InputContainer>
      </CardContainer>
    </>
  );
};

export default AppCard;
