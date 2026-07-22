/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput,
} from '../../styles/CommonStyles';

interface ViewSearchProps {
  handleSearchView: (e: any) => void;
}

const ViewSearch: React.FC<ViewSearchProps> = ({ handleSearchView }) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { scopePull } = useSelector((state: AppState) => state.databases);

  return (
    <FormSearchContainer
      className={`${scopePull ? 'pointer-auto' : 'pointer-none'}`}
      theme={themeMode}
    >
      <SearchContainer>
        <SearchIcon color="primary" className="search-icon" />
        <SearchInput
          onChange={handleSearchView}
          className='color-text-primary'
          type="text"
          placeholder="Search Views"
        />
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default ViewSearch;
