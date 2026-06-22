/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { ExtraFlex } from '../../../../flex';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { mapSchemas } from '../../../../../utils/mapper';
import { SchemasMainContainer } from './ScopeStyles';
import { LitNsfCard } from '../../../../lit-elements/LitElements';

type ScopesDefaultViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesDefaultView: React.FC<ScopesDefaultViewProps> = ({
  databases,
  openScope
}) => {
  return (
    <SchemasMainContainer>
      <span className='medium-font mb-30 mt-5 color-text-primary'>
        HCL Domino REST API Databases Scope
      </span>
      <ExtraFlex style={{ display: 'flex', gap: '10px' }}>
        {databases.length > 0 ? (
          mapSchemas(databases, 'schemas').map((database: any, index: any) => {
            return (
              <LitNsfCard
                database={database}
                iconName={database.iconName}
                open={openScope}
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
