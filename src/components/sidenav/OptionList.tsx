/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { logout } from '../../store/account/action';
import { styled } from '@linaria/react';
import { useNavigate } from '../../router/react';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../store/hooks';

const OptionListContainer = styled.div`
`;

const OptionListContainerRoot = styled(OptionListContainer)`
  width: 100%;
  max-width: 360px;
`;

interface OptionListProps {
  toggleMenu: (open: boolean) => void;
}

const OptionList: React.FC<OptionListProps> = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate()
  

  const logoutUser = () => {
    dispatch(logout());
    navigate('/')
  };

  return (
    <OptionListContainerRoot>
      <button
        data-testid="signOut"
        className='option-list-container-button flex justify-center gap-2 items-center'
        onClick={logoutUser}
      >
        <div className='profile-menu-user-icon'>
          {/* The glyph is the ExitToApp module; the LogoutIcon alias named nothing real.
              size='xl': .mt-5 is a margin, and .profile-menu-user-icon sizes the 36px box
              around the glyph rather than the glyph, so nothing set a font-size here and
              the icon drew MUI's 24px default. No label — "SIGN OUT" is right beside it. */}
          <KeepIcon name='right-from-bracket' size='xl' className='mt-5' />
        </div>
        <span className='small-text'>SIGN OUT</span>
      </button>
    </OptionListContainerRoot>
  );
};

export default OptionList;
