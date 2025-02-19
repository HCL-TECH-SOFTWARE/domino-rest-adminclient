/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { Buttons } from '../../styles/CommonStyles';
import styled from 'styled-components';
import { LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

const DialogContainer = styled.dialog`
  border: 1px solid white;
  border-radius: 10px;
  width: 30%;
  padding: 30px;
  height: fit-content;

  .content-container {
    padding: 0 0 55px 0;
    margin: 0;
  }

  .content-text {
    font-size: 16px;
    padding: 0;
    margin: 0;
  }

  .dialog-buttons {
    padding: 0 30px 30px 30px
    display: flex;
    flex-direction: row-reverse;
  }
`

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
    <DialogContainer
      ref={ref}
      onClose={handleClose}
    >
      <FormDialogHeader title={clone ? `Clone ${modeName}` : `Add New Mode`} onClose={handleClose} />
      <DialogContent className='content-container'>
        <DialogContentText color="textPrimary" className='content-text'>
          Example: dql, draft, archive
        </DialogContentText>
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
          <Typography color="error">{formError}</Typography>
          )
        }
      </DialogContent>
      <DialogActions>
        <Buttons className='dialog-buttons'>
          <LitButtonNeutral onClick={handleClose} style={{ right: 'calc(30px + 93px + 5px)' }} text='Cancel' />
          <LitButtonYes onClick={handleSave} style={{ right: '30px' }} text='Save' />
        </Buttons>
      </DialogActions>
    </DialogContainer>
  );
};

export default AddModeDialog;
