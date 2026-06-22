/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import DashboardIcon from '@mui/icons-material/Email';
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
        <span className="large-text color-text-primary">
          Mail
        </span>
      </div>
    </FormContainer>
  );
};

export default Mail;
