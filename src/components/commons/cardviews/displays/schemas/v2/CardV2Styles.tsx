/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';

export const CardLabelContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 5px 17px;
  width: 170px;
  overflow-x: hidden;

  p {
    margin: 0 !important;
    line-height: normal;
  }

  .api-name {
    font-weight: 600;
    text-overflow: ellipsis;
    overflow-x: hidden;
    white-space: nowrap;
  }

  .api-description {
    font-size: 14px;
    text-overflow: ellipsis;
    overflow-x: hidden;
  }
`;
