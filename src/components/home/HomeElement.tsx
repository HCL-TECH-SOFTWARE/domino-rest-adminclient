/* ========================================================================== *
 * Copyright (C) 2024 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import '../../App.css';
import styled from 'styled-components';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector } from 'react-redux';
import useMediaQuery from '@mui/material/useMediaQuery';
import Header from '../../components/header/Header';
import CollapseMenuIcon from '@mui/icons-material/ChevronLeftRounded';
import ExpandMenuIcon from '@mui/icons-material/ChevronRightRounded';
import { IconButton } from '@mui/material';
import { AppState } from '../../store';
import Notification from '../alerts/Notification';
import SideNav from '../sidenav/SideNav';
import MobileSidebar from '../sidenav/MobileSidebar';
import { getTheme } from '../../store/styles/action';
import Footer from '../../Footer';
import theme from '../../theme';

const AppContainer = styled.main`
  display: flex;
  overflow-x: hidden;
  // height: calc( 100vh - 23px);

  @media only screen and (max-width: 768px) {
    overflow-x: hidden;
    height: calc( 100vh - 56px);
  }
  
  .MuiSnackbar-root {
    max-width: 90%;
    
    .MuiSnackbarContent-message {
      word-break: break-word;
    }
  }
  `;
  
const RightPanel = styled.div<{ open: boolean; theme: string }>`
  position: relative;
  height: 100%;
  width: calc( 100% - ${(props) => (props.open ? '241px' : '50px')});
  padding: 0 40px;

  @media only screen and (max-width: 768px) {
    background: white;
    width: 100%;
    filter: blur(${(props) => (props.open ? '10px' : 0)});
    ${(props) => props.open && `pointer-events: none;`}
  }

  .toggle-button {
    border-radius:0 10px 10px 0;
    width: 23px;
    height: 42px; 
    position: absolute;
    top: 35px;
    left: -1px;
    background-color: #5F1FBF;
    color: #fff;
    z-index: 100 !important;
    border: 1px solid #CFCFCF !important;
    border-left: 0px !important;
  }
`;

interface HomeElementProps {
    MainElement: React.ComponentType<any>;
    mainElementProps?: any;
}

const HomeElement: React.FC<HomeElementProps> = ({ MainElement, mainElementProps }) => {
  const [open, setOpen] = useState(false);
  const matches = useMediaQuery('(max-width:768px)');
  const { themeMode } = useSelector((state: AppState) => state.styles);

  const ipadMatches = useMediaQuery('(max-width:768px)');
  const { authenticated } = useSelector((state: AppState) => state.account);

  const toggleMenu = () => {
    setOpen(!open);
  };

  return (
    <ThemeProvider theme={theme(authenticated, getTheme, themeMode)}>
      <CssBaseline />
      {matches && (
        <Header
            toggleMobileMenu={toggleMenu}
            open={open}
        />
        )}
        <AppContainer>
        <Notification />
        <SideNav
            toggleMenu={toggleMenu}
            open={open}
        />
        {matches && (
            <MobileSidebar
            toggleMenu={toggleMenu}
            open={open}
            />
        )}
        <RightPanel theme={getTheme(themeMode)} open={open}>
            {!matches && (
                open ? (
                <IconButton 
                    aria-label="collapse menu"
                    className='toggle-button'
                    onClick={toggleMenu}
                >
                    <CollapseMenuIcon />
                </IconButton>
                ) : (
                <IconButton 
                    aria-label="expand menu"
                    className='toggle-button'
                    onClick={toggleMenu}
                >
                    <ExpandMenuIcon />
                </IconButton>
                )
            )}

        <MainElement {...mainElementProps} />
        </RightPanel>
        {!ipadMatches && <Footer />}
        </AppContainer>
    </ThemeProvider>
  );
};

export default HomeElement;
