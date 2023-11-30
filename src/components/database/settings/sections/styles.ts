/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';

export const SettingsList = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SettingsContainer = styled.div`
  display: flex;
  margin: 20px 0;
`;

export const SettingsDescription = styled.div`
  width: 40%;

  .title {
    font-size: 16x;
    font-weight: 600;
  }

  .description {
    font-size: 14px;
    font-weight: 300;
  }
`;

export const SettingsConfiguration = styled.div`
  flex: 1;
  margin-left: 10%;
  display: flex;
  align-items: center;
`;
