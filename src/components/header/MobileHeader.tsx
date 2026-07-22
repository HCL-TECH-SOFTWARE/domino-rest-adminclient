/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';
import MenuIcon from '@mui/icons-material/Menu';
import CloseMenuIcon from '@mui/icons-material/ChevronLeft';
import ProfileMenuDialog from '../sidenav/ProfileMenuDialog';
import { IMG_DIR } from '../../config.dev';

const MobileHeaderContainer = styled.header`
  background: white;
  padding: 10px 20px;
  display: flex;
`;

const Profile = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
`;

interface MobileHeaderProps {
  toggleMobileMenu: () => void;
  open: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  toggleMobileMenu,
  open
}) => {
  return (
    <MobileHeaderContainer>
      <div className='flex-1'>
        {open ? (
          <CloseMenuIcon className='very-large-text' onClick={toggleMobileMenu} />
        ) : (
          <MenuIcon className='very-large-text' onClick={toggleMobileMenu} />
        )}
      </div>
      {!open && (
        <div className='flex-1 flex justify-center'>
          <img
            className="keep-icon"
            src={`${IMG_DIR}/KeepNewIcon.png`}
            alt="HCL Domino REST API Icon"
          />
        </div>
      )}
      <Profile>
        <ProfileMenuDialog />
      </Profile>
    </MobileHeaderContainer>
  );
};

export default MobileHeader;
