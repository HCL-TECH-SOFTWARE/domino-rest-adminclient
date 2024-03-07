/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AddIcon from '@material-ui/icons/Add';
import CachedIcon from '@material-ui/icons/Cached';
import { Button, Typography} from '@material-ui/core';
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
import DatabaseSearch from '../database/DatabaseSearch';
import ScopeFormContainer from '../database/ScopeFormContainer';
import APILoadingProgress from '../loading/APILoadingProgress';
import { WrapperContainer } from '../commons/Wrappers';
import CardViewOptions from '../commons/cardviews/CardViewOptions';
import { useHistory } from 'react-router-dom';
import ScopesMultiView from '../commons/cardviews/displays/scopes/ScopesMultiView';
import { toggleAlert } from '../../store/alerts/action';
import NetworkErrorDialog from '../dialogs/NetworkErrorDialog';

const ScopeLists = () => {
  const { databasePull, scopePull, scopes, permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const [results, setResults] = useState([]) as any;
  const [searchKey, setSearchKey] = useState('');
  const { visible } = useSelector((state: AppState) => state.drawer);
  const dispatch = useDispatch();

  const history = useHistory();
  const { pathname, search } = history.location;

  const displayType = search.split('?view=')[1];

  const initView = search && displayType ? displayType : 'card';
  const [view, setView] = useState(initView);
  const [searchType, setSearchType] = useState("SCOPE NAME");
  const [context, setContext] = useState({}) as any;
  const [selectedScope, setSelectedScope] = useState({}) as any;
  const [isEdit, setIsEdit] = useState(false);
  
  const openScope = (database: any) => {
    if (!databasePull) {
      dispatch(fetchKeepDatabases() as any);
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
    history.push({
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
        dispatch(fetchKeepDatabases() as any);
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
    dispatch(fetchKeepDatabases() as any)
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
      <WrapperContainer>
          <>
            <TopContainer style={{ marginTop: '15px' }}>
              <Typography
                className="top-nav"
                color="textPrimary"
              >
                Scope Management
              </Typography>
              <Button
                className="button-create"
                color="primary"
                onClick={handleRefresh}
              >
                <CachedIcon style={{ margin: '0 5px' }} />
                Refresh
              </Button>
              <Button
                className="button-create"
                color="primary"
                onClick={handleClickOpen}
              >
                <AddIcon style={{ margin: '0 5px' }} />
                Add Scope
              </Button>
            </TopContainer>
            <TopContainer style={{ marginTop: 0 }}>
              <DatabaseSearch handleSearchDatabase={handleSearchDatabase}  changeSearchType={changeSearchType}  searchType={searchType} />
              <CardViewOptions changeView={changeView} />
            </TopContainer>
            {(databasePull || scopePull) && (
              <ScopesMultiView
                databases={results}
                view={view}
                openScope={openScope} />
            )}
            {visible && <ScopeFormContainer database={selectedScope} isEdit={isEdit} permissions={permissions}/>}
            <NetworkErrorDialog />
          </>
        {!(databasePull || scopePull) && <APILoadingProgress label="Scopes" />}
      </WrapperContainer>
    </SettingContext.Provider>
  );
};

export default ScopeLists;
