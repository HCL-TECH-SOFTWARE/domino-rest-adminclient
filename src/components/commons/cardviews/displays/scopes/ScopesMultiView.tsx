/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import ScopesCardsView from './ScopesCardsView';
import ScopesDefaultView from './ScopesDefaultView';
import ScopesAlphabeticalView from './ScopesAlphabeticalView';
import ScopesStacksView from './ScopesStacksView';

type ScopesMultiViewProps = {
  view: string;
  databases: any;
  openScope: (scope: any) => void;
};

const ScopesMultiView: React.FC<ScopesMultiViewProps> = ({
  view,
  databases,
  openScope,
}) => {
  return (
    <>
      {view === 'nsf' && <ScopesDefaultView databases={databases} openScope={openScope} />}
      {view === 'alphabetical' && (
        <ScopesAlphabeticalView databases={databases} openScope={openScope} />
      )}
      {view === 'card' && <ScopesCardsView databases={databases} openScope={openScope} />}
      {view === 'stack' && <ScopesStacksView databases={databases} openScope={openScope} />}
    </>
  );
};

export default ScopesMultiView;
