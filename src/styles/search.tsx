/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const FormSearchContainer = styled('div')`
  display: flex;
  flex: 1;
  height: 43px;
  justify-content: center;
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-l) !important;
  background: var(--wa-color-surface-raised) !important;

  .search-icon {
    margin-left: 10px;
    font-size: 19px;
  }
  .clear-icon {
    font-size: 19px;
    cursor: pointer;
  }
`;

export const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 0px;
  width: 100%;
`;

export const SearchInput = styled.input`
  border: 0;
  width: 100%;
  outline: none;
  background: none;
  font-size: 16px;
`;
