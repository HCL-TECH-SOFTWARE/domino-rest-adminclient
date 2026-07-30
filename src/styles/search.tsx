/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
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

  /*
   * The colour was MUI's color="primary" on the SvgIcon, i.e. theme.palette.primary.main,
   * which theme.ts binds to getTheme(mode).textColorPrimary. keep-theme.css pins
   * --wa-color-text-normal to exactly that value in both modes, so the token restates the
   * colour rather than changing it. wa-icon has no color attribute; it paints from
   * currentColor, so it has to be a declaration. Declared here because every search bar in
   * the app shares this class and every one of them passed color="primary".
   */
  .search-icon {
    margin-left: 10px;
    font-size: 19px;
    color: var(--wa-color-text-normal);
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
