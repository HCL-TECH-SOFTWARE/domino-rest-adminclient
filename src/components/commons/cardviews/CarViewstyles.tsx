/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Paper } from '@mui/material';
import styled from 'styled-components';
import { getTheme } from '../../../store/styles/action';

export const MultiCardViewContainer = styled('div')<{ theme: string }>`
  display: flex;
  height: 35px;
  justify-content: center;
  border-radius: 10px !important;
  border: 1px solid ${(props) => getTheme(props.theme).borderColor} !important;
  background: ${(props) => getTheme(props.theme).secondary} !important;
  margin-left: 15px;
  font-size: 14px;
  .search-icon {
    font-size: 19px;
  }
`;

export const CarViewContainer = styled.div<{ theme: string }>`
  display: flex;
  justify-content: flex-end;

  .view-mode {
    border-radius: 30px;
    border-bottom-right-radius: 0px;
    border-top-right-radius: 0px;
    border-top: 0;
    border-bottom: 0;
    font-size: 14px;
    text-transform: capitalize;

    .chevron-down {
      font-size: 14px;
      margin-left: 7px;
    }
  }

  .split,
  .collage,
  .stack {
    font-size: 14px;
    text-transform: capitalize;
    border: 0;

    .option-button {
      font-size: 14px;
      margin-left: 7px;
    }
  }

  .view-active {
    color: ${(props) => getTheme(props.theme).activeIcon} !important;
    .option-button {
      font-size: 18px;
    }
  }

  .filter-button {
    border-radius: 20px;
    border-bottom-left-radius: 0px;
    border-top-left-radius: 0px;
    font-size: 14px;
    border-top: 0;
    border-bottom: 0;
    border-left: 0;
    text-transform: capitalize;

    .chevron-down {
      font-size: 14px;
      margin-left: 7px;
    }
  }
`;
