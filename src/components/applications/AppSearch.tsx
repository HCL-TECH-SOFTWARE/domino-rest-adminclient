/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import SearchIcon from '@material-ui/icons/Search';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput,
} from '../../styles/CommonStyles';

interface AppsSearchProps {
  handleSearchApp: (e: any) => void;
}

const AppSearch: React.FC<AppsSearchProps> = ({ handleSearchApp }) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);

  return (
    <FormSearchContainer theme={themeMode} variant="outlined">
      <SearchContainer>
        <SearchIcon color="primary" className="search-icon" />
        <SearchInput
          onChange={handleSearchApp}
          style={{ color: getTheme(themeMode).textColorPrimary }}
          type="text"
          placeholder="Search Application"
        />
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default AppSearch;
