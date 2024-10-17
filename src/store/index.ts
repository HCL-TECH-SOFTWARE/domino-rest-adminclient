/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from '@redux-devtools/extension';
import databaseReducer from './databases/reducer';
import historyReducer from './history/reducer';
import drawerReducer from './drawer/reducer';
import loadingReducer from './loading/reducer';
import appsReducer from './applications/reducer';
import dbSettingReducer from './dbsettings/reducer';
import alertReducer from './alerts/reducer';
import searchReducer from './search/reducer';
import stylesReducer from './styles/reducer';
import accountReducer from './account/reducer';
import dialogReducer from './dialog/reducer';
import interceptorReducer from './interceptor/reducer';
import groupsReducer from './groups/reducer';
import peopleReducer from './people/reducer';
import memberReducer from './peopleSelector/reducer';
import consentsReducer from './consents/reducer';
import usersReducer from './access/reducer';
import { configureStore } from '@reduxjs/toolkit';
import { get } from 'http';

const rootReducer = {
  databases: databaseReducer,
  histories: historyReducer,
  drawer: drawerReducer,
  loading: loadingReducer,
  apps: appsReducer,
  dbSetting: dbSettingReducer,
  alert: alertReducer,
  search: searchReducer,
  styles: stylesReducer,
  account: accountReducer,
  dialog: dialogReducer,
  interceptor: interceptorReducer,
  groups: groupsReducer,
  peoples: peopleReducer,
  members: memberReducer,
  consents: consentsReducer,
  users: usersReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunkMiddleware),
})

export type AppState = ReturnType<typeof store.getState>;