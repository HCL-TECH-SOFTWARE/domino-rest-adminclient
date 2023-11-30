/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import SchemasAlphabeticalView from './SchemasAlphabeticalView';
import SchemasCardsView from './SchemasCardsView';
import SchemasDefaultView from './SchemasDefaultView';
import SchemasStacksView from './SchemasStacksView';

type SchemasMultiViewProps = {
  view: string;
  databases: any;
};

const SchemasMultiView: React.FC<SchemasMultiViewProps> = ({
  view,
  databases,
}) => {
  return (
    <>
      {view === 'nsf' && <SchemasDefaultView databases={databases} />}
      {view === 'alphabetical' && (
        <SchemasAlphabeticalView databases={databases} />
      )}
      {view === 'card' && <SchemasCardsView databases={databases} />}
      {view === 'stack' && <SchemasStacksView databases={databases} />}
    </>
  );
};

export default SchemasMultiView;
