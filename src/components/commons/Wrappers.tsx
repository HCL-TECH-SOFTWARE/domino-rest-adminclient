/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';

export const WrapperContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: calc( 100% - 120px);
  @media only screen and (max-width: 768px) {
    height: 100%;
  }
`;
