/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddIcon from '@mui/icons-material/Add';
import { Button, ButtonBase, Dialog, Typography } from '@mui/material';
import styled from 'styled-components';
import {
  deleteApplication,
  addApplication,
  updateApp,
  clearAppError,
  fetchMyApps,
} from '../../../store/applications/action';
import { AppState } from '../../../store';
import { toggleAlert } from '../../../store/alerts/action';
import DeleteApplicationDialog from '../DeleteApplicationDialog';
import FormDrawer from '../FormDrawer';
import { toggleDeleteDialog } from '../../../store/dialog/action';
import { AppFormContext } from '../ApplicationContext';
import { toggleAppFilterDrawer, toggleApplicationDrawer } from '../../../store/drawer/action';
import { TopContainer } from '../../../styles/CommonStyles';
import Consents from './Consents';
import { fetchUsers } from '../../../store/access/action';
import { getConsents } from '../../../store/consents/action';
import AppsTable from '../AppsTable';
import { FiFilter } from "react-icons/fi";
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import { IMG_DIR } from '../../../config.dev';
import { LitButton } from '../../lit-elements/LitElements';

const AppContainer = styled.div`
  overflow-y: auto;
  height: calc( 100% - 120px);
`;

const AppStackContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc( 100vh - 260px);
  max-width: 100%;
  overflow-y: scroll;
  @media only screen and (max-width: 768px) {
    height: calc( 100vh - 280px);
  }
`;

const ConsentsDialogContainer = styled(Dialog)`
  border: none;
  width: 100vw;
  padding: 2.5% 5%;
`

const OptionsContainer = styled.section`
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 20px;
`

const ApplicationFormSchema = Yup.object().shape({
  appName: Yup.string().trim().required('Application Name is Required.'),
  appCallbackUrlsStr: Yup.string().required('At least one URL is required.'),
  appStartPage: Yup.string().required('Startup page is required.'),
  appScope: Yup.string().required('Scope is required.'),
});

const Kanban: React.FC = () => {
  const { appPull } = useSelector((selector: AppState) => selector.apps);
  const { permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const [selected, setSelected] = useState('');
  const dispatch = useDispatch();
  const [formContext, setFormContext] = useContext(AppFormContext) as any;
  const icon = useState('beach')[0];
  const deleteAppTitle: string = 'Delete Application';
  const deleteAppMessage: string =
    'Are you sure you want to delete this Application?';
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)

  const [filtersOn, setFiltersOn] = useState(false)
  const [reset, setReset] = useState(false)

  const openDeleteDialog = (appId: string) => {
    dispatch(toggleDeleteDialog());
    setSelected(appId);
  };

  const handleOpenConsents = () => {
    if (!appPull) dispatch(fetchMyApps() as any)
    dispatch(fetchUsers() as any)
    dispatch(getConsents() as any)
    setConsentDialogOpen(true)
  }

  const deleteApp = () => {
    dispatch(deleteApplication(selected) as any);
  };

  // Submit Form
  const formik = useFormik({
    initialValues: {
      appId: '',
      appName: '',
      appDescription: '',
      appCallbackUrlsStr: '',
      appStartPage: '',
      appStatus: true,
      appScope: '',
      appContactsStr: '',
      appIcon: icon,
      usePkce: false,
    },
    // Clear errors if user makes changes
    validate: () => {
      dispatch(clearAppError());
    },
    validationSchema: ApplicationFormSchema,

    onSubmit: (values) => {
      var appCallbackUrlsStr = values.appCallbackUrlsStr.split(/\n/);
      appCallbackUrlsStr = appCallbackUrlsStr.filter((urlStr:string) => urlStr.trim() !== '');
      var appContactsStr = values.appContactsStr.split(/\n/);
      appContactsStr = appContactsStr.filter((contactStr:string) => contactStr.trim() !== '');
      const apiPayload = {
        client_name: values.appName.trim(),
        description: values.appDescription === null ? '' : values.appDescription,
        redirect_uris: appCallbackUrlsStr,
        client_uri: values.appStartPage,
        scope: values.appScope,
        logo_uri: values.appIcon,
        status: values.appStatus ? 'isActive' : 'disabled',
        contacts: appContactsStr,
        token_endpoint_auth_method: values.usePkce ? 'none' : 'client_secret_basic'
      };

      if (formContext === 'Edit') {
        dispatch(updateApp({...apiPayload, client_id: values.appId}) as any);
      } else {
        dispatch(addApplication(apiPayload) as any);
      }
    },
  });
  /**
   * createAction is called when the Create Application button is clicked
   * to open the Create form
   */
  const createAction = () => {
    if(permissionCreate){
      dispatch(clearAppError());
  
      // Set the context and open the drawer
      setFormContext('create');
  
      // Reset the form
      formik.resetForm();
  
      // Open the Create form
      dispatch(toggleApplicationDrawer());
    }else{
      dispatch(toggleAlert(`You don't have permission to create application.`));
    }
  };

  return (
    <>
      <AppContainer>
        <TopContainer  style={{ marginTop: '15px' }}>
          <Typography
            className="top-nav"
            color="textPrimary"
          >
            Application Management
          </Typography>
          <OptionsContainer>
            <LitButton
              src={`${IMG_DIR}/shoelace/plus.svg`}
              onClick={createAction}
            >
              Add Application
            </LitButton>
            <LitButton
              onClick={handleOpenConsents}
            >
              OAuth Consents
            </LitButton>
            <div style={{ height: '46px', width: '1px', backgroundColor: '#000' }} />
            <button
              onClick={() => dispatch(toggleAppFilterDrawer())}
              className='option'
              style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"/>
              </svg>
            </button>
          </OptionsContainer>
        </TopContainer>
        <AppStackContainer>
          <AppsTable
            filtersOn={filtersOn}
            setFiltersOn={setFiltersOn}
            reset={reset}
            setReset={setReset}
            deleteApplication={openDeleteDialog}
            formik={formik}
          />
        </AppStackContainer>
        <DeleteApplicationDialog
          dialogTitle={deleteAppTitle}
          deleteMessage={deleteAppMessage}
          handleDelete={deleteApp}
        />
        <FormDrawer formName="AppForm" formik={formik} />
        <ConsentsDialogContainer open={consentDialogOpen} onClose={() => {setConsentDialogOpen(false)}} fullScreen>
          <Consents
            handleClose={() => {setConsentDialogOpen(false)}}
            dialog={true}
          />
        </ConsentsDialogContainer>
      </AppContainer>
    </>
  );
};

export default Kanban;
