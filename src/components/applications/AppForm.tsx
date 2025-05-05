/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext, SyntheticEvent } from 'react';
import TextField from '@mui/material/TextField';
import { Autocomplete } from '@mui/material';
import styled from 'styled-components';
import { FormikProps } from 'formik';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, AlertTitle } from '@mui/material';
import ApplicationIcon from '@mui/icons-material/Apps';
import AddIcon from '@mui/icons-material/Add';
import CheckboxIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { Checkbox, FormControlLabel } from '@mui/material';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import AppIcons from './AppIcons';
import { clearAppError } from '../../store/applications/action';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppFormContext } from './ApplicationContext';
import { AppState } from '../../store';
import {
  ActionButtonBar,
  FormContentContainer,
  InputContainer,
  PanelContent,
} from '../../styles/CommonStyles';

interface AppFormProps {
  formik: FormikProps<any>;
}

const ScopeField = styled.div`
  display: flex;
  flex-direction: row;
`;

const TypeAHeadField = styled(InputContainer)`
  width: 200px;
`;

const AddButton = styled.div`
  display: flex;
  background: ${KEEP_ADMIN_BASE_COLOR};
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
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
  margin: 1px 2px 1px 0px;
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
  const [scopeValuePlaceholder, setScopeValuePlaceholder] = useState<string>('');

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
      setScopeValuePlaceholder('');
      return;
    }
    const newScopeValues = scopeValues.concat([scope]);
    setScopeValues(newScopeValues);
    // store scope as string join by ',', due to openapi.core.json appScope validation need to be string
    const scopeValuesStr = newScopeValues.join(',');
    formik.values.appScope = scopeValuesStr;
    // clean up input field
    setScopeValuePlaceholder('');
  };

  const removeScopeFromApp = (scope: String) => {
    const newScopeValues = scopeValues.filter(oriScope => oriScope !== scope)
    setScopeValues(newScopeValues);
    // store scope as string join by ',', due to openapi.core.json appScope validation need to be string
    const scopeValuesStr = newScopeValues.join(',');
    formik.values.appScope = scopeValuesStr;
    // clean up input field
    setScopeValuePlaceholder('');
  };

  const HandleScopeInputChange = (event: SyntheticEvent, value: any) => {
    if(event !== null && event.type !== 'blur') {
      setScopeValuePlaceholder(value);
    }
  };

  return (
    <FormContentContainer role="presentation" style={{ width: '100%' }}>
      <CloseIcon
        cursor="pointer"
        className="close-icon float-right"
        onClick={() => {
          dispatch(clearAppError());
          dispatch(toggleApplicationDrawer());
        }}
      />
      <PanelContent onSubmit={formik.handleSubmit}>
        <Typography
          className="header-title"
          style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
        >
          <ApplicationIcon />
          {formContext === 'Edit'
            ? ' Edit Application '
            : ' Add New Application '}
        </Typography>
        {appError && appErrorMessage && (
          <Alert style={{ margin: '5px 0' }} severity="error">
            <AlertTitle>Error: Unable to save application</AlertTitle>
            <Typography
              style={{ fontSize: 18 }}
              component="p"
              variant="caption"
            >
              {appErrorMessage}
            </Typography>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appName}`}
            </Typography>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appDescription}`}
            </Typography>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appCallbackUrlsStr}`}
            </Typography>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appStartPage}`}
            </Typography>
          ) : null}
        </InputContainer>
        <InputContainer>
          <Typography
            className=""
          >
            Scope
          </Typography>
          <PillBoxRow>
              {scopeValues.map((scope, idx) => (
                <PillBox key={`${scope}-${idx}`}>
                  <Typography>
                    {scope}
                  </Typography>
                  <RemoveButton onClick={() => removeScopeFromApp(scope)} >
                    <CloseIcon fontSize='inherit' />
                  </RemoveButton>
                </PillBox>
              ))}
          </PillBoxRow>
          <ScopeField>
            <TypeAHeadField>
              <Autocomplete
                disablePortal
                id="typeahead-scope"
                options={scopeList}
                fullWidth
                renderInput={(params: any) => <TextField {...params} placeholder="Scope" label="" variant='standard' />}
                onInputChange={HandleScopeInputChange}
                inputValue={scopeValuePlaceholder}
              />
            </TypeAHeadField>
            <AddButton>
              <Button title="Add Scope" style={{minWidth: '30px'}} onClick={() => addScopeToApp(scopeValuePlaceholder)} >
                <AddIcon style={{ color: 'white' }}/>
              </Button>
            </AddButton>
          </ScopeField>
          {!formik.values.appScope && formik.touched.appScope ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appScope}`}
            </Typography>
          ) : null}
        </InputContainer>
        <InputContainer>
          <FormControlLabel
            control={
              <Checkbox
                checked={formik.values.appStatus}
                color="primary"
                icon={<CheckboxIcon fontSize="medium" color="primary" />}
              />
            }
            label="Active"
            name="appStatus"
            onChange={formik.handleChange}
            value={formik.values.appStatus}
          />
        </InputContainer>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.appContactsStr}`}
            </Typography>
          ) : null}
        </InputContainer>
        <AppIcons formik={formik} />
        <InputContainer>
          <FormControlLabel
            control={
              <Checkbox
                checked={formik.values.usePkce}
                color="primary"
                icon={<CheckboxIcon fontSize="medium" color="primary" />}
              />
            }
            label="use PKCE"
            name="usePkce"
            onChange={formik.handleChange}
            value={formik.values.usePkce}
          />
        </InputContainer>
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
        <Button className="button-style" onClick={formik.submitForm}>
          {formContext === 'Edit' ? 'Update' : 'Add'}
        </Button>
      </ActionButtonBar>
    </FormContentContainer>
  );
};

export default AppForm;
