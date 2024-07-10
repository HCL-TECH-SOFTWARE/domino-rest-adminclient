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
import { toggleDeleteDialog, toggleErrorDialog } from '../../store/dialog/action';

interface NetworkErrorDialogProps {
  dialogTitle: string;
  errorMessage: string;
  handleDelete: () => void;
}

/**
 * This component displays a Delete confirmation dialog
 *
 * @param deleteMessage the delete confirmation message
 * @param handleDelete the delete method
 */
const NetworkErrorDialog: React.FC = () => {
  const { errorDialogOpen, errorDialogMessage } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  return (
    <Dialog
      open={errorDialogOpen}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <FormDialogHeader
        title="Error"
        onClose={() => dispatch(toggleErrorDialog(errorDialogMessage))}
      />
      <DialogContent>
        <DialogContentText color="textPrimary">
          {errorDialogMessage}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch(toggleErrorDialog(errorDialogMessage))} color="primary" autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NetworkErrorDialog;
