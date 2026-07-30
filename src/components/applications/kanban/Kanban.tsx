/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { Dialog } from '@mui/material';
import { styled } from '@linaria/react';
import {
  deleteApplication,
  fetchMyApps,
} from '../../../store/applications/action';
import { AppState } from '../../../store';
import { toggleAlert } from '../../../store/alerts/action';
import FormDrawer from '../FormDrawer';
import { toggleDeleteDialog } from '../../../store/dialog/action';
import { AppFormContext } from '../ApplicationContext';
import { toggleAppFilterDrawer, toggleApplicationDrawer } from '../../../store/drawer/action';
import { TopContainer } from '../../../styles/CommonStyles';
import { fetchUsers } from '../../../store/access/action';
import { getConsents } from '../../../store/consents/action';
import {
  KeepAppsTable,
  KeepButton,
  KeepConfirmDeleteDialog,
  KeepConsents,
} from '../../keep-elements/KeepElements';
import { useAppDispatch } from '../../../store/hooks';
import type { KeepAppItemEditDetail } from '../../keep-elements/keep-app-item';

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

const Kanban: React.FC = () => {
  const { appPull } = useSelector((selector: AppState) => selector.apps);
  const { permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const [selected, setSelected] = useState('');
  const dispatch = useAppDispatch();
  const [, setFormContext] = useContext(AppFormContext) as any;
  const icon = useState('beach')[0];
  const deleteAppTitle: string = 'Delete Application';
  const deleteAppMessage: string =
    'Are you sure you want to delete this Application?';
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)

  const openDeleteDialog = (appId: string) => {
    dispatch(toggleDeleteDialog());
    setSelected(appId);
  };

  const handleOpenConsents = () => {
    if (!appPull) dispatch(fetchMyApps())
    dispatch(fetchUsers())
    dispatch(getConsents())
    setConsentDialogOpen(true)
  }

  const deleteApp = () => {
    dispatch(deleteApplication(selected));
  };

  /**
   * The Application form's values, and nothing else.
   *
   * This object is not a form any more. `keep-app-form` owns the fields, the validation and
   * the save; what survives here is the transport `FormDrawer` reads to seed it — the row's
   * values pushed in by {@link handleAppEdit}, cleared by {@link createAction}.
   *
   * Its `onSubmit` used to hold the `updateApp`/`addApplication` branch, and that copy became
   * unreachable when wave 4 (#936) moved the save into the element: nothing in `src` calls
   * `handleSubmit` or `submitForm` on it, and the form the user types into is not bound to it.
   * Deleted rather than left in place, so there is one save path rather than two. The property
   * itself stays because `useFormik` requires it.
   *
   * The `validationSchema` went with it, for the same reason and from the same commit: #936
   * moved those four rules into `keep-app-form`, which declares them again and is the only
   * thing that runs them. Nothing here validates anything.
   */
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
    // Required by useFormik and never reached — see the block comment above.
    onSubmit: () => {},
  });

  /**
   * A row asked to be edited: seed the form with its values and open the drawer.
   *
   * Both halves are what `AppItem` did itself before the conversion, in this order.
   *
   * **#939 belongs here.** The drawer decides Add versus Edit from the `formContext` string,
   * and this path — the only reachable edit entry point — never sets it, so a save from here
   * takes the create branch and duplicates the application. Reproduced exactly rather than
   * fixed, because the fix is a behavioural change that issue owns. When it is taken, this is
   * the one place that has to say the drawer is opening on an existing row; the issue argues
   * for deriving the mode from the presence of these values rather than adding a third
   * `setFormContext` call site, and this handler is where that presence is known.
   */
  const handleAppEdit = (event: CustomEvent<KeepAppItemEditDetail>) => {
    formik.setValues(event.detail.values);
    dispatch(toggleApplicationDrawer());
  };

  /**
   * createAction is called when the Create Application button is clicked
   * to open the Create form
   */
  const createAction = () => {
    if(permissionCreate){
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
        <TopContainer className='mt-15'>
          <p className='header-text'>
            Application Management
          </p>
          <OptionsContainer>
            <KeepButton
              icon="plus"
              onClick={createAction}
            >
              Add Application
            </KeepButton>
            <KeepButton
              onClick={handleOpenConsents}
            >
              OAuth Consents
            </KeepButton>
            <div className='kanban-div' />
            <button
              onClick={() => dispatch(toggleAppFilterDrawer())}
              className='option no-background no-border cursor-pointer m-0 p-0'
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"/>
              </svg>
            </button>
          </OptionsContainer>
        </TopContainer>
        <AppStackContainer>
          <KeepAppsTable
            onAppEdit={handleAppEdit}
            onAppDelete={(event) => openDeleteDialog(event.detail.appId)}
          />
        </AppStackContainer>
        <KeepConfirmDeleteDialog
          heading={deleteAppTitle}
          message={deleteAppMessage}
          onConfirm={deleteApp}
        />
        <FormDrawer formName="AppForm" formik={formik} />
        <ConsentsDialogContainer open={consentDialogOpen} onClose={() => {setConsentDialogOpen(false)}} fullScreen>
          <KeepConsents
            dialog
            onClose={() => {setConsentDialogOpen(false)}}
          />
        </ConsentsDialogContainer>
      </AppContainer>
    </>
  );
};

export default Kanban;
