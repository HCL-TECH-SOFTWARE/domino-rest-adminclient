/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import UserIcon from '@mui/icons-material/AccountCircleOutlined';
import { styled } from '@linaria/react';
import OptionList from './OptionList';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { TokenProps } from '../../store/account/types';
import { LitTooltip } from '../lit-elements/LitElements';

const ProfileMenuCard = styled(Paper)`
  padding: 30px 30px 30px 30px;
  box-sizing: border-box !important;
  border-radius: 10px;
`;

const AvatarContainer = styled.div<{ theme: string }>`
  display: flex;
  margin-bottom: 60px;
  background: ${(props) => getTheme(props.theme).secondary};
`;

const ProfileInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;

const ProfileMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const [open, setOpen] = useState(false);
  const { idpLogin } = useSelector((state: AppState) => state.account);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Get the current user from the auth token
  let user: string = '';
  const token = localStorage.getItem('user_token') as string;
  if (token) {
    if (idpLogin) {
      const accessToken = JSON.parse(atob(JSON.parse(token).access_token.split('.')[1]))
      if (!!accessToken.email) {
        user = accessToken.email
      } else if (!!accessToken.CN) {
        user = accessToken.CN
      }
    } else {
      const jsonToken = JSON.parse(token) as TokenProps;
      if (
        jsonToken != null &&
        jsonToken.claims != null &&
        jsonToken.claims.sub != null
      ) {
        const currentUser = jsonToken.claims.sub;
        user = currentUser.split('/')[0].split('=')[1];
      }
    }
  }
  return (
    <>
      <LitTooltip
        placement="right"
        content="Profile"
      >
        <UserIcon
          className='profile-menu-user-icon profile-menu-dialog-user cursor-pointer'
          onClick={handleClick}
          data-testid="profileIcon"
        />
      </LitTooltip>
      <Popper open={open} anchorEl={anchorEl} placement="bottom-end" transition>
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Fade {...TransitionProps} timeout={550}>
              <ProfileMenuCard>
                <AvatarContainer theme={themeMode}>
                  <ProfileInfo>
                    <span className="color-text-primary weight-700 medium-text">
                      {user}
                    </span>
                    <span className="color-text-primary text-13">
                      Administrator
                    </span>
                  </ProfileInfo>
                </AvatarContainer>
                <OptionList toggleMenu={setOpen} theme={themeMode} />
              </ProfileMenuCard>
            </Fade>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
};

export default ProfileMenu;
