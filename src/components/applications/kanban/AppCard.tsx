/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useRef, useContext } from 'react';
import Typography from '@material-ui/core/Typography';
import EditIcon from '@material-ui/icons/Edit';
import ApplicationIcon from '@material-ui/icons/Apps';
import GenerateIcon from '@material-ui/icons/RotateLeft';
import RemoveIcon from '@material-ui/icons/Delete';
import SecurityIcon from '@material-ui/icons/Security';
import { useDispatch, useSelector } from 'react-redux';
import { FormikProps } from 'formik';
import Tooltip from '@material-ui/core/Tooltip';
import axios from 'axios';
import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import { AppProp, AppFormProp } from '../../../store/applications/types';
import { toggleApplicationDrawer } from '../../../store/drawer/action';
import { AppState } from '../../../store';
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
import { getTheme } from '../../../store/styles/action';

const AppImage = styled.img`
  margin-top: 8px;
  background: #383838;
  border-radius: 8px;
  padding: 6px;
  height: 40px !important;
`;

const actionBarStyle = {
  padding: '2px 0', 
  display: 'flex',
  justifyContent: 'center'
}

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
  const dispatch = useDispatch();
  const [, setFormContext] = useContext(AppFormContext) as any;
  const { themeMode } = useSelector((state: AppState) => state.styles);
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
    appContactsStr: ''
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

  const generate = (appId: string, status: string) => {
    setGenerating(true);
    axios
      .post(
        `${SETUP_KEEP_API_URL}/admin/application/${appId}/secret?force=true`,
        {
          status: status
          //TODO: warn if secret exists ask for confirmation
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      )
      .then((res) => {
        setGenerating(false);
        setAppSecret(res.data.client_secret);
      })
      .catch((err) => {
        // Use the Keep response error if it's available
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
      });
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
        <Action className="actions" style={{ visibility: showActions ? 'visible' : 'hidden' }} onFocus={() => {setShowActions(true)}} >
          {
            item.appHasSecret ? (
              <Tooltip title="This application has an application secret configured" tabIndex={1} arrow>
                <SecurityIcon />
              </Tooltip>
            ) : (
              ''
            )
          }
          <Tooltip 
            title="Delete" 
            tabIndex={1}
            onKeyDown={(e) => {handleKeyPress(e, () => {deleteApplication(item.appId)})}}
            onFocus={() => {setShowActions(false)}}
            arrow
          >
            <RemoveIcon onClick={() => deleteApplication(item.appId)} />
          </Tooltip>
          <Tooltip 
            title="Edit" 
            tabIndex={1} 
            onKeyDown={(e) => {handleKeyPress(e, () => {viewEdit()})}}
            arrow
          >
            <EditIcon onClick={viewEdit} />
          </Tooltip>
          <Tooltip 
            title="Generate Application Secret" 
            tabIndex={1} 
            onKeyDown={(e) => {handleKeyPress(e, () => {generate(item.appId, item.appStatus)})}} 
            arrow
          >
            <GenerateIcon
              onClick={() => generate(item.appId, item.appStatus)}
              className="generate"
            />
          </Tooltip>
        </Action>
        <Header>
          <Icon>
            {checkIcon(item.appIcon) ? (
              <AppImage
                src={`data:image/svg+xml;base64, ${appIcons[item.appIcon]}`}
                alt="db-icon"
                style={{
                  color: getTheme(themeMode).hoverColor
                }}
              />
            ) : (
              <ApplicationIcon
                style={{
                  background: getTheme(themeMode).primary,
                  color: getTheme(themeMode).hoverColor,
                  height: 40,
                  width: 40
                }}
              />
            )}
          </Icon>
          <Tooltip title={item.appName} arrow>
            <Typography className="appName" color="textPrimary">
              {item.appName}
            </Typography>
          </Tooltip>
        </Header>
        <Tooltip title={item.appDescription ? item.appDescription : ''} arrow>
          <Typography className="appDescription" color="textPrimary">
            {item.appDescription
              ? item.appDescription
              : 'No Description Available'}
          </Typography>
        </Tooltip>
        <Footer className="footer-actions">
          <Typography className="heading" color="textPrimary">
            App Id:
          </Typography>
          <Tooltip 
            title="Copy App Id" 
            arrow 
            tabIndex={1} 
            onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
            onFocus={handleCardFocus}
          >
            <Typography
              className="app-secret"
              color="textPrimary"
              onClick={copyToClipboard}
            >
              {item.appId}
            </Typography>
          </Tooltip>
        </Footer>
        <Footer className="footer-actions">
          {generating ? (
            <Typography className="generating">
              Generating New Secret ...
            </Typography>
          ) : (
            appSecret && (
              <>
                <Typography className="heading" color="textPrimary">
                  App Secret:
                </Typography>
                <Tooltip 
                  title="Copy Application Secret" 
                  tabIndex={1} 
                  onKeyDown={(e) => {handleKeyPress(e, () => {copyToClipboard(e)}, true)}} 
                  arrow
                >
                  <Typography
                    ref={appSecretTextRef}
                    onClick={copyToClipboard}
                    className="app-secret"
                    color="textPrimary"
                  >
                    {appSecret}
                  </Typography>
                </Tooltip>
              </>
            )
          )}
        </Footer>
        <InputContainer style={actionBarStyle}>
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
