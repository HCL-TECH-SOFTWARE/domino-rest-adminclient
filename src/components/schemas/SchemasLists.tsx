/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AddIcon from '@material-ui/icons/Add';
import CachedIcon from '@material-ui/icons/Cached';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { AppState } from '../../store';
import {
  fetchKeepDatabases,
        setOnlyShowSchemasWithScopes,
        setPullDatabase,
        setPullScope,
       } from '../../store/databases/action';
import { FETCH_KEEP_DATABASES,
        FETCH_AVAILABLE_DATABASES,
       } from '../../store/databases/types';
import { TopContainer, FilterContainer, BlueSwitch } from '../../styles/CommonStyles';
import { SettingContext } from '../database/settings/SettingContext';
import DatabaseSearch from '../database/DatabaseSearch';
import APILoadingProgress from '../loading/APILoadingProgress';
import { WrapperContainer } from '../commons/Wrappers';
import { useHistory } from 'react-router-dom';
import CardViewOptions from '../commons/cardviews/CardViewOptions';
import SchemasMultiView from '../commons/cardviews/displays/schemas/SchemasMultiView';
import { toggleAlert } from '../../store/alerts/action';
import ZeroResultsWrapper from '../commons/ZeroResultsWrapper';
import NetworkErrorDialog from '../dialogs/NetworkErrorDialog';
import { Tooltip } from '@material-ui/core';
import AddImportDialog from '../database/AddImportDialog';
import { setLoading } from '../../store/loading/action';

const SchemasLists = () => {
  const { databases, scopes, scopePull, onlyShowSchemasWithScopes, permissions, databasesOverview } = useSelector(
    (state: AppState) => state.databases
  );
  const { loading } = useSelector( (state: AppState) => state.loading );
  const permissionCreate = permissions.createDbMapping;
  const history = useHistory();
  const { pathname, search } = history.location;

  const [results, setResults] = useState([]) as any;
  const [searchKey, setSearchKey] = useState('');

  const displayType = search.split('?view=')[1];

  const initView = search && displayType ? displayType : 'card';

  const [view, setView] = useState(initView);
  const [searchType, setSearchType] = useState("SCHEMA NAME");
  const dispatch = useDispatch();
  const [context, setContext] = useState({}) as any;
  const handleSearchDatabase = (str: string) => {
    const key = str.trim();
    setSearchKey(key);
  };

  // add + import-related values
  const ref = useRef<HTMLDialogElement>(null);
  const [addImportDialog, setAddImportDialog] = useState(false);

  const handleClickOpen = () => {
    if (!scopePull) {
      dispatch(toggleAlert(`Please wait until schema loading complete!`));
      return;
    }
    if (permissionCreate){
      setAddImportDialog(true);
    } else{
      dispatch(toggleAlert(`You don't have permission to create schema.`));
    }
  };
  const handleRefresh = () => {
    dispatch(setPullDatabase(false));
    console.log("handle refresh")
    // dispatch(fetchKeepDatabases() as any)
    // dispatch(setPullDatabase(false))
    dispatch(setPullScope(false));
    dispatch({
      type: FETCH_KEEP_DATABASES,
      payload: []
    });
    dispatch({
      type: FETCH_AVAILABLE_DATABASES,
      payload: []
    });
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

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    dispatch(setOnlyShowSchemasWithScopes(!onlyShowSchemasWithScopes));
  };

  const handleCloseAddImport = () => {
    setAddImportDialog(false);
  }

  useEffect(() => {
    if (addImportDialog) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [addImportDialog])

  useEffect(() => {
    // console.log(databasesOverview)
    let schemas = databasesOverview.slice();
    // console.log(new Set(schemas))
    if (onlyShowSchemasWithScopes) {
      const schemasWithScopes = scopes.map((scope) => {
        return scope.nsfPath + ":" + scope.schemaName;
      });
      // console.log(schemasWithScopes)
      schemas = databasesOverview.filter((schema) => {
        // console.log(schema.nsfPath + ":" + schema.schemaName)
        // console.log(schemasWithScopes.includes(schema.nsfPath + ":" + schema.schemaName))
        return schemasWithScopes.includes(schema.nsfPath + ":" + schema.schemaName);
      });
      // console.log(schemas)
    }
    if (searchKey) {
      if(searchType.indexOf("NSF") !== -1){
        schemas = schemas.filter((schema) => {
          return schema.nsfPath.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        });
      }else{
        schemas = schemas.filter((schema) => {
          return schema.schemaName.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        });
      }
    }
    schemas.sort((schemaA, schemaB) => schemaA.schemaName ? schemaA.schemaName.localeCompare(schemaB.schemaName) : -1);
    // console.log(schemas)
    const uniqueSchemas = [...new Set(schemas)]
    // console.log(uniqueSchemas)
    setResults(uniqueSchemas);
    dispatch(setLoading({ status: false }))
  }, [databasesOverview, scopes, onlyShowSchemasWithScopes, searchKey, searchType, dispatch]);

  return (
    <SettingContext.Provider value={[context, setContext]}>
      <WrapperContainer>
          <>
            <TopContainer style={{ marginTop: '15px' }}>
              <Typography
                className="top-nav"
                color="textPrimary"
              >
                Schema Management
              </Typography>
              <Button
                className="button-create"
                color="primary"
                onClick={handleRefresh}
              >
                <CachedIcon style={{ margin: '0 5px' }} />Refresh
              </Button>
              <Button
                className="button-create"
                color="primary"
                onClick={handleClickOpen}
              >
                <AddIcon style={{ margin: '0 5px' }} />
                Add Schema
              </Button>
            </TopContainer>
            <TopContainer style={{ marginTop: 0 }}>
              <DatabaseSearch handleSearchDatabase={handleSearchDatabase} changeSearchType={changeSearchType} searchType={searchType}/>
              <CardViewOptions changeView={changeView} />
            </TopContainer>
            <FilterContainer>
              <Typography
                style={{ fontSize: 16, display: 'flex', alignItems:'center', color: 'black'}}
              >
                Only show schemas configured with scopes
              </Typography>
              <Tooltip title={onlyShowSchemasWithScopes ? 'On' : 'Off'}  placement="top-start">
                <BlueSwitch 
                  checked={onlyShowSchemasWithScopes}
                  onChange={onChange}
                  name="isActive"
                  size="small"
                  inputProps={{ 'aria-label': 'Only show schemas configured with scopes' }}
                /> 
              </Tooltip>
            </FilterContainer>
              {results.length !== 0 && <SchemasMultiView databases={results} view={view} />}
              {loading.status ? <APILoadingProgress label="Schemas" /> : results.length === 0 && <ZeroResultsWrapper mainLabel=" Sorry, No result found" secondaryLabel={`What you search was unfortunately not found or doesn't exist.`} />}
            <NetworkErrorDialog />
            <AddImportDialog open={addImportDialog} handleClose={handleCloseAddImport} />
          </>
      </WrapperContainer>
    </SettingContext.Provider>
  );
};

export default SchemasLists;

