/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import { logout } from '../../store/account/action';
import { styled } from '@linaria/react';
import { useNavigate } from '../../router/react';
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
          <LogoutIcon className='mt-5' />
        </div>
        <span className='small-text'>SIGN OUT</span>
      </button>
    </OptionListContainerRoot>
  );
};

export default OptionList;
