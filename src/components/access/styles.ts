/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';

export const ItemContainer = styled.div<{ isDragging?: boolean; ref?: any }>`
  display: flex;
  user-select: none;
  padding: 10px 40px 10px 10px;
  align-items: center;
  width: 100%;
  align-content: flex-start;
  line-height: 1.5;
  border-radius: 3px;
  border: 1px solid transparent;
  user-select: none;
  ${(props) => (props.isDragging ? 'dashed #4099ff' : 'solid transparent')};

  svg {
    margin-right: 10px;
  }

  &:hover {
    cursor: pointer;
  }

  .add-field {
    visibility: hidden;
    height: 100%;
  }

  &:hover {
    border: 1px solid ${KEEP_ADMIN_BASE_COLOR};
    border-radius: 2px;

    .add-field {
      visibility: visible;
      cursor: pointer;
    }
  }
`;

export const TextEditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  border-radius: 5px;
  border: 1px solid #BFBFBF;
  padding: 5px 20px;
  gap: 16px;
  background-color: #FFF;

  .settings-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
  }

  .settings-text {
    font-size: 14px;
    font-weight: 700;
    padding: 0;
  }

  .formulas-container {
    display: flex;
    width: 100%;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .expand-button {
    padding: 0;
    margin: 0;
  }
`;

export const AccessModeContainer = styled.div`
  display: flex;
  height: calc(100vh - 230px);
  overflow-y: hidden;
  padding: 0px 0px;
  gap: 20px;
`;
