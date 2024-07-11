/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { Buttons } from '../../styles/CommonStyles';
import styled from 'styled-components';

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
          <Button onClick={handleClose} className='cancel btn' style={{ right: 'calc(30px + 93px + 5px)' }}>
            <span>Cancel</span>
          </Button>
          <Button onClick={handleSave} className='save btn' style={{ right: '30px' }}>
            <span style={{ color: 'white' }}>Save</span>
          </Button>
        </Buttons>
      </DialogActions>
    </DialogContainer>
  );
};

export default AddModeDialog;
