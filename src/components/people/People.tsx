/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import PeopleCRUD from './PeopleCRUD';
import { AppFormContext } from '../applications/ApplicationContext';

/**
 * People.tsx provides support for Domino people
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

const People: React.FC = () => {
  const [formContext, setFormContext] = useState('');

  useEffect(() => {
    document.title = 'HCL Domino REST API Admin | People';
  }, []);

  return (
    <AppFormContext.Provider value={[formContext, setFormContext]}>
      <PeopleCRUD />
    </AppFormContext.Provider>
  );
};

export default People;
