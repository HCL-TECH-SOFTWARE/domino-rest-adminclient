/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { Box, Button, ButtonBase, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip, Typography } from '@material-ui/core';
import styled from 'styled-components';
import CloseIcon from '@material-ui/icons/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { RxDividerVertical } from "react-icons/rx"
import { CiFilter } from "react-icons/ci";
import ConsentsTable from './ConsentsTable';
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace'
import { CommonDialog } from '../../../styles/CommonStyles';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { useDispatch } from 'react-redux';
import { deleteConsent, toggleDeleteConsent } from '../../../store/consents/action';
import { toggleConsentsDrawer } from '../../../store/drawer/action';
import { get } from 'lodash';

const ConsentsContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-direction: column;
  z-index: 1;
  width: 90vw;
  padding: 30px 35px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;

    .title {
        font-size: 18px;
        font-weight: 700;
        line-height: normal;
    }
`

const OptionsBar = styled.div`
    display: flex;
    padding: 25px 16px 0 16px;
    width: 100%;
    align-items: center;
    gap: 10px;

    .option {
        display: flex;
        gap: 5px;
        align-items: center;
        border-radius: 5px;
        padding: 5px 10px 5px 5px;

        &:hover {
          color: #FFF;
          background-color: #0F5FDC;
        }
    }

    .text {
        font-size: 16px;
        font-weight: 400;
        color: #1D2123;
    }
`

interface ConsentsProps {
  handleClose: () => void;
  dialog: boolean;
}

const Consents: React.FC<ConsentsProps> = ({ handleClose, dialog }) => {
  const [expand, setExpand] = useState(false)
  const [filtersOn, setFiltersOn] = useState(false)
  const [resetFilters, setResetFilters] = useState(false)
  const { deleteConsentDialog, appName, username, scope } = useSelector((state: AppState) => state.consents)

  const getUserName = (input: string): string | '' => {
    let str = "username" as keyof typeof input;
    const user = input[str];
    const match = user?.toString().match(/CN=(.*?)\//);
    return match ? match[1] : '';
  }

  const getAppName = (input: string): string | '' => {
    let str = "appName" as keyof typeof input;
    const app = input[str];
    return app?.toString();
  }

  const getScopes = (input: string): string | '' => {
    let str = "scope" as keyof typeof input;
    const scopeName = input[str];

    return scopeName?.toString();
  }

  const userName = getUserName(username);
  const applicationName = getAppName(appName);
  const scopeName = getScopes(scope);
  
  

  const dispatch = useDispatch()

  const handleCloseDialog = () => {
    dispatch(toggleDeleteConsent('', '', '', ''));
  }

  // Handle deleting/revoking consent
  const confirmDeleteConsent = () => {
    //dispatch(deleteConsent(consentInfo.unid) as any);
    dispatch(toggleDeleteConsent('', '', '', ''));
  }

  const handleClickReset = () => {
    setResetFilters(true)
  }

  return (
    <ConsentsContainer>
      <Header>
        <Typography className='title'>OAuth Consents</Typography>
        <ButtonBase onClick={handleClose}>
          {dialog && <CloseIcon />}
        </ButtonBase>
      </Header>
      <OptionsBar>
        <ButtonBase onClick={() => setExpand(true)} className='option'>
          <ExpandMoreIcon style={{ padding: 0 }} />
          Expand all
        </ButtonBase>
        <RxDividerVertical color='#A0A0A0' size='1.5em' />
        <ButtonBase onClick={() => setExpand(false)} className='option'>
          <ExpandLessIcon />
          Collapse all
        </ButtonBase>
        <RxDividerVertical color='#A0A0A0' size='1.5em' />
          <ButtonBase onClick={() => dispatch(toggleConsentsDrawer())} className='option'>
            <CiFilter size='1.2em' />
            All filters
          </ButtonBase>
          <ButtonBase onClick={handleClickReset} style={{ visibility: resetFilters ? 'visible' : 'visible' }}>
            Reset
          </ButtonBase>
      </OptionsBar>
      <ConsentsTable expand={expand} filtersOn={filtersOn} setFiltersOn={setFiltersOn} reset={resetFilters} setReset={setResetFilters} />
      <CommonDialog
        open={deleteConsentDialog}
        onClose={handleCloseDialog}
        aria-labelledby="delete-consent-dialog"
        aria-describedby="delete-consent-description"
      >
        <DialogTitle id="reset-form-dialog-title">
          <Box className="title">
            {`Revoke consent?`}
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-form-contents" color="textPrimary">
            {
              applicationName?
              `Are you sure you want to revoke consent for application ${applicationName} with user ${userName} and scopes ${scopeName}?`
              :
              `Are you sure you want to revoke consent for user ${userName} with scopes ${scopeName}?`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ display: 'flex', marginBottom: '20px', padding: '0 30px 20px 0' }}>
          <Button 
            className="btn right save" 
            onClick={confirmDeleteConsent}
            style={{ right: 'calc(93px + 5px + 30px)' }}
          >
            Yes
          </Button>
          <Button
            className="btn cancel"
            onClick={handleCloseDialog}
          >
            No
          </Button>
        </DialogActions>
      </CommonDialog>

    </ConsentsContainer>
  );
};

export default Consents;
