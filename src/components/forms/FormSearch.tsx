/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput,
} from '../../styles/CommonStyles';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

interface DatabaseSearchProps {
  handleSearchDatabase: (e: any) => void;
}

const FormSearch: React.FC<DatabaseSearchProps> = ({
  handleSearchDatabase,
}) => {
  const { databasePull } = useSelector((state: AppState) => state.databases);

  return (
    <FormSearchContainer
      className={`${databasePull ? 'pointer-auto' : 'pointer-none'}`}
    >
      <SearchContainer>
        <KeepIcon name="magnifying-glass" className="search-icon" />
        <SearchInput
          onChange={handleSearchDatabase}
          className='color-text-primary'
          type="text"
          placeholder="Search Forms"
        />
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default FormSearch;
