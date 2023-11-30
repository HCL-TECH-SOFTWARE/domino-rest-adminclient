/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store';
import { fetchMyApps } from '../../store/applications/action';
import PageLoading from '../loaders/PageLoading';
import Kanban from './kanban/Kanban';
import { AppFormContext } from './ApplicationContext';

const Applications: React.FC = () => {
  const dispatch = useDispatch();
  const { scopePull } = useSelector((state: AppState) => state.databases);
  const { appPull } = useSelector((state: AppState) => state.apps);
  const [formContext, setformContext] = useState('');

  useEffect(() => {
    if (!appPull) dispatch(fetchMyApps() as any);
  }, [appPull, dispatch]);

  return (
    <>
        <AppFormContext.Provider value={[formContext, setformContext]}>
          {scopePull && appPull ? (
              <Kanban />
          ) : (
            <PageLoading message="Loading Applications" />
          )}
        </AppFormContext.Provider>
    </>
  );
};

export default Applications;
