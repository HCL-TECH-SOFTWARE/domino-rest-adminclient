/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { fetchMyApps } from '../../store/applications/action';
import { KeepPageLoading } from '../keep-elements/KeepElements';
import Kanban from './kanban/Kanban';
import { AppFormContext } from './ApplicationContext';
import { useAppDispatch } from '../../store/hooks';

const Applications: React.FC = () => {
  const dispatch = useAppDispatch();
  const { scopePull } = useSelector((state: AppState) => state.databases);
  const { appPull } = useSelector((state: AppState) => state.apps);
  const [formContext, setformContext] = useState('');

  useEffect(() => {
    if (!appPull) dispatch(fetchMyApps());
  }, [appPull, dispatch]);

  return (
    <>
        <AppFormContext.Provider value={[formContext, setformContext]}>
          {scopePull && appPull ? (
              <Kanban />
          ) : (
            <KeepPageLoading message="Loading Applications" />
          )}
        </AppFormContext.Provider>
    </>
  );
};

export default Applications;
