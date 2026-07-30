/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';
import { Box, Dialog } from '@mui/material';

export const CommonDialog = styled(Dialog)`
  flex-direction: row;
  padding: 0;
  margin: 0;
  overflow-y: auto;

  .title {
    flex: 1;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
  }

  .btn {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px 16px;
    gap: 5px;
    position: absolute;
    width: 93px;
    height: 31px;
    text-transform: none;

    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }

  .save {
    text-transform: none;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }
`

export const DialogContainer = styled(Box)`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0;
  margin: 0;
  vertical-align: middle;
  width: 100%;
  height: 100%;
  background-color: var(--wa-color-surface-raised);
  color: var(--wa-color-text-normal);

  .title {
    display: flex;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
    flex-direction: row;
  }

  .btn {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px 16px;
    gap: 5px;
    position: absolute;
    min-width: 93px;
    height: 31px;
    text-transform: none;

    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }

  .right {
    right: calc(93px + 10px);
  }

  .text {
    margin-left: 5px;
  }

  .save {
    text-transform: none;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }

  .actions {
    width: 100%;
    align-items: flex-end;
    padding-right: 30px;
  }
`

export const DrawerFormContainer = styled.div`
  @media only screen and (max-width: 768px) {
    width: 100vw;
  }
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
`;

export const FormContentContainer = styled.div`
  padding: 0px 20px;
  min-width: 55%;
  max-width: 100%;
  width: 100%;
  overflow-y: auto;

  .header-title {
    margin-top: 15px;
    color: white;
    font-size: 24px;
    padding: 20px;
    height: 70x;
    border-radius: var(--wa-border-radius-m);
  }

  .button-style {
    height: 10%;
    width: 25%;
    background-color: var(--wa-color-brand-50);
    float: right;
    color: white;
    margin-left: 20px;
  }

  .button-style2 {
    height: auto;
    width: 20px !important;
    max-width: 20px !important;
    background-color: var(--wa-color-brand-50);
    color: white;
    padding: 0;
    border-radius: var(--wa-border-radius-s);
  }

  .button-disabled {
    background-color: rgba(0, 0, 0, 0.26);
  }

  .button-small {
    font-size: var(--wa-font-size-s);
    height: 9%;
    margin: 15px 3px 5px 3px;
    background-color: var(--wa-color-brand-50);
    color: white;
  }
  .bold-text {
    font-weight: 700;
  }
  .float-right {
    float: right;
  }
  /*
   * The drawer's close glyph used to carry cursor="pointer" as a prop. The old icon set
   * forwarded that straight onto the graphic it drew, where it is a valid SVG
   * presentation attribute. wa-icon draws its graphic inside a shadow root and takes no
   * such prop, so the cursor has to be a declaration. It stays scoped to this container
   * rather than going global: nothing else here is called close-icon, and the two other
   * components using that name have their own reasons for a pointer.
   */
  .close-icon {
    cursor: pointer;
  }
  .validation-error {
    color: #e53935;
  }
  .form-heading {
    font-size: 26px;
    margin-top: 20px;
    font-weight: 500;
  }
  .icon-heading {
    font-size: var(--wa-font-size-m);
  }
  .icon-image {
    width: 35px;
    margin-right: 15px;
  }
`;

export const DrawerContainer = styled.div`
  display: block;
  justify-content: center;
  align-items: center;
  padding: 15px 30px;
  width: 100%;

  .float-right {
    float: right;
  }

  .header-title {
    background-color: var(--wa-color-brand-50);
    margin: 30px 0 10px 0;
    font-size: 20px;
    padding: 10px;
    border-radius: var(--wa-border-radius-m);
  }
`;
