/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import { useSelector, useDispatch } from 'react-redux';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { Buttons } from '../../styles/CommonStyles';
import { LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

interface DeleteApplicationDialogProps {
  dialogTitle: string;
  deleteMessage: string;
  handleDelete: () => void;
}

/**
 * This component displays a Delete confirmation dialog
 *
 * @author Neil Schultz
 *
 * @param deleteMessage the delete confirmation message
 * @param handleDelete the delete method
 */
const DeleteApplicationDialog: React.FC<DeleteApplicationDialogProps> = ({
  dialogTitle,
  deleteMessage,
  handleDelete,
}) => {
  const { deleteDialogOpen } = useSelector((state: AppState) => state.apps);
  const dispatch = useDispatch();
  return (
    <Dialog
      open={deleteDialogOpen}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      PaperProps={{ style: { borderRadius: '10px' } }}
      sx={{ overflowY: 'auto' }}
    >
      <FormDialogHeader
        title={dialogTitle}
        onClose={() => dispatch(toggleDeleteDialog())}
      />
      <DialogContent style={{ padding: '0' }} >
        <DialogContentText color="textPrimary" style={{ padding: '20px' }} >
          {deleteMessage}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Buttons>
          <LitButtonNeutral
            onClick={() => dispatch(toggleDeleteDialog())}
            text='No'
          />
          <LitButtonYes onClick={handleDelete} text='Yes' autoFocus />
        </Buttons>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteApplicationDialog;
