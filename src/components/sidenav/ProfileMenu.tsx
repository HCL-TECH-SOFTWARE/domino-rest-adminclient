/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import UserIcon from '@material-ui/icons/AccountCircleOutlined';
import styled from 'styled-components';
import OptionList from './OptionList';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { TokenProps } from '../../store/account/types';


const ProfileContainer = styled.div`
  display: flex;
  margin: 0px 0px 30px 0px;
  justify-content: center;
`;

const ProfileMenuCard = styled.div`
  display: block;
  justify-content: center;
`;

const AvatarContainer = styled.div<{ theme: string }>`
  display: flex;
  margin: 0px 0 40px 0;
`;

const PhotoContainer = styled.div`
  margin: 4px 20px 0 0 ;
  display: flex;
  justify-content: center;
`;

const ProfileInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;

const ProfileMenu = () => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const [open, setOpen] = useState(false);
  
  // Get the current user from the auth token
  let user: string = '';
  const jwtToken = localStorage.getItem('user_token') as string;
  if (jwtToken) {
    const jsonToken = JSON.parse(jwtToken) as TokenProps;
    if (
      jsonToken != null &&
      jsonToken.claims != null &&
      jsonToken.claims.sub != null
    ) {
      const currentUser = jsonToken.claims.sub;
      user = currentUser.split('/')[0].split('=')[1];
    }
  }
  return (
    <ProfileContainer>
      <ProfileMenuCard>
        <AvatarContainer theme={themeMode}>
          <PhotoContainer>
            <UserIcon style={{width:'36px', height:'36px'}} />
          </PhotoContainer>
          <ProfileInfo>
            <Typography color="textPrimary" style={{ fontWeight: 700, fontSize: 16 }}>
              {user}
            </Typography>
            <Typography color="textPrimary" style={{ fontSize: 13 }}>
              Administrator
            </Typography>
          </ProfileInfo>
        </AvatarContainer>
        <OptionList toggleMenu={setOpen} theme={themeMode} />
      </ProfileMenuCard>
    </ProfileContainer>
  );
};

export default ProfileMenu;
