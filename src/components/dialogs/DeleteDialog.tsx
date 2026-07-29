/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { deleteSchema, deleteScope } from '../../store/databases/action';
import { KeepButton, KeepFormDialogHeader } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

interface DeleteDialogProps {
  open: boolean;
  selected: any;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, selected }) => {
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { isDeleteSchema, nsfPath, schemaName, apiName } = selected;
  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    dispatch(toggleDeleteDialog());
  };

  const onDelete = () => {
    if (isDeleteSchema) {
      dispatch(deleteSchema({ nsfPath, schemaName }));
    } else {
      dispatch(deleteScope(apiName));
    }
  };

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
    <dialog ref={ref} className='dialog'>
      <KeepFormDialogHeader
        heading={loading ? `Deleting ${isDeleteSchema ? schemaName : apiName}` : `Delete ${isDeleteSchema ? schemaName : apiName}?`}
        onClose={handleClose}
      />
      <div>
        {loading ? (
          <div className='dialog-content delete-dialog-progress-icon'>
            <CircularProgress color="primary" />
          </div>
        ) : (
          <>
            <div id="alert-dialog-description" className='dialog-content delete-schema-dialog-text'>
              <text className='dialog-content-text'>{`You'll lose all settings of the ${isDeleteSchema? 'schema' : 'scope'}: ${isDeleteSchema ? schemaName : apiName}. You cannot
              recover them once you delete.`}</text>
              <text className='dialog-content-text'>{`Are you sure you want to permanently delete this ${isDeleteSchema? 'schema' : 'scope'}?`}</text>
            </div>
            <div className='dialog-actions pt-30'>
              <KeepButton variant="neutral" appearance="outlined" onClick={handleClose}>No</KeepButton>
              <KeepButton onClick={onDelete} autoFocus>Yes</KeepButton>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};

export default DeleteDialog;
