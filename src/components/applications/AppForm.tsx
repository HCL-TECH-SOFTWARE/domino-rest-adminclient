/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext, useRef } from 'react';
import TextField from '@mui/material/TextField';
import styled from 'styled-components';
import { FormikProps } from 'formik';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, AlertTitle } from '@mui/material';
import ApplicationIcon from '@mui/icons-material/Apps';
import { IMG_DIR, KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppFormContext } from './ApplicationContext';
import { AppState } from '../../store';
import {
  ActionButtonBar,
  FormContentContainer,
  InputContainer,
  PanelContent,
} from '../../styles/CommonStyles';
import { LitAutocomplete, LitButton, LitCheckbox } from '../lit-elements/LitElements';
import appIcons from '../../styles/app-icons';

interface AppFormProps {
  formik: FormikProps<any>;
}

const ScopeField = styled.div`
  display: flex;
  flex-direction: row;
  gap: 30px;
  align-items: center;
  margin-top: 10px;
`;

const RemoveButton = styled.div`
  display: flex;
  height: 5px;
  weight: 5px;
  align-items: center;
  justify-content: center;
  margin: 10px 2px 10px 2px;
`;

const PillBoxRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: left;
`;

const PillBox = styled.div`
  display: flex;
  flex-direction: row;
  border: 1px solid grey;
  border-radius: 10px;
  padding: 2px 10px 2px 10px;
  margin: 0 2px 1px 0px;
  &:hover {
    background: ${KEEP_ADMIN_BASE_COLOR};
    color: white;
  }
