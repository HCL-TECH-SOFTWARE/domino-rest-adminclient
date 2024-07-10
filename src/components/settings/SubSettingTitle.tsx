/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@mui/material/Typography';
import { SubSectionTitleContainer } from '../../styles/CommonStyles';

const SubSettingTitle: React.FC = ({ children }) => {
  return (
    <SubSectionTitleContainer>
      <Typography className="title" color="textPrimary">
        {children}
      </Typography>
    </SubSectionTitleContainer>
  );
};

export default SubSettingTitle;
