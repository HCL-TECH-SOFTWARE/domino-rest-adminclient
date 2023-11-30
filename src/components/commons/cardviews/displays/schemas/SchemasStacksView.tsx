/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Scope } from '../../../../../store/databases/types';
import { AppState } from '../../../../../store';
import SlimDatabaseCard from '../../../../database/views/SlimDatabaseCard';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer, StackHeader } from './SchemaStyles';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { ExtraFlex } from '../../../../flex';

type SchemasStacksViewProps = {
  databases: Array<any>;
};

const SchemasStacksView: React.FC<SchemasStacksViewProps> = ({ databases }) => {
  const { scopes, onlyShowSchemasWithScopes } = useSelector(
    (state: AppState) => state.databases
  );
  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const history = useHistory();
  const setOption = useState({})[1];
  const [selected, setselected] = useState('');
  const dispatch = useDispatch();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

  const schemasWithScopes = scopes.map((scope) => {
    return scope.nsfPath + ':' + scope.schemaName;
  });

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
    history.push(
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
        <Typography className='active-counts' component='p' variant='subtitle1'>
          {inUseSchemas.length} in use Schema(s) (configured with Scope)
        </Typography>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
            {inUseSchemas.length > 0 ? (
              inUseSchemas.map(
                (database, index) =>
                  database.apiName !== 'keepconfig' && (
                    <SlimDatabaseCard
                      openDatabase={() => openDatabase(database)}
                      open={open}
                      selected={selected}
                      aria-describedby={id}
                      onContextMenu={(event) => loadDatabase(event, database)}
                      database={database}
                      key={index}
                      setSelectedDB={setSelectedDB}
                      setSelectedNsf={setSelectedNsf}
                    />
                  )
              )
            ) : (
              <ZeroResultsWrapper
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
            <Typography
              className='forms-count'
              component='p'
              variant='subtitle1'
            >
              {notInUseSchemas.length} not in use Schema(s) (not configured with
              Scope)
            </Typography>
          </StackHeader>
          <>
            <ExtraFlex>
              <>
                {notInUseSchemas.length > 0 ? (
                  notInUseSchemas.map(
                    (database, index: number) =>
                      database.apiName !== 'keepconfig' && (
                        <SlimDatabaseCard
                          openDatabase={() => openDatabase(database)}
                          open={open}
                          selected={selected}
                          aria-describedby={id}
                          onContextMenu={(event) =>
                            loadDatabase(event, database)
                          }
                          database={database}
                          key={index}
                          setSelectedDB={setSelectedDB}
                          setSelectedNsf={setSelectedNsf}
                        />
                      )
                  )
                ) : (
                  <ZeroResultsWrapper
                    mainLabel='0 not in use Schema'
                    secondaryLabel={``}
                  />
                )}
              </>
            </ExtraFlex>
          </>
        </>
      )}
      <DeleteDialog
        selected={{
          isDeleteSchema: true,
          nsfPath: selectedNsf,
          schemaName: selectedDB,
        }}
        open={deleteDialog}
      />
    </SchemasMainContainer>
  );
};

export default SchemasStacksView;
