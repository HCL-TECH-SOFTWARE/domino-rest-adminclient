/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { ExtraFlex } from '../../../../flex';
import { AppState } from '../../../../../store';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import ScopeCardV2 from './v2/ScopeCardV2';
import { Database } from '../../../../../store/databases/types';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { ClickAwayListener, Paper, Popper } from '@material-ui/core';
import MenuOptions from '../../../../database/menu/MenuOptions';
import { SchemasMainContainer } from './ScopeStyles';

type ScopesCardsViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesCardsView: React.FC<ScopesCardsViewProps> = ({
  databases,
  openScope
}) => {
  const { contextViewIndex } = useSelector(
    (state: AppState) => state.databases
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const setOption = useState({})[1];

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');
  const dispatch = useDispatch();

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
    dispatch(
      setDbIndex(
        getDatabaseIndex(databases, database.schemaName, database.nsfPath)
      )
    );
  };

  return (
    <SchemasMainContainer>
      <Typography
        style={{ fontSize: 16, marginBottom: 30, marginTop: 5 }}
        color="textPrimary"
      >
        HCL Domino REST API Databases Scope
      </Typography>
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
                margin: '-20px 15px 0 15px'
              }}
            >
              <MenuOptions
                onMenuHide={() => setAnchorEl(null)}
                openDatabase={() => openScope(databases[contextViewIndex])}
                data={databases[contextViewIndex]}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
        {databases.length > 0 ? (
          databases.map((database: any, index: any) => {
            return (
              <ScopeCardV2
                openDatabase={openScope}
                open={open}
                selected={selectedDB}
                aria-describedby={id}
                database={database}
                onContextMenu={(event) => loadDatabase(event, database)}
                key={index}
              />
            );
          })
        ) : (
          <ZeroResultsWrapper
            mainLabel=" Sorry, No result found"
            secondaryLabel={`What you search was unfortunately not found or doesn't exist.`}
          />
        )}
      </ExtraFlex>
    </SchemasMainContainer>
  );
};

export default ScopesCardsView;
