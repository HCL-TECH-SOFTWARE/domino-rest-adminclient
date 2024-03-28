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
import ConsentsTable from './ConsentsTable';
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace'
import { CommonDialog } from '../../../styles/CommonStyles';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { useDispatch } from 'react-redux';
import { deleteConsent, toggleDeleteConsent } from '../../../store/consents/action';

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
    gap: 28px;

    .option {
        display: flex;
        gap: 5px;
        align-items: center;
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
  const { deleteConsentDialog, deleteUnid } = useSelector((state: AppState) => state.consents)
  const dispatch = useDispatch()

  const handleCloseDialog = () => {
    dispatch(toggleDeleteConsent(''));
  }

  // Handle deleting/revoking consent
  const confirmDeleteConsent = () => {
    dispatch(deleteConsent(deleteUnid) as any);
    dispatch(toggleDeleteConsent(''));
  }

  return (
    <ConsentsContainer>
      <Header>
        <Typography className='title'>OAuth Consents</Typography>
        <ButtonBase onClick={handleClose}>
          {dialog && <CloseIcon />}
          {!dialog && <Tooltip title="Go to Applications"><KeyboardBackspaceIcon /></Tooltip>}
        </ButtonBase>
      </Header>
      <OptionsBar>
        <Box className='option'>
          <ButtonBase onClick={() => setExpand(true)}><ExpandMoreIcon /></ButtonBase>
          Expand all
        </Box>
        <RxDividerVertical color='#A0A0A0' size='1.5em' />
        <Box className='option'>
          <ButtonBase onClick={() => setExpand(false)}><ExpandLessIcon /></ButtonBase>
          Collapse all
        </Box>
      </OptionsBar>
      <ConsentsTable expand={expand} />
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
            Are you sure you want to revoke consent for UNID {deleteUnid}?
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
