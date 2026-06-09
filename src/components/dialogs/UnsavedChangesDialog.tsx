/* ========================================================================== *
 * Copyright (C) 2024 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import FormDialogHeader from './FormDialogHeader';
import { LitButtonNeutral, LitButtonNo, LitButtonYes } from '../lit-elements/LitElements';

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
      <FormDialogHeader title="Unsaved Changes" onClose={onCancel} />
      <div className='dialog-content'>
        <text className='dialog-content-text'>
          Changes have been made. Would you like to save these changes?
        </text>
        <text className='dialog-content-text'>
          Answering No will lose these changes.
        </text>
      </div>
      <div className='dialog-actions'>
        <LitButtonNeutral onClick={onCancel} text='Cancel' />
        <LitButtonNo onClick={onDiscard} text='No' />
        <LitButtonYes onClick={onSave} text='Yes' autoFocus />
      </div>
    </dialog>
  );
};

export default UnsavedChangesDialog;
