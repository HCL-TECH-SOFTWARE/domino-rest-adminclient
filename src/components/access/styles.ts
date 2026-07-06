/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const TextEditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  border-radius: 5px;
  border: 1px solid light-dark(#BFBFBF, #3a3a4a);
  padding: 5px 20px;
  gap: 16px;
  background-color: light-dark(#FFF, #1e1e2e);

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
