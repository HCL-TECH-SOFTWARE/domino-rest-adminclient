/* ========================================================================== *
 * Copyright (C) 2023, 2024 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { combineReducers } from 'redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
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
import consentsReducer from './consents/reducer';
import usersReducer from './access/reducer';

export const rootReducer = combineReducers({
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
  consents: consentsReducer,
  users: usersReducer,
});

export type AppState = ReturnType<typeof rootReducer>;

/**
 * The store's dispatch, including the thunk overload.
 *
 * `configureStore` installs redux-thunk by default, but the plain `Dispatch` that
 * `useDispatch()` returns only knows about action *objects* — so every thunk dispatch
 * needed a `as any` to compile. This is that missing type (#694).
 *
 * Kept framework-agnostic on purpose: the React binding lives in `./hooks`, so when
 * #715 replaces react-redux with a StoreController it is `hooks.ts` that goes away,
 * not this barrel.
 */
export type AppDispatch = ThunkDispatch<AppState, unknown, UnknownAction>;
