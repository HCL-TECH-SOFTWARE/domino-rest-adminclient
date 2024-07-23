/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@mui/material/Typography';
import { SubSectionTitleContainer } from '../../styles/CommonStyles';

type SubSettingTitleProps = {
  children: React.ReactNode;
};

const SubSettingTitle: React.FC<SubSettingTitleProps> = ({ children }) => {
  return (
    <SubSectionTitleContainer>
      <Typography className="title" color="textPrimary">
        {children}
      </Typography>
    </SubSectionTitleContainer>
  );
};

export default SubSettingTitle;
