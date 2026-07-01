/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import styled from 'styled-components';
import { FormikProps } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppState } from '../../store';
import { clearFormulaResults } from '../../store/databases/action';
import {
  FormContentContainer,
  PanelContent,
  PageLegend,
  InputContainer,
  ActionButtonBar,
  AutoContainer,
} from '../../styles/CommonStyles';
import { LitCheckbox } from '../lit-elements/LitElements';

const TestsPanel = styled.div`
  padding-left: 35px;
  margin: 0px;
  width: 100%;
`;

const ResultsPanel = styled.div`
  padding-left: 35px;
  margin: 0px;
  width: 100%;
`;

interface TestFormProps {
  formik: FormikProps<any>;
}

/**
 * TestForm provides a means of testing the formulas entered on the formulas page
 *
 * @author Neil Schultz
 *
 */
const TestForm: React.FC<TestFormProps> = ({ formik }) => {
  // Display test results based on which tests were run
  const displayTestResults = useSelector(
    (state: AppState) => state.databases.displayTestResults
  );
  const displayReadResults = useSelector(
    (state: AppState) => state.databases.displayReadResults
  );
  const readFormulaResults = useSelector(
    (state: AppState) => state.databases.readFormulaResults
  );
  const displayWriteResults = useSelector(
    (state: AppState) => state.databases.displayWriteResults
  );
  const writeFormulaResults = useSelector(
    (state: AppState) => state.databases.writeFormulaResults
  );
  const displayDeleteResults = useSelector(
    (state: AppState) => state.databases.displayDeleteResults
  );
  const deleteFormulaResults = useSelector(
    (state: AppState) => state.databases.deleteFormulaResults
  );
  const displayLoadResults = useSelector(
    (state: AppState) => state.databases.displayLoadResults
  );
  const loadFormulaResults = useSelector(
    (state: AppState) => state.databases.loadFormulaResults
  );
  const displaySaveResults = useSelector(
    (state: AppState) => state.databases.displaySaveResults
  );
  const saveFormulaResults = useSelector(
    (state: AppState) => state.databases.saveFormulaResults
  );
  const dispatch = useDispatch();

  return (
    <FormContentContainer role="presentation" style={{width: '100%'}}>
      {!displayTestResults &&
        <TestsPanel>
          <CloseIcon
            cursor="pointer"
            className="close-icon float-right"
            onClick={() => {
              dispatch(toggleApplicationDrawer());
              dispatch(clearFormulaResults());
            }}
          />
          <PanelContent onSubmit={formik.handleSubmit}>
            <span className="header-title background-badge">
              Test Formulas
            </span>
            <PageLegend>
              <span className='large-text'>
                Select the formulas you would like to test
              </span>
            </PageLegend>
            <FormGroup className='flex p-16 gap-5'>
              <FormControlLabel
              control={
                  <LitCheckbox
                    checked={formik.values.readFormula}
                    onChange={(e: any) => formik.setFieldValue('readFormula', e.target.checked)}
                  />
                }
                label="Read Access Formula"
              />
              <FormControlLabel
                control={
                  <LitCheckbox
                    checked={formik.values.writeFormula}
                    onChange={(e: any) => formik.setFieldValue('writeFormula', e.target.checked)}
                  />
                }
                label="Write Access Formula"
              />
              <FormControlLabel
                control={
                  <LitCheckbox
                    checked={formik.values.deleteFormula}
                    onChange={(e: any) => formik.setFieldValue('deleteFormula', e.target.checked)}
                  />
                }
                label="Delete Access Formula"
              />
              <FormControlLabel
                control={
                  <LitCheckbox
                    checked={formik.values.loadFormula}
                    onChange={(e: any) => formik.setFieldValue('loadFormula', e.target.checked)}
                  />
                }
                label="On Load Formula"
              />
              <FormControlLabel
                control={
                  <LitCheckbox
                    checked={formik.values.saveFormula}
                    onChange={(e: any) => formik.setFieldValue('saveFormula', e.target.checked)}
                  />
                }
                label="On Save Formula"
              />
            </FormGroup>
            <InputContainer style={{ marginTop: 5 }}>
              <TextField
                autoComplete="off"
                fullWidth
                label="User Name"
                name="userId"
                size="small"
                onChange={formik.handleChange}
                value={formik.values.userId}
              />
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                label="Document Id"
                name="documentId"
                onChange={formik.handleChange}
                value={formik.values.documentId}
              />
            </InputContainer>
          </PanelContent>
          <ActionButtonBar>
          <Button 
         className='button-style'
          onClick={() => {
            dispatch(toggleApplicationDrawer());
            dispatch(clearFormulaResults());
            }
          }
        >
          {'Close'}
        </Button>
            <Button className="button-style" onClick={formik.submitForm}>
              {'Run Test'}
            </Button>
            </ActionButtonBar>
      </TestsPanel> 
    }
    {displayTestResults && <ResultsPanel>
      <CloseIcon cursor="pointer" className="close-icon float-right"
        onClick={() => {
            dispatch(toggleApplicationDrawer());
            dispatch(clearFormulaResults());
          }
        }
      />
      <PanelContent>
            <span className="header-title background-badge" >
              Test Formula Results
            </span>
            <PageLegend>
              <span className="large-text" >
                The test results for the selected Formulas
              </span>
            </PageLegend>
            {displayReadResults && 
              <AutoContainer>
                <span className="text-bold color-text-primary">
                  {'Read Formula Results:'}
                </span>
                <span className="color-text-primary">
                  {readFormulaResults}
                </span>
              </AutoContainer>}

            {displayWriteResults && 
              <AutoContainer>
                <span className="text-bold color-text-primary">
                  Write Formula Results:
                </span>
                <span className="color-text-primary">
                  {writeFormulaResults}
                </span>
                                </AutoContainer>}

            {displayDeleteResults && 
              <AutoContainer>
                <span className="text-bold color-text-primary">
                  {'DeleteFormula Results'}
                </span>
                <span className="color-text-primary">
                  {deleteFormulaResults}
                </span>
                                 </AutoContainer>}

            {displayLoadResults && 
              <AutoContainer>
                <span className="text-bold color-text-primary">
                  {'Load Formula Results'}
                </span>
                <span className="color-text-primary">
                  {loadFormulaResults}
                </span>
                               </AutoContainer>}

            {displaySaveResults && 
              <AutoContainer>
                <span className="text-bold color-text-primary">
                  {'Save Formula Results'}
         </span>
                <span className="color-text-primary">
                  {saveFormulaResults}
                </span>
                               </AutoContainer>}
          </PanelContent>
          <ActionButtonBar>
            <Button
              className="button-style"
              onClick={() => {
                dispatch(toggleApplicationDrawer());
                dispatch(clearFormulaResults());
              }}
        >
          Close
            </Button>
          </ActionButtonBar>
        </ResultsPanel>}
    </FormContentContainer>
  );
};

export default TestForm;
