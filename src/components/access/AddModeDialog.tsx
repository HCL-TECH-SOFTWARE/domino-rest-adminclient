/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import { KeepButton, KeepFormDialogHeader } from '../keep-elements/KeepElements';

interface AddmodeDialogProps {
  open: boolean;
  handleClose: () => void;
  handleSave: () => void;
  formError: string;
  handleTextChange: any;
  clone: boolean;
  modeName: string;
}

const AddModeDialog: React.FC<AddmodeDialogProps> = ({
  open,
  handleClose,
  handleSave,
  formError,
  handleTextChange,
  clone,
  modeName
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      className='add-mode-dialog-container'
    >
      <div className='dialog-content gap-20'>
        <KeepFormDialogHeader heading={clone ? `Clone ${modeName}` : `Add New Mode`} onClose={handleClose} />
        <div className='add-mode-content-container'>
          <div className='flex flex-col gap-5'>
            <p className='add-mode-content-text'>
              Example: dql, draft, archive
            </p>
            <TextField
              onChange={handleTextChange}
              autoFocus
              margin="none"
              id="modeName"
              placeholder="Mode Name"
              type="text"
              fullWidth
            />
            {formError && (
              <p className='small-text color-text-danger'>{formError}</p>
              )
            }
          </div>
        </div>
      </div>
      <div className='dialog-actions'>
        <KeepButton variant="neutral" appearance="outlined"
          onClick={handleClose}
          className='dialog-actions-button'
        >Cancel</KeepButton>
        <KeepButton onClick={handleSave} className='dialog-actions-button'>Save</KeepButton>
      </div>
    </dialog>
  );
};

export default AddModeDialog;
