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
      <div className='flex flex-col justify-center items-center'>
        <DashboardIcon className='giant-text color-text-secondary' />
        <span className="large-text color-text-primary">
          Mail
        </span>
      </div>
    </FormContainer>
  );
};

export default Mail;
