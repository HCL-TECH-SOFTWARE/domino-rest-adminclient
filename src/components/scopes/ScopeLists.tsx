/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleDrawer } from '../../store/drawer/action';
import { clearDBError,
        fetchKeepDatabases,
        setPullDatabase,
        setPullScope,
       } from '../../store/databases/action';
import { FETCH_AVAILABLE_DATABASES } from '../../store/databases/types';
import { TopContainer } from '../../styles/CommonStyles';
import { SettingContext } from '../database/settings/SettingContext';
import ScopeFormContainer from '../database/ScopeFormContainer';
import { useLocation, useNavigate } from '../../router/react';
import { toggleAlert } from '../../store/alerts/action';
import { KeepButton, KeepCardViewOptions, KeepDatabaseSearch, KeepNetworkErrorDialog, KeepPageLoading, KeepScopesMultiView, KeepWrapperContainer } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

const ScopeLists = () => {
  const { databasePull, scopePull, scopes, permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const [results, setResults] = useState([]) as any;
  const [searchKey, setSearchKey] = useState('');
  const dispatch = useAppDispatch();

  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;

  const displayType = search.split('?view=')[1];

  const initView = search && displayType ? displayType : 'card';
  const [view, setView] = useState(initView);
  const [searchType, setSearchType] = useState("SCOPE NAME");
  const [context, setContext] = useState({}) as any;
  const [selectedScope, setSelectedScope] = useState({}) as any;
  const [isEdit, setIsEdit] = useState(false);
  
  const openScope = (database: any) => {
    if (!databasePull) {
      dispatch(fetchKeepDatabases());
    }
    setSelectedScope(database);
    setIsEdit(true);
    dispatch(clearDBError());
    dispatch(toggleDrawer());
  };
  
  // search scopes
  const handleSearchDatabase = (str: string) => {
    const key = str.trim();
    setSearchKey(key);
  };

  const changeView = (view: string) => {
    navigate({
      pathname,
      search: `?view=${view}`,
    });
    setView(view);
  };
  
  const changeSearchType = (key: string) => {
    setSearchType(key);
  };

  const handleClickOpen = () => {
    if(permissionCreate){
      setIsEdit(false);
      if (!databasePull) {
        dispatch(fetchKeepDatabases());
      }
      dispatch(clearDBError());
      dispatch(toggleDrawer());
    }else{
      dispatch(toggleAlert(`You don't have permission to create scope.`));
    }
  };
  
  const handleRefresh = () => {
    dispatch(setPullDatabase(false));
    dispatch(setPullScope(false));
    dispatch(fetchKeepDatabases())
    dispatch({
      type: FETCH_AVAILABLE_DATABASES,
      payload: []
    });
  };

  useEffect(() => {
    let resultScopes = [];
    if (searchKey) {
      if(searchType.indexOf("NSF") !== -1){
        resultScopes = scopes.filter((scope) => {
          return scope.nsfPath.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        });
      }else{
        resultScopes = scopes.filter((scope) => {
          return scope.apiName.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        });
      }
    } else {
      resultScopes = scopes.slice();
    }
    resultScopes.sort((scopeA, scopeB) => scopeA.apiName.localeCompare(scopeB.apiName));
    setResults(resultScopes);
  }, [scopes, searchKey, searchType]);

  return (
    <SettingContext.Provider value={[context, setContext]}>
      <KeepWrapperContainer>
          <>
            <TopContainer className='mt-15'>
              <span className="top-nav color-text-primary">
                Scope Management
              </span>
              <KeepButton icon="arrows-rotate" onClick={handleRefresh}>
                Refresh
              </KeepButton>
              <KeepButton
                onClick={handleClickOpen}
                icon="plus"
              >
                Add Scope
              </KeepButton>
            </TopContainer>
            <TopContainer className='mt-0'>
              <KeepDatabaseSearch
                searchType={searchType}
                nameType="SCOPE NAME"
                disabled={!scopePull}
                onSearchChange={(e) => handleSearchDatabase(e.detail.value)}
                onSearchTypeChange={(e) => changeSearchType(e.detail.searchType)}
              />
              <KeepCardViewOptions
                view={view}
                disabled={!scopePull}
                onViewChange={(e) => changeView(e.detail.view)}
              />
            </TopContainer>
            {(databasePull || scopePull) && (
              <KeepScopesMultiView
                databases={results}
                view={view}
                onScopeOpen={(e) => openScope(e.detail.scope)}
              />
            )}
            {/* Always mount the drawer container so the underlying
                <wa-drawer> can play its slide-in / slide-out
                animations. Conditional mounting was causing the
                drawer to vanish instantly on close instead of
                animating out. The drawer manages its own open state
                via the redux `visible` flag. */}
            <ScopeFormContainer database={selectedScope} isEdit={isEdit} permissions={permissions}/>
            <KeepNetworkErrorDialog />
          </>
        {!(databasePull || scopePull) && <KeepPageLoading contained pageHeight message="Scopes are loading. This may take a few seconds..." />}
      </KeepWrapperContainer>
    </SettingContext.Provider>
  );
};

export default ScopeLists;
