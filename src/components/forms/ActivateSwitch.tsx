/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import * as React from 'react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { AGENTS_ERROR, VIEWS_ERROR } from '../../store/databases/types';

const ToggleContainer = styled.div`
  .toggle-container {
    position: relative;
    width: 137px;
    height: 34px;
    background-color: #e6ebf5;
    cursor: pointer;
    user-select: none;
    border-radius: 5px;
    padding: 5px;
    /* margin-top: 20px; */
  }

  .toggle-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 68px;
    height: 24px;
    /* font-weight: bold; */
    font-size: 14px;
    line-height: 16px;
    cursor: pointer;
    color: #fff;
    background-color: #008000;
    box-shadow: 0 2px 4px rgb(0, 0, 0, 0.25);
    padding: 8px 12px;
    border-radius: 5px;
    position: absolute;
    transition: all 0.2s ease;
    left: 68px;
    overflow-x: visible;
    text-transform: none;
  }

  .disable {
    background-color: #6c7882;
    left: 2px;
  }

  .unchecked {
    left: 70px;
    position: absolute;
    color: #6c7882;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    line-height: 16px;
    padding: 4px 12px;
    text-transform: none;
  }

  .left {
    left: 2px;
  }
`

interface ActivateSwitchProps {
  view: any,
  toggleActive: any,
  toggleInactive: any,
  type: string
}

const ActivateSwitch: React.FC<ActivateSwitchProps> = ({ view, toggleActive, toggleInactive, type }) => {
  const [toggle, setToggle] = useState(!!view.viewActive ? view.viewActive : view.agentActive);
  const [resetView, setResetView] = useState(false);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { updateViewError, updateAgentError } = useSelector((state: AppState) => state.databases);
  const dispatch = useDispatch();

  const handleToggle = () => {
    if (loading) {
      dispatch(toggleAlert(`Please wait while ${type}s are still saving!`));
      return;
    } else if (!toggle && (!updateViewError || !updateAgentError)) {
      toggleActive(view);
      setToggle(!toggle);
    } else if (!updateViewError && type === 'view') {
      setResetView(true);
    } else if (!updateAgentError && type === 'agent') {
      toggleInactive(view);
      setToggle(!toggle);
    } else if (type === 'view') {
      dispatch({
        type: VIEWS_ERROR,
        payload: false
      });
    } else {
      dispatch({
        type: AGENTS_ERROR,
        payload: false
      });
    }
  }

  const continueResetView = () => {
    toggleInactive(view);
    setToggle(false);
    setResetView(false);
  }

  return (
    <ToggleContainer>
      <div className='toggle-container' onClick={handleToggle}>
        <Button disabled={loading} className={`toggle-btn ${!toggle ? 'disable' : ''}`}>{ toggle ? "Active" : "Inactive" }</Button>
        <Button disabled={loading} className={`unchecked ${toggle ? 'left' : ''}`}>{ toggle ? "Inactive" : "Active" }</Button>
      </div>
      <div>
      <Dialog
        open={resetView}
        onClose={() => {setResetView(false)}}
        aria-labelledby="reset-view-dialog"
        aria-describedby='reset-view-description'
      >
        <DialogTitle id="reset-view-dialog-title">
          {"Reset View Columns?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-view-dialog-contents" color='textPrimary'>
            Making this view inactive will reset all columns and remove any configuration done to this view. Do you wish to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={continueResetView}>Yes</Button>
          <Button onClick={() => {setResetView(false)}}>No</Button>
        </DialogActions>
      </Dialog>
      </div>
    </ToggleContainer>
  );
};

export default ActivateSwitch;