/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useRef, useContext, useEffect } from 'react';
import { FormikProps } from 'formik';
import { styled } from '@linaria/react';
import Button from '@mui/material/Button';
import { AppProp, AppFormProp } from '../../../store/applications/types';
import { toggleApplicationDrawer } from '../../../store/drawer/action';
import { generateSecret } from '../../../store/applications/action';
import { AppFormContext } from '../ApplicationContext';
import { toggleAlert } from '../../../store/alerts/action';
import {
  Action,
  CardContainer,
  Footer,
  Header,
  InputContainer
} from '../../../styles/CommonStyles';
import { KeepAppIcon, KeepButton, KeepTooltip } from '../../keep-elements/KeepElements';
import { KeepIcon } from '../../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../../store/hooks';

const Icon = styled.div`
  padding-right: 10px;

  /* Was AppImage, a styled image handed to the icon component's element-override prop.
     That prop is gone with the conversion: the icon is a custom element now and its image
     lives in a shadow root, where no class from this stylesheet reaches it. The element
     exposes the image as a part, which is the one hook that does cross.
     width is stated because the element's own rule stretches the image to the host, and
     here the host is unsized — the height and the picture's own ratio decide the box, as
     they did when these declarations sat on the image itself. The dark plate is carried
     over unchanged; it is a literal, not a token, so it does not follow the theme. */
  keep-app-icon::part(icon) {
    margin-top: 8px;
    background: #383838;
    border-radius: 8px;
    padding: 6px;
    width: auto;
    height: 40px;
  }
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
  const [appSecret, setAppSecret] = useState<string | null>(null);
  const appSecretTextRef = useRef(null) as any;
  const [showActions, setShowActions] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);

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

  const generate = () => {
    dispatch(generateSecret(item.appId, item.appStatus, setGenerating, setAppSecret));
  };

  /**
   * The API is called with `force=true`, which overwrites any existing secret
   * unconditionally — every integration still holding the old one breaks at its next
   * call, and the previous value is not recoverable. So confirm first, but only when
   * there is something to destroy (#740).
   */
  const handleGenerate = () => {
    if (item.appHasSecret) {
      setConfirmRegenerate(true);
    } else {
      generate();
    }
  };

  const confirmAndGenerate = () => {
    setConfirmRegenerate(false);
    generate();
  };

  useEffect(() => {
    if (confirmRegenerate) {
      confirmRef.current?.showModal();
    } else {
      confirmRef.current?.close?.();
    }
  }, [confirmRegenerate]);

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
                <KeepIcon
                  name="shield-halved"
                  label="This application has an application secret configured"
                />
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
            <KeepIcon name="trash" label="Delete" onClick={() => deleteApplication(item.appId)} />
          </KeepTooltip>
          <KeepTooltip 
            content="Edit" 
            onKeyDown={(e) => {handleKeyPress(e, () => {viewEdit()})}}
          >
            <KeepIcon name="pencil" label="Edit" onClick={viewEdit} />
          </KeepTooltip>
          <KeepTooltip
            content={item.appHasSecret ? 'Regenerate Application Secret' : 'Generate Application Secret'}
            onKeyDown={(e) => {handleKeyPress(e, handleGenerate)}}
          >
            <KeepIcon
              name="rotate-left"
              label={item.appHasSecret ? 'Regenerate Application Secret' : 'Generate Application Secret'}
              onClick={handleGenerate}
              className="generate"
            />
          </KeepTooltip>
        </Action>
        <Header>
          <Icon>
            {/* The fallback is slotted, so it stays in this document's light DOM and its
                class still reaches it. The span is required: the icon wrapper forwards a
                fixed set of props and would drop a `slot` attribute silently. */}
            <KeepAppIcon
              name={item.appIcon}
              alt="db-icon"
              className='color-hover'
            >
              <span slot="fallback">
                <KeepIcon name='table-cells-large' size='xl' className='app-card-app-icon' />
              </span>
            </KeepAppIcon>
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
      <dialog
        ref={confirmRef}
        onClose={() => setConfirmRegenerate(false)}
        className='regen-app-secret-dialog'
      >
        {/* <span>, not the <text> AppItem uses — that is an SVG tag, and React warns
            on it. Both rules key off the class, so this renders identically. */}
        <div className="dialog-title">
          <span className='dialog-title-text'>Regenerate App Secret?</span>
        </div>
        <div className='dialog-content'>
          <span className='dialog-content-text'>
            WARNING: You are attempting to regenerate the App Secret, doing so may break existing applications.  Are you sure you want to proceed?
          </span>
        </div>
        <div className='dialog-actions'>
          <KeepButton variant="neutral" appearance="outlined"
            onClick={() => setConfirmRegenerate(false)}
          >No</KeepButton>
          <KeepButton onClick={confirmAndGenerate}>Yes</KeepButton>
        </div>
      </dialog>
    </>
  );
};

export default AppCard;
