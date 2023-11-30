/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import LogoutIcon from '@material-ui/icons/ExitToApp';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/account/action';
import styled from 'styled-components';

const OptionListContainer = styled.div`
`;

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: 360,
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
}));

interface OptionListProps {
  theme: string;
  toggleMenu: (open: boolean) => void;
}

const OptionList: React.FC<OptionListProps> = ({ theme, toggleMenu }) => {
  const classes = useStyles();
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
    // <List
    //   component="nav"
    //   aria-labelledby="nested-list-subheader"
    //   className={classes.root}
    //   style={{ backgroundColor: getTheme(theme).primary }}
    // >
    //   {/* commented out settings,theme and help option temporarily */}
    //   {/* <ListItem onClick={gotoSettings} button>
    //     <ListItemIcon>
    //       <SettingIcon color="primary" />
    //     </ListItemIcon>
    //     <ListItemText primary="Settings" />
    //   </ListItem>
    //   <ListItem button onClick={handleClick}>
    //     <ListItemIcon>
    //       <ColorPalletteIcon color="primary" />
    //     </ListItemIcon>
    //     <ListItemText primary={`Skin (${activeTheme})`} />
    //     {open ? <ExpandLess /> : <ExpandMore />}
    //   </ListItem>
    //   <Collapse in={open} timeout="auto" unmountOnExit>
    //     <List
    //       style={
    //         activeTheme === 'default'
    //           ? { background: KEEP_ADMIN_BASE_COLOR, color: 'white' }
    //           : {}
    //       }
    //       onClick={() => changeTheme('default')}
    //       component="div"
    //       disablePadding
    //     >
    //       <ListItem button className={classes.nested}>
    //         <ListItemIcon>
    //           <ToggleThemeMode color="secondary" />
    //         </ListItemIcon>
    //         <ListItemText primary="Default (Keep)" />
    //       </ListItem>
    //     </List>
    //     <List
    //       style={
    //         activeTheme === 'dark'
    //           ? { background: DARK_SECONDARY_COLOR, color: 'white' }
    //           : {}
    //       }
    //       onClick={() => changeTheme('dark')}
    //       component="div"
    //       disablePadding
    //     >
    //       <ListItem button className={classes.nested}>
    //         <ListItemIcon>
    //           <PaintIcon color="primary" />
    //         </ListItemIcon>
    //         <ListItemText primary="Dark" />
    //       </ListItem>
    //     </List> */}
    //   {/*  <List
    //       onClick={() => changeTheme('hcl')}
    //       style={
    //         activeTheme === 'hcl'
    //           ? { background: '#065a99', color: 'white' }
    //           : {}
    //       }
    //       component="div"
    //       disablePadding
    //     >
    //       <ListItem button className={classes.nested}>
    //         <ListItemIcon>
    //           <PaintIcon color="primary" />
    //         </ListItemIcon>
    //         <ListItemText primary="HCL" />
    //       </ListItem>
    //     </List>  */}
    //   {/* </Collapse>
    //   <ListItem button>
    //     <ListItemIcon>
    //       <HelpIcon color="primary" />
    //     </ListItemIcon>
    //     <ListItemText primary="Help" />
    //   </ListItem> */}
    //   <ListItem data-testid="signOut" onClick={logoutUser} button>
    //     <ListItemIcon>
    //       <LogoutIcon color="primary" />
    //     </ListItemIcon>
    //     <ListItemText primary="Sign Out" />
    //   </ListItem>
    // </List>

    <OptionListContainer className={classes.root}>
      <Button
        data-testid="signOut"
        fullWidth
        variant="contained"
        style={{ width: '181px', height: '42px', borderRadius: '20px', background: '#AA1F51', color:'#fff', fontWeight: 700}}
        onClick={logoutUser}
      >
        <LogoutIcon style={{ marginRight: 5 }} fontSize="small" />
        Sign Out
      </Button>
    </OptionListContainer>
  );
};

export default OptionList;
