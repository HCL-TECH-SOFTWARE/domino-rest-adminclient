/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const SideNavContainer = styled.div`
  /* Outer wrapper must shrink with the inner drawer, otherwise the
     flex layout keeps the next sibling (RightPanel) pinned at 242px
     and the sidenav-edge toggle button appears fixed in place. */
  width: 242px;
  flex-shrink: 0;
  white-space: nowrap;
  /* Animate width so RightPanel slides in lock-step with the sidenav
     opening/closing. The slightly slower 'open' timing matches the
     inner .open transition below. */
  transition: width 225ms ease-in;

  &:has(.close) {
    width: 57px;
    transition: width 195ms ease-in;

    @media only screen and (min-width: 0px) and (max-width: 768px) {
      width: 0;
    }
  }

  .drawer {
    width: 242px;
    flex-shrink: 0;
    white-space: nowrap;
    /* Always clip horizontal overflow so labels/buttons never peek
       through the narrow rail during the width transition. */
    overflow-x: hidden;
  }

  .open {
    transition: width 225ms ease-in;

    @media only screen and (min-width: 0px) and (max-width: 768px) {
      width: 80%;
    }
  }

  .close {
    transition: width 195ms ease-in;
    width: 57px;

    @media only screen and (min-width: 0px) and (max-width: 768px) {
      width: 0;
    }
  }
`

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
