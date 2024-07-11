/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Typography from '@mui/material/Typography';
import { useSelector, useDispatch } from 'react-redux';
import { Scope } from '../../../../../store/databases/types';
import { AppState } from '../../../../../store';
import MenuOptions from '../../../../database/menu/MenuOptions';
import SlimDatabaseCard from '../../../../database/views/SlimDatabaseCard';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer, StackHeader } from './ScopeStyles';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { ExtraFlex } from '../../../../flex';

type ScopesStacksViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesStacksView: React.FC<ScopesStacksViewProps> = ({ databases, openScope }) => {
  const { contextViewIndex } = useSelector(
    (state: AppState) => state.databases
  );
  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const setOption = useState({})[1];
  const [selected, setselected] = useState('');
  const dispatch = useDispatch();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

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
    dispatch(setDbIndex(getDatabaseIndex(databases, database.apiName, database.nsfPath)));
  };

  return (
    <SchemasMainContainer>
      <StackHeader>
        <Typography className="active-counts" component="p" variant="caption">
          {databases.filter((db) => db.isActive).length} Active Scope
        </Typography>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
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
                    openDatabase={() =>
                      openScope(databases[contextViewIndex])
                    }
                    data={databases[contextViewIndex]}
                  />
                </Paper>
              </ClickAwayListener>
            </Popper>
            {databases.filter((db) => db.isActive).length > 0 ? (
              databases
                .filter((db) => db.isActive)
                .map(
                  (database, index) =>
                    database.apiName !== 'keepconfig' && (
                      <SlimDatabaseCard
                        openDatabase={() => openScope(database)}
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
                mainLabel="0 Active Scope "
                secondaryLabel={``}
              />
            )}
          </>
        </ExtraFlex>
      </>
      <StackHeader>
        <Typography className="forms-count" component="p" variant="caption">
          {databases.filter((db) => !db.isActive).length} Inactive Scope
        </Typography>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
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
                    openDatabase={() =>
                      openScope(databases[contextViewIndex])
                    }
                    data={databases[contextViewIndex]}
                  />
                </Paper>
              </ClickAwayListener>
            </Popper>
            {databases.filter((db) => !db.isActive).length > 0 ? (
              databases
                .filter((db) => !db.isActive)
                .map(
                  (database, index: number) =>
                    database.apiName !== 'keepconfig' && (
                      <SlimDatabaseCard
                        openDatabase={() => openScope(database)}
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
                mainLabel="0 Inactive Scope"
                secondaryLabel={``}
              />
            )}
          </>
        </ExtraFlex>
      </>
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

export default ScopesStacksView;
