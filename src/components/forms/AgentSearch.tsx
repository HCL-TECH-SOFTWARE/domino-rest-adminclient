/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput,
} from '../../styles/CommonStyles';

interface AgentSearchProps {
  handleSearchAgent: (e: any) => void;
}

const AgentSearch: React.FC<AgentSearchProps> = ({ handleSearchAgent }) => {
  const { scopePull } = useSelector((state: AppState) => state.databases);

  return (
    <FormSearchContainer
      className={`${scopePull ? 'pointer-auto' : 'pointer-none'}`}
    >
      <SearchContainer>
        <SearchIcon color="primary" className="search-icon" />
        <SearchInput
          onChange={handleSearchAgent}
          className='color-text-primary'
          type="text"
          placeholder="Search Agents"
        />
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default AgentSearch;
