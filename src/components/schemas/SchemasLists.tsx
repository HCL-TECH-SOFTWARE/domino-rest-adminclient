/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import {
  fetchKeepDatabases,
  setOnlyShowSchemasWithScopes,
  setPullDatabase,
  setPullScope,
} from '../../store/databases/action';
import { TopContainer, FilterContainer, BlueSwitch } from '../../styles/CommonStyles';
import { SettingContext } from '../database/settings/SettingContext';
import APILoadingProgress from '../loading/APILoadingProgress';
import { useLocation, useNavigate } from '../../router/react';
import { toggleAlert } from '../../store/alerts/action';
import AddImportDialog from '../database/AddImportDialog';
import { setLoading } from '../../store/loading/action';
import { KeepButton, KeepCardViewOptions, KeepDatabaseSearch, KeepNetworkErrorDialog, KeepSchemasMultiView, KeepTooltip, KeepWrapperContainer, KeepZeroResults } from '../keep-elements/KeepElements';
import { areArraysEqual } from '../../utils/common';
import { useAppDispatch } from '../../store/hooks';

const SchemasLists = () => {
  const { scopes, scopePull, onlyShowSchemasWithScopes, permissions, databasesOverview, databasePull } = useSelector(
    (state: AppState) => state.databases
  );
  const { loading } = useSelector( (state: AppState) => state.loading );

  const permissionCreate = permissions.createDbMapping;
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;

  /**
   * The four schema views are Lit elements now and emit `schema-open` instead of navigating:
   * the router is handed out through React context with no module-level instance, so an element
   * cannot reach it. This is the last React component in the chain, so navigation lands here.
   */
  const openSchema = (database: any) => {
    navigate(`/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`);
  };

  const [results, setResults] = useState(() => {
    if (databasesOverview.length === 0) {
      return [];
    } else {
      const schemasWithScopes = scopes.map((scope) => {
        return scope.nsfPath + ":" + scope.schemaName;
      });
  
      return databasesOverview
        .filter((schema) => {
          return schemasWithScopes.includes(schema.nsfPath + ":" + schema.schemaName);
        })
        .sort((schemaA, schemaB) =>
          schemaA.schemaName ? schemaA.schemaName.localeCompare(schemaB.schemaName) : -1
        );
    }
  });
  const [searchKey, setSearchKey] = useState('');

  const displayType = search.split('?view=')[1];

  const initView = search && displayType ? displayType : 'card';

  const [view, setView] = useState(initView);
  const [searchType, setSearchType] = useState("SCHEMA NAME");
  const dispatch = useAppDispatch();
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
    dispatch(setLoading({ status: true }))
    dispatch(setPullDatabase(false));
    dispatch(setPullScope(false));
    dispatch(fetchKeepDatabases());
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

  const onChange = () => {
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
    if (!databasePull && databasesOverview.length === 0) {
      dispatch(fetchKeepDatabases())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, databasePull])

  const computeResults = () => {
    let schemas = databasesOverview.slice();
  
    if (onlyShowSchemasWithScopes) {
      const schemasWithScopes = scopes.map((scope) => {
        return scope.nsfPath + ":" + scope.schemaName;
      });
      schemas = schemas.filter((schema) => {
        return schemasWithScopes.includes(schema.nsfPath + ":" + schema.schemaName);
      });
    }
  
    if (searchKey) {
      if (searchType.indexOf("NSF") !== -1) {
        schemas = schemas.filter((schema) => {
          return schema.nsfPath.toLowerCase().includes(searchKey.toLowerCase());
        });
      } else {
        schemas = schemas.filter((schema) => {
          return schema.schemaName.toLowerCase().includes(searchKey.toLowerCase());
        });
      }
    }
  
    schemas.sort((schemaA, schemaB) =>
      schemaA.schemaName ? schemaA.schemaName.localeCompare(schemaB.schemaName) : -1
    );
  
    return [...new Set(schemas)];
  };
  
  useEffect(() => {
    const uniqueSchemas = computeResults();
  
    if (!areArraysEqual(results, uniqueSchemas)) {
      setResults(uniqueSchemas);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databasesOverview, scopes, onlyShowSchemasWithScopes, searchKey, searchType, results]);
  
  return (
    <SettingContext.Provider value={[context, setContext]}>
      <KeepWrapperContainer>
          <>
            <TopContainer className='mt-15'>
              <span className="top-nav color-text-primary">
                Schema Management
              </span>
              <KeepButton onClick={handleRefresh} icon="arrows-rotate">
                Refresh
              </KeepButton>
              <KeepButton icon="plus" onClick={handleClickOpen}>
                Add Schema
              </KeepButton>
            </TopContainer>
            <TopContainer className='mt-0'>
              <KeepDatabaseSearch
                searchType={searchType}
                nameType="SCHEMA NAME"
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
            <FilterContainer>
              <span className="medium-text flex items-center">
                Only show schemas configured with scopes
              </span>
              <KeepTooltip content={onlyShowSchemasWithScopes ? 'On' : 'Off'} placement="top">
                <BlueSwitch
                  checked={onlyShowSchemasWithScopes}
                  onChange={onChange}
                  name="isActive"
                  size="small"
                  slotProps={{ input: { 'aria-label': 'Only show schemas configured with scopes' } }}
                />
              </KeepTooltip>
            </FilterContainer>
            {results.length !== 0 && !loading.status && (
              <KeepSchemasMultiView
                databases={results}
                view={view}
                onSchemaOpen={(e) => openSchema(e.detail.database)}
              />
            )}
            {loading.status ? <APILoadingProgress label="Schemas" /> : results.length === 0 && <KeepZeroResults mainLabel=" Sorry, No result found" secondaryLabel={`What you search was unfortunately not found or doesn't exist.`} />}
            <KeepNetworkErrorDialog />
            <AddImportDialog open={addImportDialog} handleClose={handleCloseAddImport} />
          </>
      </KeepWrapperContainer>
    </SettingContext.Provider>
  );
};

export default SchemasLists;

