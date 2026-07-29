/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useNavigate } from '../../../../../router/react';
import { useSelector } from 'react-redux';
import { Scope } from '../../../../../store/databases/types';
import { AppState } from '../../../../../store';
import { setDbIndex } from '../../../../../store/databases/action';
import { toggleDeleteDialog } from '../../../../../store/dialog/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer, StackHeader } from './SchemaStyles';
import { KeepDeleteDialog, KeepSlimDatabaseCard, KeepZeroResults } from '../../../../keep-elements/KeepElements';
import { ExtraFlex } from '../../../../flex';
import { useAppDispatch } from '../../../../../store/hooks';

type SchemasStacksViewProps = {
  databases: Array<any>;
};

const SchemasStacksView: React.FC<SchemasStacksViewProps> = ({ databases }) => {
  const { scopes, onlyShowSchemasWithScopes } = useSelector(
    (state: AppState) => state.databases
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const setOption = useState({})[1];
  const setselected = useState('')[1];
  const dispatch = useAppDispatch();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');

  const schemasWithScopes = scopes.map((scope) => {
    return scope.nsfPath + ':' + scope.schemaName;
  });

  /**
   * The card has already checked `permissions.deleteDbMapping` and refused with an alert if
   * it was missing, so reaching here means the delete is allowed. Recording the target and
   * opening the dialog stay together in one handler: `keep-delete-dialog` reads its own open
   * flag from the store, so a dispatch from inside the card would race these two setters.
   */
  const requestDelete = (database: any) => {
    setSelectedDB(database.schemaName);
    setSelectedNsf(database.nsfPath);
    dispatch(toggleDeleteDialog());
  };

  const loadDatabase = (
    event: React.MouseEvent<HTMLElement>,
    database: Scope
  ) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    setOption(database);
    setselected(database.apiName);

    setSelectedDB(database.schemaName);
    setSelectedNsf(database.nsfPath);

    // Set Selected Database Index to Redux Store
    dispatch(
      setDbIndex(
        getDatabaseIndex(databases, database.apiName, database.nsfPath)
      )
    );
  };

  const openDatabase = (database: any) => {
    navigate(
      `/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`
    );
  };

  const inUseSchemas = databases.filter((schema) => {
    return schemasWithScopes.includes(schema.nsfPath + ':' + schema.schemaName);
  });

  const notInUseSchemas = databases.filter((schema) => {
    return !schemasWithScopes.includes(
      schema.nsfPath + ':' + schema.schemaName
    );
  });

  return (
    <SchemasMainContainer>
      <StackHeader>
        <span className='m-0 mt-5 mb-5'>
          {inUseSchemas.length} in use Schema(s) (configured with Scope)
        </span>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
            {inUseSchemas.length > 0 ? (
              inUseSchemas.map(
                (database, index) =>
                  database.apiName !== 'keepconfig' && (
                    <KeepSlimDatabaseCard
                      key={index}
                      database={database}
                      isSchema
                      onCardOpen={() => openDatabase(database)}
                      onCardDelete={() => requestDelete(database)}
                      onContextMenu={(event) => loadDatabase(event, database)}
                    />
                  )
              )
            ) : (
              <KeepZeroResults
                mainLabel='0 in use Schema '
                secondaryLabel={``}
              />
            )}
          </>
        </ExtraFlex>
      </>
      {!onlyShowSchemasWithScopes && (
        <>
          <StackHeader>
            <span className='m-0 mt-5 mb-5'>
              {notInUseSchemas.length} not in use Schema(s) (not configured with
              Scope)
            </span>
          </StackHeader>
          <>
            <ExtraFlex>
              <>
                {notInUseSchemas.length > 0 ? (
                  notInUseSchemas.map(
                    (database, index: number) =>
                      database.apiName !== 'keepconfig' && (
                        <KeepSlimDatabaseCard
                          key={index}
                          database={database}
                          isSchema
                          onCardOpen={() => openDatabase(database)}
                          onCardDelete={() => requestDelete(database)}
                          onContextMenu={(event) => loadDatabase(event, database)}
                        />
                      )
                  )
                ) : (
                  <KeepZeroResults
                    mainLabel='0 not in use Schema'
                    secondaryLabel={``}
                  />
                )}
              </>
            </ExtraFlex>
          </>
        </>
      )}
      <KeepDeleteDialog
        selected={{
          isDeleteSchema: true,
          nsfPath: selectedNsf,
          schemaName: selectedDB,
        }}
      />
    </SchemasMainContainer>
  );
};

export default SchemasStacksView;
