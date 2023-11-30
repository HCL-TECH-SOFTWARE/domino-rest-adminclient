/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import CloseIcon from '@material-ui/icons/Close';
import { Typography, Tooltip, DialogTitle, Box, DialogContent, DialogContentText, DialogActions, Button } from '@material-ui/core';
import ListIcon from '@mui/icons-material/List';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import ConsentItem from './ConsentItem';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { Consent } from '../../store/consents/types';
import { CommonDialog } from '../../styles/CommonStyles';
import { deleteConsent, toggleDeleteConsent } from '../../store/consents/action';
import APILoadingProgress from '../loading/APILoadingProgress';

const ConsentsContainer = styled.div`
  padding: 0px 20px;
  width: 100%;

  .header-title {
    margin-top: 15px;
    color: white;
    font-size: 24px;
    padding: 20px;
    height: 70x;
    border-radius: 5px;
  }

  .close-icon {
    color: #FFF;
  }

  .float-right {
    float: right;
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid black;
  border-radius: 10px;
  margin: 20px 0;

  .row-odd {
    background-color: #F8FBFF;
  }
`

const ConsentsList: React.FC<{}> = () => {
  const dispatch = useDispatch();
  const { consents, deleteConsentDialog, deleteUnid } = useSelector((state: AppState) => state.consents);
  const { consentsLoading, usersLoading } = useSelector((state: AppState) => state.loading);

  const closeConsentDrawer = () => {
    dispatch(toggleConsentsDrawer());
  };

  const handleCloseDialog = () => {
    dispatch(toggleDeleteConsent(''));
  }

  const confirmDeleteConsent = () => {
    // handler for deleting/revoking consent
    dispatch(deleteConsent(deleteUnid) as any);
    dispatch(toggleDeleteConsent(''));
  }

  return (
    <ConsentsContainer>
      <Tooltip arrow title="Close">
        <CloseIcon
          cursor="pointer"
          className="close-icon float-right"
          onClick={closeConsentDrawer}
        />
      </Tooltip>
      <Typography
        className="header-title"
        color="textPrimary"
        style={{ marginTop: 35, backgroundColor: KEEP_ADMIN_BASE_COLOR }}
      >
        <ListIcon />
        <span style={{ marginLeft: 10 }}>{`OAuth Consents`}</span>
      </Typography>
      {consentsLoading || usersLoading ?
        <APILoadingProgress label="Consents and Users" /> :
        <ListContainer>
          {consents.map((consent: Consent, idx: number) => {
            return (
              <ConsentItem key={idx} consent={consent} idx={idx} lastItem={idx === consents.length - 1 ? true : false} />
            )
          })}
      </ListContainer>}
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

export default ConsentsList;
