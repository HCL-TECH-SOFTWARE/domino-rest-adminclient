/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { ExtraFlex } from '../../../../flex';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { SchemasMainContainer } from './ScopeStyles';
import { KeepDefaultCard } from '../../../../keep-elements/KeepElements';
import { appIconUri, useAppIcons } from '../../../../../services/app-icons';

type ScopesCardsViewProps = {
  databases: Array<any>;
  openScope: (scope: any) => void;
};

const ScopesCardsView: React.FC<ScopesCardsViewProps> = ({
  databases,
  openScope
}) => {
  // Re-renders once the lazy icon chunk lands (#772); until then the cards show their
  // own skeleton, because `KeepDefaultCard.icon` is a plain string prop.
  const appIcons = useAppIcons();

  return (
    <SchemasMainContainer>
      <span className='medium-font mb-30 mt-5 color-text-primary'>
        HCL Domino REST API Databases Scope
      </span>
      <ExtraFlex>
        {databases.length > 0 ? (
          databases.map((database: any, index: any) => {
            return (
              <KeepDefaultCard
                key={database.apiName + database.schemaName + index}
                status={database.isActive}
                icon={appIconUri(database.iconName, appIcons)}
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
