/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store';
import { fetchMyApps } from '../../store/applications/action';
import styled from 'styled-components';
import { Box } from '@material-ui/core';
import Consents from './kanban/Consents';
import { useNavigate } from 'react-router-dom';
import { fetchUsers } from '../../store/access/action';
import { getConsents } from '../../store/consents/action';

const ConsentsBox = styled(Box)`
    display: flex;
    padding: 30px;
`

const ConsentsContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { appPull } = useSelector((state: AppState) => state.apps);
  const navigate = useNavigate()

  useEffect(() => {
    if (!appPull) dispatch(fetchMyApps() as any)
    dispatch(fetchUsers() as any)
    dispatch(getConsents() as any)
  }, [appPull, dispatch]);

  return (
    <ConsentsBox>
        <Consents
            handleClose={() => {navigate('/apps')}}
            dialog={false}
        />
    </ConsentsBox>
  );
};

export default ConsentsContainer;
