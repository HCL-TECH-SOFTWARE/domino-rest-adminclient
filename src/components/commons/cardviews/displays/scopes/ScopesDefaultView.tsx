/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import { ExtraFlex } from '../../../../flex';
import NsfCard from '../../../../schemas/NsfCard';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { mapSchemas } from '../../../../../utils/mapper';
import { SchemasMainContainer } from './ScopeStyles';

type ScopesDefaultViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesDefaultView: React.FC<ScopesDefaultViewProps> = ({
  databases,
  openScope
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;
  const [selectedNsf, setSelectedNsf] = useState('');
  const [selectedDB, setSelectedDB] = useState('');

  return (
    <SchemasMainContainer>
      <Typography
        style={{ fontSize: 18, marginBottom: 10 }}
        color="textPrimary"
      >
        HCL Domino REST API Databases Scope
      </Typography>
      <ExtraFlex>
        {databases.length > 0 ? (
          mapSchemas(databases, 'schemas').map((database: any, index: any) => {
            return (
              <NsfCard
                openDatabase={openScope}
                open={open}
                key={index}
                aria-describedby={id}
                database={database}
                setSelectedDB={setSelectedDB}
                setSelectedNsf={setSelectedNsf}
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

export default ScopesDefaultView;
