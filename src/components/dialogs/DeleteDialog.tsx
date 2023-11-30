/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import { useSelector, useDispatch } from 'react-redux';
import CircularProgress from '@material-ui/core/CircularProgress';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { deleteSchema, deleteScope } from '../../store/databases/action';
import FormDialogHeader from './FormDialogHeader';

interface DeleteDialogProps {
  open: boolean;
  selected: any;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, selected }) => {
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { isDeleteSchema, nsfPath, schemaName, apiName } = selected;
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(toggleDeleteDialog());
  };

  const onDelete = () => {
    isDeleteSchema ? dispatch(deleteSchema({ nsfPath, schemaName }) as any) : dispatch(deleteScope(apiName) as any);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="delete-dialog"
      aria-describedby="alert-dialog-description"
    >
      <FormDialogHeader
        title={loading ? `Deleting ${isDeleteSchema ? schemaName : apiName}` : `Delete ${isDeleteSchema ? schemaName : apiName}?`}
        onClose={handleClose}
      />
      <DialogContent>
        {loading ? (
          <div
            style={{
              minWidth: 400,
              height: 150,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CircularProgress color="primary" />
          </div>
        ) : (
          <>
            <DialogContentText
              color="textPrimary"
              id="alert-dialog-description"
              style={{textOverflow: 'ellipsis', overflow: 'hidden', wordBreak: 'break-word'}}
            >
              {`You'll lose all settings of the ${isDeleteSchema? 'schema' : 'scope'}: ${isDeleteSchema ? schemaName : apiName}. You cannot
              recover them once you delete.`}
              <span style={{ display: 'flex', margin: '20px 0' }}>
                Are you sure you want to permanently delete this {isDeleteSchema? 'schema' : 'scope'}?
              </span>
            </DialogContentText>
            <DialogActions>
              <Button onClick={handleClose} color="secondary">
                No
              </Button>
              <Button onClick={onDelete} color="primary" autoFocus>
                Yes
              </Button>
            </DialogActions>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;
