/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState }  from 'react';
import { IconButton, Tooltip } from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear'
import SearchIcon from '@material-ui/icons/Search';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { Button, Menu, MenuItem } from '@material-ui/core';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import Divider from '@material-ui/core/Divider';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput
} from '../../styles/CommonStyles';

interface DatabaseSearchProps {
  handleSearchDatabase: (e: any) => void;
  changeSearchType: (searchType: string) => void;
  searchType: string;
}

const DatabaseSearch: React.FC<DatabaseSearchProps> = ({
  handleSearchDatabase,
  changeSearchType,
  searchType
}) => {
  const [hideClearIcon, setHideClearIcon] = React.useState(true); 
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { scopePull } = useSelector((state: AppState) => state.databases);
  const history = useHistory();
  const { pathname } = history.location;
  const searchName = pathname.indexOf("schema") > 0 ? "SCHEMA NAME" : "SCOPE NAME";
  let searchTypes = [searchName, 'NSF NAME'];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 0) {
      setHideClearIcon(false);
    } else {
      setHideClearIcon(true);
    }
    handleSearchDatabase(e.target.value);
  };

  const handleClearIcon = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      setHideClearIcon(true);
      handleSearchDatabase('');
    }
  };

  const handleMenuItemClick = (event: any, key: string) => {
    changeSearchType(key);
    setAnchorEl(null);
  }

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <FormSearchContainer
      style={{ pointerEvents: scopePull ? 'auto' : 'none' }}
      theme={themeMode}
      variant="outlined"
    >
      <SearchContainer>
        <Button
            className='view-dropdown'
            id="view-dropdown-button"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
            style={{textTransform: 'none', width: '255px', minWidth: '191px', height: '100%', whiteSpace: 'nowrap', color: "#6C7882", fontSize: '16px', justifyContent: 'space-between', paddingLeft: '25px', paddingRight: '5px'}}
        >
            {searchType}
          <ArrowDropDownIcon style={{ width: '50px', height: '40px', color: '#555555'}} />
        </Button>
        <Menu
            id="simple-menu"
            style={{left: '15px', top: '10px'}}
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {searchTypes.map((key) => (
                <MenuItem key={key}
                  onClick={(event) => handleMenuItemClick(event, key)}
                >
                {key}
                </MenuItem>
            ))}
        </Menu> 
        <Divider orientation="vertical" flexItem />
        <SearchIcon color="primary" className="search-icon" />
        <SearchInput
          onChange={handleSearchInput}
          style={{ color: getTheme(themeMode).textColorPrimary }}
          type="text"
          data-testid="searchbar"
          placeholder={'Search'}
          ref={searchInputRef}
        />
        {!hideClearIcon && 
          <Tooltip title="clear" arrow>
            <IconButton
              size="small"
              aria-label="clear search bar"
              onClick={handleClearIcon}
            >
              <ClearIcon color="primary" className="clear-icon" />
            </IconButton>
          </Tooltip>
        }
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default DatabaseSearch;
