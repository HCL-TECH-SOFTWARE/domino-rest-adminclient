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

interface DatabaseSearchProps {
  handleSearchDatabase: (e: any) => void;
}

const FormSearch: React.FC<DatabaseSearchProps> = ({
  handleSearchDatabase,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { databasePull } = useSelector((state: AppState) => state.databases);

  return (
    <FormSearchContainer
      className={`${databasePull ? 'pointer-auto' : 'pointer-none'}`}
      theme={themeMode}
    >
      <SearchContainer>
        <SearchIcon color="primary" className="search-icon" />
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
