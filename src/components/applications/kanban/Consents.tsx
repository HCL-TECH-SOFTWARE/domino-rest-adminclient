/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Typography
} from '@mui/material';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { RxDividerVertical } from 'react-icons/rx';
import { CiFilter } from 'react-icons/ci';
import ConsentsTable from './ConsentsTable';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { CommonDialog } from '../../../styles/CommonStyles';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { useDispatch } from 'react-redux';
import { deleteConsent, toggleDeleteConsent } from '../../../store/consents/action';
import { toggleConsentsDrawer } from '../../../store/drawer/action';
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
    dispatch(deleteConsent(deleteUnid) as any);
  };

  const handleClickReset = () => {
    setResetFilters(true);
  };

  return (
    <ConsentsContainer>
      <Header>
        <Typography className="title">OAuth Consents</Typography>
        <ButtonBase onClick={handleClose}>{dialog && <CloseIcon />}</ButtonBase>
      </Header>
      <OptionsBar>
        <ButtonBase onClick={() => setExpand(true)} className="option">
          <ExpandMoreIcon style={{ padding: 0 }} />
          Expand all
        </ButtonBase>
        <RxDividerVertical color="#A0A0A0" size="1.5em" />
        <ButtonBase onClick={() => setExpand(false)} className="option">
          <ExpandLessIcon />
          Collapse all
        </ButtonBase>
        <RxDividerVertical color="#A0A0A0" size="1.5em" />
        <ButtonBase onClick={() => dispatch(toggleConsentsDrawer())} className="option">
          <CiFilter size="1.2em" />
          All filters
        </ButtonBase>
        <ButtonBase onClick={handleClickReset} style={{ visibility: resetFilters ? 'visible' : 'visible' }}>
          Reset
        </ButtonBase>
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
          <Button className="btn right save" onClick={confirmDeleteConsent} style={{ right: 'calc(93px + 5px + 30px)' }}>
            Yes
          </Button>
          <Button className="btn cancel" onClick={handleCloseDialog}>
            No
          </Button>
        </DialogActions>
      </CommonDialog>
    </ConsentsContainer>
  );
};

export default Consents;
