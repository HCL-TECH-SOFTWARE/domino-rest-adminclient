/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { Scope } from '../../../../../store/databases/types';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer, StackHeader } from './ScopeStyles';
import { KeepDeleteDialog, KeepSlimDatabaseCard, KeepZeroResults } from '../../../../keep-elements/KeepElements';
import { ExtraFlex } from '../../../../flex';
import { useAppDispatch } from '../../../../../store/hooks';

type ScopesStacksViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesStacksView: React.FC<ScopesStacksViewProps> = ({ databases, openScope }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const setOption = useState({})[1];
  const setselected = useState('')[1];
  const dispatch = useAppDispatch();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');

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
        <span className='small-text m-0 mt-5 mb-5'>
          {databases.filter((db) => db.isActive).length} Active Scope
        </span>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
            {databases.filter((db) => db.isActive).length > 0 ? (
              databases
                .filter((db) => db.isActive)
                .map(
                  (database, index) =>
                    database.apiName !== 'keepconfig' && (
                      <KeepSlimDatabaseCard
                        key={index}
                        database={database}
                        onCardOpen={() => openScope(database)}
                        onContextMenu={(event) => loadDatabase(event, database)}
                      />
                    )
                )
            ) : (
              <KeepZeroResults
                mainLabel="0 Active Scope "
                secondaryLabel={``}
              />
            )}
          </>
        </ExtraFlex>
      </>
      <StackHeader>
        <span className='small-text m-0 mt-5 mb-5'>
          {databases.filter((db) => !db.isActive).length} Inactive Scope
        </span>
      </StackHeader>
      <>
        <ExtraFlex>
          <>
            {databases.filter((db) => !db.isActive).length > 0 ? (
              databases
                .filter((db) => !db.isActive)
                .map(
                  (database, index: number) =>
                    database.apiName !== 'keepconfig' && (
                      <KeepSlimDatabaseCard
                        key={index}
                        database={database}
                        onCardOpen={() => openScope(database)}
                        onContextMenu={(event) => loadDatabase(event, database)}
                      />
                    )
                )
            ) : (
              <KeepZeroResults
                mainLabel="0 Inactive Scope"
                secondaryLabel={``}
              />
            )}
          </>
        </ExtraFlex>
      </>
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

export default ScopesStacksView;
