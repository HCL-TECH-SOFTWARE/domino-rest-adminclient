/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Menu, MenuItem } from '@mui/material';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { Database, FORMS_ERROR } from '../../store/databases/types';
import { deleteForm } from '../../store/databases/action';
import { BsThreeDots } from "react-icons/bs";
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

interface ActivateMenuProps {
  form: any,
  forms: any,
  nsfPath: string,
  dbName: string,
  schemaData: Database,
  setSchemaData: (schemaData: any) => void;
  formList: Array<string>;
  toggleActivate: (formName: string, openForm: boolean) => void;
}



const ActivateMenu: React.FC<ActivateMenuProps> = ({ form, forms, nsfPath, dbName, schemaData, setSchemaData, formList, toggleActivate }) => {
  const [active, setActive] = useState(form.formModes.length > 0 ? true : false);
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [resetForm, setResetForm] = useState(false);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { updateFormError } = useSelector((state: AppState) => state.databases);

  const ref = useRef<HTMLDialogElement>(null);
  
  const dispatch = useDispatch();

  const handleClickActivate = () => {
    if (loading) {
        dispatch(toggleAlert(`Please wait while forms are still saving!`))
    } else if (!active && (!updateFormError)) {
        toggleActivate(form.formName, false)
        setActive(active)
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
    toggleDeactivate()
    setActive(false)
    setResetForm(false)
  }

  const toggleDeactivate = async () => {
    if (formList.includes(form.formName)) {
      dispatch(deleteForm(schemaData, form.formName, setSchemaData) as any)
    } else {
      dispatch(deleteForm(schemaData, form.formName, setSchemaData, true) as any)
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

  useEffect(() => {
      if (resetForm) {
        ref.current?.showModal()
      } else {
        if (ref.current?.close) {
          ref.current?.close()
        }
      }
    }, [resetForm])

  return (
    <div className='activate-menu-container'>
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="black">
          <circle cx="4" cy="5" r="4" fill={active ? '#0FA068' : '#8291A0'}/>
      </svg>
      <text className={`small-text ${active ? 'active-text' : 'inactive-text'}`}>
        {active ? `Active` : `Inactive`}
      </text>
      <button onClick={handleOpenMenu} className='active-menu-button'>
          <BsThreeDots className='color-text-primary' />
      </button>
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
      <dialog ref={ref} className='dialog'>
        <FormDialogHeader
          title={formList.includes(form.formName) ? `Reset Form?` : `WARNING: Deleting Custom Form`}
          onClose={() => setResetForm(false)}
        />
        <div className='dialog-content'>
          <text id="reset-view-dialog-contents" className='dialog-content-text'>
            {
                formList.includes(form.formName) ?
                `Deactivating this form will delete all form modes and remove any configurations done to this form. Do you wish to proceed?`
                :
                `This is a custom form. DELETING this form removes it from the schema entirely, which means you won't be able to retrieve it. Do you wish to proceed?`
            }
          </text>
        </div>
        <div className='dialog-actions'>
          <LitButtonNeutral text='No' onClick={() => {setResetForm(false)}} />
          <LitButtonYes text='Yes' onClick={handleConfirmDeactivate} />
        </div>
      </dialog>
    </div>
    
  );
};

export default ActivateMenu;