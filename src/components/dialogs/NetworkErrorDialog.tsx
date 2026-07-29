/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleErrorDialog } from '../../store/dialog/action';
import { KeepButton, KeepFormDialogHeader } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

/**
 * This component displays a Delete confirmation dialog
 *
 * @param deleteMessage the delete confirmation message
 * @param handleDelete the delete method
 */
const NetworkErrorDialog: React.FC = () => {
  const { errorDialogOpen, errorDialogMessage } = useSelector((state: AppState) => state.dialog);
  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (errorDialogOpen) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [errorDialogOpen]);

  return (
    <dialog ref={ref}>
      <KeepFormDialogHeader heading="Error" onClose={() => dispatch(toggleErrorDialog(errorDialogMessage))} />
      <div className="dialog-content">
        <p className="dialog-content-text">{errorDialogMessage}</p>
      </div>
      <div className="dialog-actions">
        <KeepButton onClick={() => dispatch(toggleErrorDialog(errorDialogMessage))} autoFocus>
          OK
        </KeepButton>
      </div>
    </dialog>
  );
};

export default NetworkErrorDialog;
