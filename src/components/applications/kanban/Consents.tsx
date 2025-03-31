/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import {
  Box,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { RxDividerVertical } from 'react-icons/rx';
import ConsentsTable from './ConsentsTable';
import { CommonDialog } from '../../../styles/CommonStyles';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { useDispatch } from 'react-redux';
import { deleteConsent, toggleDeleteConsent } from '../../../store/consents/action';
import { toggleConsentsDrawer } from '../../../store/drawer/action';
import { LitButtonNeutral, LitButtonYes } from '../../lit-elements/LitElements';
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
`;

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
    background: none;

    &:hover {
      color: #fff;
      background-color: #0f5fdc;
    }
  }

  .text {
    font-size: 16px;
    font-weight: 400;
    color: #1d2123;
  }
`;

interface ConsentsProps {
  handleClose: () => void;
  dialog: boolean;
}

const Consents: React.FC<ConsentsProps> = ({ handleClose, dialog }) => {
  const [expand, setExpand] = useState(false);
  const [filtersOn, setFiltersOn] = useState(false);
  const [resetFilters, setResetFilters] = useState(false);
  const { deleteConsentDialog, deleteUnid, appName, username, scope } = useSelector((state: AppState) => state.consents);

  const dispatch = useDispatch();

  const handleCloseDialog = () => {
    dispatch(toggleDeleteConsent('', '', '', ''));
  };

  // Handle deleting/revoking consent
  const confirmDeleteConsent = () => {
    dispatch(deleteConsent(deleteUnid, handleCloseDialog) as any);
  };

  const handleClickReset = () => {
    setResetFilters(true);
  };

  return (
    <ConsentsContainer>
      <Header>
        <Typography className="title">OAuth Consents</Typography>
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
        >
          {dialog && <CloseIcon />}
        </button>
      </Header>
      <OptionsBar>
        <button
          onClick={() => setExpand(true)}
          style={{ border: 'none', cursor: 'pointer' }}
          className="option"
        >
          <ExpandMoreIcon style={{ padding: 0 }} />
          Expand all
        </button>
        <RxDividerVertical color="#A0A0A0" size="1.5em" />
        <button
          onClick={() => setExpand(false)}
          style={{ border: 'none', cursor: 'pointer' }}
          className="option"
        >
          <ExpandLessIcon />
          Collapse all
        </button>
        <RxDividerVertical color="#A0A0A0" size="1.5em" />
        <button
          onClick={() => dispatch(toggleConsentsDrawer())}
          style={{ border: 'none', cursor: 'pointer' }}
          className="option"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"/>
          </svg>
          All filters
        </button>
        <button
          onClick={handleClickReset}
          style={{ visibility: resetFilters ? 'visible' : 'visible', border: 'none', cursor: 'pointer', background: 'none' }}
        >
          Reset
        </button>
      </OptionsBar>
      <ConsentsTable
        expand={expand}
        filtersOn={filtersOn}
        setFiltersOn={setFiltersOn}
        reset={resetFilters}
        setReset={setResetFilters}
      />
      <CommonDialog
        open={deleteConsentDialog}
        onClose={handleCloseDialog}
        aria-labelledby="delete-consent-dialog"
        aria-describedby="delete-consent-description">
        <DialogTitle id="reset-form-dialog-title">
          <Box className="title">{`Revoke consent?`}</Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-form-contents" color="textPrimary">
            {appName
              ? `Are you sure you want to revoke consent for application ${appName} with user ${username} and scopes ${scope}?`
              : `Are you sure you want to revoke consent for user ${username} with scopes ${scope}?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ display: 'flex', marginBottom: '20px', padding: '0 30px 20px 0' }}>
          <LitButtonYes text='Yes' onClick={confirmDeleteConsent} style={{ right: 'calc(93px + 5px + 30px)', width: '93px' }} />
          <LitButtonNeutral text='No' onClick={handleCloseDialog} style={{ width: '93px' }} />
        </DialogActions>
      </CommonDialog>
    </ConsentsContainer>
  );
};

export default Consents;
