/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const OptionsIcon = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
`;

export const Options = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 10px;
  position: relative;
  right: 5px;

  svg {
    visibility: hidden;
  }
`;

export const OptionList = styled.div`
  .option-item {
    padding: 0 10px;
  }
`;

export const MenuOptionsContainer = styled.div`
  padding: 10px 0px 0px 0px;

  .left-icon {
    font-size: 16px;
    margin-left: 10px;
  }

  .right-icon {
    font-size: 16px;
  }

  .MuiListItemAvatar-root {
    margin-right: 10px;
    min-width: 20px;
  }

  .MuiList-padding {
    padding-bottom: 0 !important;
  }

  .MuiListItem-root {
    padding: 6px 5px !important;
    cursor: pointer;
    &:hover {
      background: var(--wa-color-brand-50);
      color: var(--wa-color-surface-default);

      .right-icon {
        color: var(--wa-color-brand-50) !important;
      }
    }
  }

  .MuiTypography-body1 {
    font-size: var(--wa-font-size-m);
  }
`;
