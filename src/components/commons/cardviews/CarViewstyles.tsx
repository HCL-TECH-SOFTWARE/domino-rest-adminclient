/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const MultiCardViewContainer = styled('div')`
  display: flex;
  height: 35px;
  justify-content: center;
  border-radius: var(--wa-border-radius-l) !important;
  border: 1px solid var(--wa-color-surface-border) !important;
  background: var(--wa-color-surface-raised) !important;
  margin-left: 15px;
  font-size: var(--wa-font-size-m);
  .search-icon {
    font-size: 19px;
  }
`;

export const CarViewContainer = styled.div`
  display: flex;
  justify-content: flex-end;

  .view-mode {
    border-radius: 30px;
    border-bottom-right-radius: 0px;
    border-top-right-radius: 0px;
    border-top: 0;
    border-bottom: 0;
    font-size: var(--wa-font-size-m);
    text-transform: capitalize;

    .chevron-down {
      font-size: var(--wa-font-size-m);
      margin-left: 7px;
    }
  }

  .split,
  .collage,
  .stack {
    font-size: var(--wa-font-size-m);
    text-transform: capitalize;
    border: 0;

    .option-button {
      font-size: var(--wa-font-size-m);
      margin-left: 7px;
    }
  }

  .view-active {
    color: var(--wa-color-brand-50) !important;
    .option-button {
      font-size: 18px;
    }
  }

  .filter-button {
    border-radius: 20px;
    border-bottom-left-radius: 0px;
    border-top-left-radius: 0px;
    font-size: var(--wa-font-size-m);
    border-top: 0;
    border-bottom: 0;
    border-left: 0;
    text-transform: capitalize;

    .chevron-down {
      font-size: var(--wa-font-size-m);
      margin-left: 7px;
    }
  }
`;
