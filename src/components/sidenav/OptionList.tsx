/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/account/action';
import styled from 'styled-components';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material';

const OptionListContainer = styled.div`
`;

const OptionListContainerRoot = styled(OptionListContainer)(
  ({ theme: Theme }) => ({
    width: "100%",
    maxWidth: 360,
  })
);

interface OptionListProps {
  theme: string;
  toggleMenu: (open: boolean) => void;
}

const OptionList: React.FC<OptionListProps> = ({ theme, toggleMenu }) => {
  const dispatch = useDispatch();
  
  /* Themes are off for now
  const [open, setOpen] = useState(false);
  const history = useHistory();
  const [setActiveTheme] = useState(theme);
  const handleClick = () => {
    setOpen(!open);
  };
  const gotoSettings = () => {
    toggleMenu(false);
    history.push('/settings/account');
  };
  const changeTheme = (skin: string) => {
    dispatch(switchTheme(skin));
    setActiveTheme(skin);
    localStorage.setItem('theme', skin);
    toggleMenu(false);
  };
  */

  const logoutUser = () => {
    dispatch(logout() as any);
  };

  return (
    <OptionListContainerRoot>
      <Button
        data-testid="signOut"
        fullWidth
        variant="contained"
        style={{
          width: "181px",
          height: "42px",
          borderRadius: "20px",
          background: "#AA1F51",
          color: "#fff",
          fontWeight: 700,
        }}
        onClick={logoutUser}
      >
        <LogoutIcon style={{ marginRight: 5 }} fontSize="small" />
        Sign Out
      </Button>
    </OptionListContainerRoot>
  );
};

export default OptionList;
