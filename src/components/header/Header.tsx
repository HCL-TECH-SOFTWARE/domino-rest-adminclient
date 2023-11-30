/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useSelector } from 'react-redux';
import { IMG_DIR } from '../../config.dev';
import MobileHeader from './MobileHeader';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import SnackbarToaster from '../dialogs/SnackbarToaster';

const HeaderContainer = styled.header<{ theme: string }>`
  z-index: 3;
  height: 51px;
  background: ${(props) => getTheme(props.theme).bodyColor};
  display: flex;

  @media only screen and (max-width: 768px) {
    position: fixed;
    width: 100%;
  }
`;

const AppContainerLogo = styled.div<{ theme: string; open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => (props.open ? 242 : 57)}px;
  background: ${(props) => getTheme(props.theme).secondary};
  border-right: 1px solid ${(props) => getTheme(props.theme).borderColor};

  .keep-icon {
    width: 30px;
  }
`;

interface HeaderProps {
  open: boolean;
  toggleMobileMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({
  toggleMobileMenu,
  open
}) => {
  const matches = useMediaQuery('(max-width:768px)');
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return matches ? (
    <MobileHeader open={open} toggleMobileMenu={toggleMobileMenu} />
  ) : (
    <HeaderContainer theme={themeMode}>
      <AppContainerLogo open={open} theme={themeMode}>
        <img
          className="keep-icon"
          src={`${IMG_DIR}/KeepNewIcon.png`}
          alt="HCL Domino REST API Icon"
        />
      </AppContainerLogo>
      <SnackbarToaster />
    </HeaderContainer>
  );
};

export default Header;
