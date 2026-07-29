/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { KeepButton, KeepFormDialogHeader } from '../keep-elements/KeepElements';

interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Dialog shown when a user attempts to navigate away from a page
 * with unsaved changes. Offers three options:
 *  - Yes: save changes, then navigate
 *  - No: discard changes and navigate
 *  - Cancel: stay on the current page
 */
const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onSave,
  onDiscard,
  onCancel,
}) => {

  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      ref.current?.showModal()
    } else {
      if (ref.current?.close) {
        ref.current?.close()
      }
    }
  }, [open])
  
  return (
    <dialog ref={ref} className='dialog'>
      <KeepFormDialogHeader heading="Unsaved Changes" onClose={onCancel} />
      <div className='dialog-content'>
        <p className='dialog-content-text'>
          Changes have been made. Would you like to save these changes?
        </p>
        <p className='dialog-content-text'>
          Answering No will lose these changes.
        </p>
      </div>
      <div className='dialog-actions'>
        <KeepButton variant="neutral" appearance="outlined" onClick={onCancel}>Cancel</KeepButton>
        <KeepButton variant="danger" onClick={onDiscard}>No</KeepButton>
        <KeepButton onClick={onSave} autoFocus>Yes</KeepButton>
      </div>
    </dialog>
  );
};

export default UnsavedChangesDialog;
