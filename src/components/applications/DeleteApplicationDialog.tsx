/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { KeepButton } from '../keep-elements/KeepElements';

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
        <KeepButton variant="neutral" appearance="outlined"
          onClick={() => dispatch(toggleDeleteDialog())}
        >No</KeepButton>
        <KeepButton onClick={handleDelete} autoFocus>Yes</KeepButton>
      </div>
    </dialog>
  );
};

export default DeleteApplicationDialog;
