/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';

interface FormDialogHeaderProps {
  title: string;
  onClose: () => void;
}

const FormDialogHeader: React.FC<FormDialogHeaderProps> = ({
  title,
  onClose,
}) => {
  return (
    <div id="form-dialog-title" className="dialog-title">
      <div className="dialog-header">
        <text className="dialog-header-title">
          {title}
        </text>
        <button className="dialog-header-close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FormDialogHeader;
