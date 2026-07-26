/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { ExtraFlex } from '../../../../flex';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
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

  return (
    <SchemasMainContainer>
      <span className='medium-font mb-30 mt-5 color-text-primary'>
        HCL Domino REST API Databases Scope
      </span>
      <ExtraFlex>
        {databases.length > 0 ? (
          databases.map((database: any, index: any) => {
            return (
              <LitDefaultCard
                key={database.apiName + database.schemaName + index}
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
