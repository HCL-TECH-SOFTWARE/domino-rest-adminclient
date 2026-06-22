/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { SubSectionTitleContainer } from '../../styles/CommonStyles';

type SettingTitleProps = {
  children: React.ReactNode;
};

const SettingTitle: React.FC<SettingTitleProps> = ({ children }) => {
  return (
    <SubSectionTitleContainer>
      <span className="title color-text-primary">
        {children}
      </span>
    </SubSectionTitleContainer>
  );
};

export default SettingTitle;
