/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import { useSelector } from 'react-redux';
import CloseMenuIcon from '@material-ui/icons/Close';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';

const DialogTitleContainer = styled(DialogTitle)<{ theme: string }>`
  padding: 0;
  padding-bottom: 30px;
`;

const DialogHeader = styled.div`
  display: flex;

  .close {
    cursor: pointer;
    font-size: 18px;
    color: black;
  }
  
  .title {
    flex: 1;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
  }
`;

interface FormDialogHeaderProps {
  title: string;
  onClose: () => void;
}

const FormDialogHeader: React.FC<FormDialogHeaderProps> = ({
  title,
  onClose,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return (
    <DialogTitleContainer theme={themeMode} id="form-dialog-title">
      <DialogHeader>
        <Typography color="textPrimary" className="title">
          {title}
        </Typography>
        <CloseMenuIcon color="secondary" className="close" onClick={onClose} />
      </DialogHeader>
    </DialogTitleContainer>
  );
};

export default FormDialogHeader;
