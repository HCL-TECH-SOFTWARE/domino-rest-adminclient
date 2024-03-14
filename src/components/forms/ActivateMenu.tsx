/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem, Typography } from '@material-ui/core';
import * as React from 'react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { Database, FORMS_ERROR } from '../../store/databases/types';
import { deleteForm, updateFormMode } from '../../store/databases/action';
import { BsThreeDots } from "react-icons/bs";

const ActionContainer = styled.div`
  display: flex;
  gap: 10px;

  .menu-container {
      &:hover: {
          cursor: pointer;
      }
  }

  .toggle-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 68px;
    height: 24px;
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

interface ActivateMenuProps {
  form: any,
  forms: any,
  nsfPath: string,
  dbName: string,
  schemaData: Database,
  setSchemaData: (schemaData: any) => void;
  formList: Array<string>;
}



const ActivateMenu: React.FC<ActivateMenuProps> = ({ form, forms, nsfPath, dbName, schemaData, setSchemaData, formList }) => {
  const [activatedForms, setActivatedForms] = useState(schemaData.forms.map((form) => form.formName))
  const [active, setActive] = useState(activatedForms.includes(form.formName))
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [resetForm, setResetForm] = useState(false);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { updateFormError } = useSelector((state: AppState) => state.databases);
  
  const dispatch = useDispatch();

  const handleClickActivate = () => {
    if (loading) {
        dispatch(toggleAlert(`Please wait while forms are still saving!`))
    } else if (!active && (!updateFormError)) {
      toggleConfigure(form.formName)
    } else if (!updateFormError) {
      dispatch(toggleAlert(`This form is already active!`))
    } else {
      dispatch({
        type: FORMS_ERROR,
        payload: false
      });
    }
    handleCloseMenu()
  }

  const handleClickDeactivate = () => {
    setResetForm(true)
  }

  const handleConfirmDeactivate = () => {
    toggleUnconfigure()
    setActive(false)
    setResetForm(false)
  }
  const toggleConfigure = (formName: string) => {
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

    const alias = forms[formIndex].alias;
    dispatch(
      updateFormMode(
        schemaData,
        formName,
        alias,
        formModeData,
        formIndex,
        false,
        setSchemaData
      ) as any
    );
  };

  const toggleUnconfigure = async () => {
    if (formList.includes(form.formName)) {
      dispatch(deleteForm(schemaData, form.formName) as any)
    } else {
      dispatch(deleteForm(schemaData, form.formName, setSchemaData) as any)
    }
    handleCloseMenu()
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
    setOpen(true)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
    setOpen(false)
  }

  React.useEffect(() => {
    const activatedFormsBuffer = schemaData.forms.map((form) => form.formName)
    setActivatedForms(activatedFormsBuffer)
    setActive(activatedFormsBuffer.includes(form.formName))
  }, [form, schemaData])

  return (
    <ActionContainer>
        <Box display='flex' flexDirection='column' justifyContent='center'>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="4" cy="5" r="4" fill={active ? '#0FA068' : '#8291A0'}/>
          </svg>
        </Box>
        <Typography
            variant='body1'
            style={{
                color: active ? '#0FA068' : '#8291A0',
                fontSize: '14px' }}
        >
            {active ? `Active` : `Inactive`}
        </Typography>
        <ButtonBase onClick={handleOpenMenu}>
            <BsThreeDots  className='menu-container'/>
        </ButtonBase>
        <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
        >
            <MenuItem onClick={handleClickActivate} disabled={!formList.includes(form.formName)}>Activate</MenuItem>
            <MenuItem onClick={handleClickDeactivate} disabled={!formList.includes(form.formName)}>Deactivate</MenuItem>
            <MenuItem onClick={handleClickDeactivate} disabled={formList.includes(form.formName)}>Delete</MenuItem>
        </Menu>
        <Dialog
            open={resetForm}
            onClose={() => {setResetForm(false)}}
            aria-labelledby="reset-view-dialog"
            aria-describedby='reset-view-description'
        >
            <DialogTitle id="reset-view-dialog-title">
                {
                    formList.includes(form.formName) ?
                    `Reset Form?`
                    :
                    `WARNING: Deleting Custom Form`
                }
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="reset-view-dialog-contents" color='textPrimary'>
                    {
                        formList.includes(form.formName) ?
                        `Deactivating this form will delete all form modes and remove any configurations done to this form. Do you wish to proceed?`
                        :
                        `This is a custom form. Deactivating this form will DELETE it from the schema entirely, which means you won't be able to retrieve it. Do you wish to proceed?`
                    }
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {setResetForm(false)}}>No</Button>
                <Button onClick={handleConfirmDeactivate}>Yes</Button>
            </DialogActions>
        </Dialog>
    </ActionContainer>
    
  );
};

export default ActivateMenu;