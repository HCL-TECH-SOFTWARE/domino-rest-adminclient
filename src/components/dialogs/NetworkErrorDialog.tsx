/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { AppState } from '../../store';
import { toggleErrorDialog } from '../../store/dialog/action';
import { KeepButton } from '../keep-elements/KeepElements';

/**
 * This component displays a Delete confirmation dialog
 *
 * @param deleteMessage the delete confirmation message
 * @param handleDelete the delete method
 */
const NetworkErrorDialog: React.FC = () => {
  const { errorDialogOpen, errorDialogMessage } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (errorDialogOpen) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [errorDialogOpen])

  return (
    <dialog ref={ref}>
      <FormDialogHeader
        title="Error"
        onClose={() => dispatch(toggleErrorDialog(errorDialogMessage))}
      />
      <div className='dialog-content'>
        <text className='dialog-content-text'>
          {errorDialogMessage}
        </text>
      </div>
      <div className='dialog-actions'>
        <KeepButton onClick={() => dispatch(toggleErrorDialog(errorDialogMessage))} autoFocus>OK</KeepButton>
      </div>
    </dialog>
  );
};

export default NetworkErrorDialog;
