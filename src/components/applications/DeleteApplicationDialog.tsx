/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
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
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (deleteDialogOpen) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [deleteDialogOpen])

  const dispatch = useDispatch();
  return (
    <dialog ref={ref} className='dialog'>
      <FormDialogHeader
        title={dialogTitle}
        onClose={() => dispatch(toggleDeleteDialog())}
      />
      <div className='dialog-content'>
        <text className='dialog-content-text'>
          {deleteMessage}
        </text>
      </div>
      <div className='dialog-actions'>
        <LitButtonNeutral
          onClick={() => dispatch(toggleDeleteDialog())}
          text='No'
        />
        <LitButtonYes onClick={handleDelete} text='Yes' autoFocus />
      </div>
    </dialog>
  );
};

export default DeleteApplicationDialog;
