/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import * as React from 'react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { FORMS_ERROR } from '../../store/databases/types';
import { getDatabaseIndex } from '../../store/databases/scripts';
import { deleteForm, updateFormMode } from '../../store/databases/action';

const ToggleContainer = styled.div`
  .toggle-container {
    position: relative;
    width: 137px;
    height: 34px;
    background-color: #e6ebf5;
    cursor: pointer;
    user-select: none;
    border-radius: 5px;
    padding: 5px;
    /* margin-top: 20px; */
  }

  .toggle-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 68px;
    height: 24px;
    /* font-weight: bold; */
    font-size: 14px;
    line-height: 16px;
    cursor: pointer;
    color: #fff;
    background-color: #008000;
    box-shadow: 0 2px 4px rgb(0, 0, 0, 0.25);
    padding: 8px 12px;
    border-radius: 5px;
    position: absolute;
    transition: all 0.2s ease;
    left: 68px;
    overflow-x: visible;
    text-transform: none;
  }

  .disable {
    background-color: #6c7882;
    left: 2px;
  }

  .unchecked {
    left: 70px;
    position: absolute;
    color: #6c7882;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    line-height: 16px;
    padding: 4px 12px;
    text-transform: none;
  }

  .left {
    left: 2px;
  }
`

interface ActivateSwitchFormProps {
  form: any,
  forms: any,
  nsfPath: string,
  dbName: string,
}



const ActivateSwitchForm: React.FC<ActivateSwitchFormProps> = ({ form, forms, nsfPath,dbName }) => {
  const [toggle, setToggle] = useState(form.formModes.length > 0 ? true : false);
  const [resetView, setResetView] = useState(false);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { updateFormError } = useSelector((state: AppState) => state.databases);
  
  const { databases } = useSelector((state: AppState) => state.databases);

  const dispatch = useDispatch();
  const handleToggle = () => {
    if (loading) {
      dispatch(toggleAlert(`Please wait while forms are still saving!`));
      return;
    } else if (!toggle && (!updateFormError)) {
      toggleConfigure(form.formName);
      setToggle(toggle);
    } else if (!updateFormError) {
        setResetView(true);
    } else {
      dispatch({
        type: FORMS_ERROR,
        payload: false
      });
    }
  }

  const continueResetView = () => {
    toggleUnconfigure();
    setToggle(false);
    setResetView(false);
  }
  const toggleConfigure = (formName: string) => {
    const nsfPathDecode = decodeURIComponent(nsfPath);
    const formIndex = forms.findIndex(
      (f: { formName: string; dbName: string; }) => f.formName === formName && f.dbName === dbName
    );
    const formModeData = {
      modeName: "default",
      fields: [],
      readAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      writeAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      deleteAccessFormula: {
        formulaType: "domino",
        formula: "@False",
      },
      computeWithForm: false,
    };

    const currentSchema =
      databases[getDatabaseIndex(databases, dbName, nsfPathDecode)];
    const alias = forms[formIndex].alias;
    dispatch(
      updateFormMode(
        currentSchema,
        formName,
        alias,
        formModeData,
        formIndex,
        false
      ) as any
    );
  };


  const toggleUnconfigure = async () => {
    dispatch(deleteForm(databases[getDatabaseIndex(databases, dbName, nsfPath)],form.formName) as any);
  };


  return (
    <ToggleContainer>
      <div className='toggle-container' onClick={handleToggle}>
        {toggle}
        <Button disabled={loading} className={`toggle-btn ${!toggle ? 'disable' : ''}`}>{ toggle ? "Active" : "Inactive" }</Button>
        <Button disabled={loading} className={`unchecked ${toggle ? 'left' : ''}`}>{ toggle ? "Inactive" : "Active" }</Button>
      </div>
      <div>
      <Dialog
        open={resetView}
        onClose={() => {setResetView(false)}}
        aria-labelledby="reset-view-dialog"
        aria-describedby='reset-view-description'
      >
        <DialogTitle id="reset-view-dialog-title">
          {"Reset Form?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-view-dialog-contents" color='textPrimary'>
            Making this form unconfigure will delete all form modes and remove any configurations done to this form. Do you wish to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setResetView(false)}}>No</Button>
          <Button onClick={continueResetView}>Yes</Button>
        </DialogActions>
      </Dialog>
      </div>
    </ToggleContainer>

    
  );
};

export default ActivateSwitchForm;