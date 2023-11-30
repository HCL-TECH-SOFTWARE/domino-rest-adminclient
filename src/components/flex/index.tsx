/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';

export const ExtraFlex = styled.div`
  display: flex;
  flex-wrap: wrap;

  .child:not(:first-child) {
    flex: 1;
  }

  .child:first-child {
    width: 100%;
  }
`;
