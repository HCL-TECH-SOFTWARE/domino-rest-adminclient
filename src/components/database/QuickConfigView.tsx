/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store';
import {
        fetchKeepDatabases,
       } from '../../store/databases/action';
import { toggleDrawer } from '../../store/drawer/action';
import { SettingContext } from '../database/settings/SettingContext';
import QuickConfigFormContainer from '../database/QuickConfigFormContainer';
import { WrapperContainer } from '../commons/Wrappers';
import { toggleAlert } from '../../store/alerts/action';

const QuickConfigView = () => {
  const { databasePull, scopePull, permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const dispatch = useDispatch();
  const [context, setContext] = useState({}) as any;

  useEffect(() => {
    if (!scopePull) {
      dispatch(toggleAlert(`Please wait until schema loading complete!`));
      return;
    }
    if(permissionCreate){
      if (!databasePull) {
        dispatch(fetchKeepDatabases() as any);
      }
      dispatch(toggleDrawer());
    }else{
      dispatch(toggleAlert(`You don't have permission to create schema.`));
    }
    //TODO
    // eslint-disable-next-line
  }, []);

  return (
    <SettingContext.Provider value={[context, setContext]}>
      <WrapperContainer>
          <>
            <QuickConfigFormContainer />
          </>
      </WrapperContainer>
    </SettingContext.Provider>
  );
};

export default QuickConfigView;
