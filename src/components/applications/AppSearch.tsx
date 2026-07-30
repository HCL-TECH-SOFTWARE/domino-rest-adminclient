/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput,
} from '../../styles/CommonStyles';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

interface AppsSearchProps {
  handleSearchApp: (e: any) => void;
}

const AppSearch: React.FC<AppsSearchProps> = ({ handleSearchApp }) => {

  return (
    <FormSearchContainer>
      <SearchContainer>
        <KeepIcon name="magnifying-glass" className="search-icon" />
        <SearchInput
          onChange={handleSearchApp}
          className='color-text-primary'
          type="text"
          placeholder="Search Application"
        />
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default AppSearch;
