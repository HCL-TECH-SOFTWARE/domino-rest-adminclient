/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import CheckboxIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import styled from 'styled-components';
import { FormikProps } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
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
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              Test Formulas
            </Typography>
            <PageLegend>
              <Typography
                component="p"
                variant="caption"
                style={{ fontSize: 18 }}
              >
                Select the formulas you would like to test
              </Typography>
            </PageLegend>
            <FormGroup>
              <FormControlLabel
              control={
                  <Checkbox
                    color="primary"
                    checked={formik.values.readFormula}
                    onChange={formik.handleChange}
                    icon={<CheckboxIcon fontSize="small" color="primary" />}
                    name="readFormula"
                  />
                }
                label="Read Access Formula"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={formik.values.writeFormula}
                    onChange={formik.handleChange}
                    icon={<CheckboxIcon fontSize="small" color="primary" />}
                    name="writeFormula"
                  />
                }
                label="Write Access Formula"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={formik.values.deleteFormula}
                    onChange={formik.handleChange}
                    icon={<CheckboxIcon fontSize="small" color="primary" />}
                    name="deleteFormula"
                  />
                }
                label="Delete Access Formula"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={formik.values.loadFormula}
                    onChange={formik.handleChange}
                    icon={<CheckboxIcon fontSize="small" color="primary" />}
                    name="loadFormula"
                  />
                }
                label="On Load Formula"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={formik.values.saveFormula}
                    onChange={formik.handleChange}
                    icon={<CheckboxIcon fontSize="small" color="primary" />}
                    name="saveFormula"
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
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              Test Formula Results
            </Typography>
            <PageLegend>
              <Typography
                component="p"
                variant="caption"
                style={{ fontSize: 18 }}
              >
                The test results for the selected Formulas
              </Typography>
            </PageLegend>
            {displayReadResults && 
              <AutoContainer>
                <Typography className="bold-text" color="textPrimary">
                  {'Read Formula Results:'}
                </Typography>
                <Typography color="textPrimary">
                  {readFormulaResults}
                </Typography>
              </AutoContainer>}

            {displayWriteResults && 
              <AutoContainer>
                <Typography className="bold-text" color="textPrimary">
                  Write Formula Results:
                </Typography>
                <Typography color="textPrimary">
                  {writeFormulaResults}
                </Typography>
                                </AutoContainer>}

            {displayDeleteResults && 
              <AutoContainer>
                <Typography className="bold-text" color="textPrimary">
                  {'DeleteFormula Results'}
                </Typography>
                <Typography color="textPrimary">
                  {deleteFormulaResults}
                </Typography>
                                 </AutoContainer>}

            {displayLoadResults && 
              <AutoContainer>
                <Typography className="bold-text" color="textPrimary">
                  {'Load Formula Results'}
                </Typography>
                <Typography color="textPrimary">
                  {loadFormulaResults}
                </Typography>
                               </AutoContainer>}

            {displaySaveResults && 
              <AutoContainer>
                <Typography className="bold-text" color="textPrimary">
                  {'Save Formula Results'}
         </Typography>
                <Typography color="textPrimary">
                  {saveFormulaResults}
                </Typography>
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