`

const AppForm: React.FC<AppFormProps> = ({ formik }) => {
  const dispatch = useDispatch();
  const [formContext] = useContext(AppFormContext) as any;
  const { appError } = useSelector((state: AppState) => state.apps);
  const { appErrorMessage } = useSelector((state: AppState) => state.apps);
  const { scopes } = useSelector((state: AppState) => state.databases);
  const scopeValueArr = formik.values.appScope.length > 0 && formik.values.appScope.split(',');
  const [scopeValues, setScopeValues] = useState<Array<String>>(formContext === 'Edit' ? scopeValueArr : []);
  const [selectedIcon, setSelectedIcon] = useState('beach');

  const scopeAutocompleteRef = useRef<any>(null)
  const iconAutocompleteRef = useRef<any>(null)

  let scopeList: any[] = [];
  scopes.forEach((scope: any) => {
    if (!scopeValues.includes(scope.apiName))
      scopeList.push(scope.apiName);
  });
  scopeList.sort();
  if (!scopeValues.includes('MAIL'))
    scopeList.push('MAIL');
  if (!scopeValues.includes('$DATA'))
    scopeList.push('$DATA');
  if (!scopeValues.includes('$DECRYPT'))
    scopeList.push('$DECRYPT');

  const addScopeToApp = (scope: string) => {
    if (scope.trim() === '' || scopeValues.includes(scope)) {
      return;
    }
    const newScopeValues = scopeValues.concat([scope]);
    setScopeValues(newScopeValues);
    // store scope as string join by ',', due to openapi.core.json appScope validation need to be string
    const scopeValuesStr = newScopeValues.join(',');
    formik.values.appScope = scopeValuesStr;
  };

  const removeScopeFromApp = (scope: String) => {
    const newScopeValues = scopeValues.filter(oriScope => oriScope !== scope)
    setScopeValues(newScopeValues);
    // store scope as string join by ',', due to openapi.core.json appScope validation need to be string
    const scopeValuesStr = newScopeValues.join(',');
    formik.values.appScope = scopeValuesStr;
  };

  const onClickAddScope = () => {
    if (scopeAutocompleteRef.current && scopeAutocompleteRef.current.shadowRoot) {
      const inputElement = scopeAutocompleteRef.current.shadowRoot.querySelector('input')
      if (inputElement) {
        addScopeToApp(inputElement.value);
      }
    }
  }

  const onClickSubmitScope = async () => {
    formik.values.appIcon = selectedIcon;
    if (scopeAutocompleteRef.current) {
      scopeAutocompleteRef.current.selectedOption = "";
    }
    
    await formik.submitForm()
  }

  return (
    <FormContentContainer role="presentation" style={{ width: '90%' }}>
      <PanelContent onSubmit={formik.handleSubmit} className='flex flex-col w-90'>
        <span
          className="app-form-header background-keep-base full-width"
        >
          <ApplicationIcon />
          {formContext === 'Edit'
            ? ' Edit Application '
            : ' Add New Application '}
        </span>
        {appError && appErrorMessage && (
          <Alert style={{ margin: '5px 0' }} severity="error">
            <AlertTitle>Error: Unable to save application</AlertTitle>
            <span className='big-text color-text-danger'>
              {appErrorMessage}
            </span>
          </Alert>
        )}
        <InputContainer style={{ marginTop: 5 }}>
          <TextField
            autoComplete="off"
            fullWidth
            label="Application Name"
            id="app-name"
            name="appName"
            size="small"
            onChange={formik.handleChange}
            value={formik.values.appName}
            variant='standard'
          />
          {formik.errors.appName && formik.touched.appName ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appName}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer>
          <TextField
            autoComplete="off"
            size="small"
            fullWidth
            name="appDescription"
            label="Description"
            id="app-description"
            onChange={formik.handleChange}
            value={formik.values.appDescription}
            variant='standard'
          />
          {formik.errors.appDescription && formik.touched.appDescription ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appDescription}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer>
          <TextField
            autoComplete="off"
            size="small"
            fullWidth
            name="appCallbackUrlsStr"
            label="Callback URLs (one per line)"
            multiline
            minRows={4}
            maxRows={4}
            variant="outlined"
            id="callback-urls"
            onChange={formik.handleChange}
            value={formik.values.appCallbackUrlsStr}
          />
          {formik.errors.appCallbackUrlsStr &&
          formik.touched.appCallbackUrlsStr ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appCallbackUrlsStr}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer>
          <TextField
            autoComplete="off"
            size="small"
            fullWidth
            id="startup-page"
            name="appStartPage"
            label="Startup Page"
            onChange={formik.handleChange}
            value={formik.values.appStartPage}
            variant='standard'
          />
          {formik.errors.appStartPage && formik.touched.appStartPage ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appStartPage}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer>
          <small>Scope</small>
          <PillBoxRow>
              {scopeValues.map((scope, idx) => (
                <PillBox key={`${scope}-${idx}`}>
                  <span className='color-text-primary'>
                    {scope}
                  </span>
                  <RemoveButton onClick={() => removeScopeFromApp(scope)} >
                    <CloseIcon fontSize='inherit' />
                  </RemoveButton>
                </PillBox>
              ))}
          </PillBoxRow>
          <ScopeField>
            <LitAutocomplete
              options={scopeList}
              ref={scopeAutocompleteRef}
              style={{ width: '50%' }}
            />
          <LitButton
            src={`${IMG_DIR}/shoelace/plus.svg`}
            onClick={onClickAddScope}
          >
          </LitButton>
          </ScopeField>
          {!formik.values.appScope && formik.touched.appScope ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appScope}`}
            </span>
          ) : null}
        </InputContainer>
        <div className="flex flex-row items-center gap-2">
          <LitCheckbox
            checked={formik.values.appStatus}
            onChange={(e: any) => formik.setFieldValue('appStatus', e.target.checked)}
            size='m'
          />
          <span>Active</span>
        </div>
        <InputContainer>
          <TextField
            autoComplete="off"
            size="small"
            fullWidth
            name="appContactsStr"
            label="Contacts: email or URL (one per line)"
            multiline
            minRows={4}
            maxRows={4}
            variant="outlined"
            onChange={formik.handleChange}
            value={formik.values.appContactsStr}
          />
          {formik.errors.appContactsStr && formik.touched.appContactsStr ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.appContactsStr}`}
            </span>
          ) : null}
        </InputContainer>
        <small>App Icons</small>
        <LitAutocomplete
          ref={iconAutocompleteRef}
          options={Object.keys(appIcons)}
          icons={appIcons}
          style={{ width: '50%' }}
          selectedOption={selectedIcon}
          onChange={(e) => setSelectedIcon(e.currentTarget.selectedOption)}
          onInput={(e) => setSelectedIcon(e.currentTarget.selectedOption)} // Add this if your LitAutocomplete supports it
        />
        <div className="flex flex-row items-center gap-2">
          <LitCheckbox
            checked={formik.values.usePkce}
            onChange={(e: any) => formik.setFieldValue('usePkce', e.target.checked)}
            size='m'
          />
          <span>Use PKCE</span>
        </div>
      </PanelContent>
      <ActionButtonBar>
        <Button
          className="button-style"
          onClick={() => {
            dispatch(toggleApplicationDrawer());
          }}
        >
          Close
        </Button>
        <Button className="button-style" onClick={onClickSubmitScope}>
          {formContext === 'Edit' ? 'Update' : 'Add'}
        </Button>
      </ActionButtonBar>
    </FormContentContainer>
  );
};

export default AppForm;
