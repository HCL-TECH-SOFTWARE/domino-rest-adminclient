/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import DashboardIcon from '@mui/icons-material/Email';
import Typography from '@mui/material/Typography';
import { FormContainer } from '../../styles/CommonStyles';

const Mail = () => {
  return (
    <FormContainer>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <DashboardIcon color="secondary" style={{ fontSize: 60 }} />
        <Typography variant="h6" component="p" color="textPrimary">
          Mail
        </Typography>
      </div>
    </FormContainer>
  );
};

export default Mail;
