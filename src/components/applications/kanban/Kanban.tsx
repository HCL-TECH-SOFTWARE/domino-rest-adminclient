/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddIcon from '@material-ui/icons/Add';
import { Button, ButtonBase, Dialog, Typography } from '@material-ui/core';
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
import '../../webcomponents/drawer-container';

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
            <Button
              color="primary"
              className="button-create"
              onClick={createAction}
            >
              <AddIcon style={{ margin: '0 5px' }} />
              Add Application
            </Button>
            <Button
              color="primary"
              className="button-create"
              onClick={handleOpenConsents}
            >
              OAuth Consents
            </Button>
            <div style={{ height: '46px', width: '1px', backgroundColor: '#000' }} />
            <ButtonBase onClick={() => dispatch(toggleAppFilterDrawer())} className='option'>
              <FiFilter size='2em' />
            </ButtonBase>
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
