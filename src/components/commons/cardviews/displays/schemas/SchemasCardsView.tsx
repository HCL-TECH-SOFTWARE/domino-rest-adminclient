/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ExtraFlex } from '../../../../flex';
import { AppState } from '../../../../../store';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import SchemaCardV2 from './v2/SchemaCardV2';
import { Database } from '../../../../../store/databases/types';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { ClickAwayListener, Paper, Popper } from '@material-ui/core';
import MenuOptions from '../../../../database/menu/MenuOptions';
import { SchemasMainContainer } from './SchemaStyles';

type SchemasCardsViewProps = {
  databases: Array<any>;
};

const SchemasCardsView: React.FC<SchemasCardsViewProps> = ({ databases }) => {
  const { contextViewIndex, permissions, scopes } = useSelector(
    (state: AppState) => state.databases
  );

  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const setOption = useState({})[1];
  const history = useHistory();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');
  const dispatch = useDispatch();


  useEffect(() => {
    const schemasScopes = scopes.map((scope) => {
      return scope.nsfPath + ":" + scope.schemaName;
    });
    setSchemasWithScopes(schemasScopes);
  }, [scopes]);

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

  const loadDatabase = (
    event: React.MouseEvent<HTMLElement>,
    database: Database
  ) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    setOption(database);
    setSelectedDB(database.schemaName);
    setSelectedNsf(database.nsfPath);

    // Set Selected Database Index to Redux Store
    dispatch(setDbIndex(getDatabaseIndex(databases, database.schemaName, database.nsfPath)));
  };

  const openSchema = (database: any) => {
    history.push(`/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`);
  };

  return (
    <SchemasMainContainer>
      <ExtraFlex>
        <Popper
          style={{ zIndex: 1 }}
          placement="right-start"
          id={id}
          open={open}
          anchorEl={anchorEl}
        >
          <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
            <Paper
              elevation={1}
              style={{
                width: 300,
                margin: '-20px 15px 0 15px',
              }}
            >
              <MenuOptions
                onMenuHide={() => setAnchorEl(null)}
                openDatabase={() => openSchema(databases[contextViewIndex])}
                data={databases[contextViewIndex]}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
        {
          databases.map((database: any, index: any) => {
            return (
              <SchemaCardV2
                openDatabase={openSchema}
                open={open}
                selected={selectedDB}
                setSelectedDB={setSelectedDB}
                setSelectedNsf={setSelectedNsf}
                aria-describedby={id}
                database={database}
                onContextMenu={(event) => loadDatabase(event, database)}
                key={database.schemaName + database.nsfPath}
                permissions={permissions}
                inUse = {schemasWithScopes?.includes(database.nsfPath + ":" + database.schemaName)}
              />
            );
          })
        }
      </ExtraFlex>
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

export default SchemasCardsView;
