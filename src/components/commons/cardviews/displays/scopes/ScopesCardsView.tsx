/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useDispatch } from 'react-redux';
import { ExtraFlex } from '../../../../flex';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { Database } from '../../../../../store/databases/types';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer } from './ScopeStyles';
import { LitDefaultCard } from '../../../../lit-elements/LitElements';
import appIcons from '../../../../../styles/app-icons';

type ScopesCardsViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesCardsView: React.FC<ScopesCardsViewProps> = ({
  databases,
  openScope
}) => {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const setOption = useState({})[1];

  const [selectedDB, setSelectedDB] = useState('');
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
        {databases.length > 0 ? (
          databases.map((database: any, index: any) => {
            return (
              <LitDefaultCard
                status={database.isActive}
                icon={`data:image/svg+xml;base64, ${
                  appIcons[database.iconName]
                }`}
                title={database.apiName}
                subtitle={`${database.schemaName} (${database.nsfPath})`}
                acl={`${database.maximumAccessLevel ? database.maximumAccessLevel : '*Editor'}`}
                description={database.description}
                delete={false}
                onClick={() => openScope(database)}
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
