/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { KeepButton, KeepFormDialogHeader } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

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

  const dispatch = useAppDispatch();
  return (
    <dialog ref={ref} className='dialog'>
      <KeepFormDialogHeader
        heading={dialogTitle}
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
