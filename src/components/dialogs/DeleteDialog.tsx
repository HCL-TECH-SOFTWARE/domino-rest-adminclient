/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { deleteSchema, deleteScope } from '../../store/databases/action';
import FormDialogHeader from './FormDialogHeader';
import { LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

interface DeleteDialogProps {
  open: boolean;
  selected: any;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, selected }) => {
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { isDeleteSchema, nsfPath, schemaName, apiName } = selected;
  const dispatch = useDispatch();

  const ref = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    dispatch(toggleDeleteDialog());
  };

  const onDelete = () => {
    isDeleteSchema ? dispatch(deleteSchema({ nsfPath, schemaName }) as any) : dispatch(deleteScope(apiName) as any);
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
      <FormDialogHeader
        title={loading ? `Deleting ${isDeleteSchema ? schemaName : apiName}` : `Delete ${isDeleteSchema ? schemaName : apiName}?`}
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
              <LitButtonNeutral onClick={handleClose} text='No' />
              <LitButtonYes onClick={onDelete} text='Yes' autoFocus />
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};

export default DeleteDialog;
