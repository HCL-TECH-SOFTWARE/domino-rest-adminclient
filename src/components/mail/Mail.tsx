/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { FormContainer } from '../../styles/CommonStyles';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

const Mail = () => {
  return (
    <FormContainer>
      <div className='flex flex-col justify-center items-center'>
        {/* No size: .giant-text sets font-size 60px, which a wa-size-* token could not
            override from @layer wa-utilities. That class has been dead — MuiSvgIcon's
            24px outranked it by injection order — so honouring it grows this placeholder
            hero glyph from 24px to the 60px it was always written for. The glyph is the
            Email module; the DashboardIcon alias named nothing real. */}
        <KeepIcon name='envelope' className='giant-text color-text-secondary' />
        <span className="large-text color-text-primary">
          Mail
        </span>
      </div>
    </FormContainer>
  );
};

export default Mail;
