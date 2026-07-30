/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState }  from 'react';
import { IconButton } from '@mui/material';
import { useSelector } from 'react-redux';
import { useLocation } from '../../router/react';
import { AppState } from '../../store';
import { Button, Menu, MenuItem } from '@mui/material';
import Divider from '@mui/material/Divider';
import {
  FormSearchContainer,
  SearchContainer,
  SearchInput
} from '../../styles/CommonStyles';
import { KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

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
  const { scopePull } = useSelector((state: AppState) => state.databases);
  const { pathname } = useLocation();
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

  const handleMenuItemClick = (_event: any, key: string) => {
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
      className={`${scopePull ? 'pointer-auto' : 'pointer-none'}`}
    >
      <SearchContainer>
        <Button
            className='database-search-container-button color-text-primary medium-text'
            id="view-dropdown-button"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
        >
          <span className='medium-text'>{searchType}</span>
          {/* The .database-search-dropdown-arrow class is gone along with its rule: it
              declared width/height rather than font-size, MuiSvgIcon's own 1em box beat
              it, and applied to wa-icon it would have drawn a 50x40 canvas around an
              unchanged glyph. size='xl' reproduces the 24px this caret renders at today.
              No label: the button's search-type text names it. */}
          <KeepIcon name='caret-down' size='xl' />
        </Button>
        <Menu
            id="simple-menu"
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
        <KeepIcon name="magnifying-glass" className="search-icon" />
        <SearchInput
          onChange={handleSearchInput}
          className='color-text-primary'
          type="text"
          data-testid="searchbar"
          placeholder={'Search'}
          ref={searchInputRef}
        />
        {!hideClearIcon && 
          <KeepTooltip content="Clear" placement='bottom'>
            <IconButton
              size="small"
              aria-label="clear search bar"
              onClick={handleClearIcon}
            >
              {/* No size: .clear-icon in FormSearchContainer sets font-size 19px, and a
                  wa-size-* token could not override it from @layer wa-utilities. No
                  label either — the IconButton already carries aria-label. */}
              <KeepIcon name="xmark" className="clear-icon" />
            </IconButton>
          </KeepTooltip>
        }
      </SearchContainer>
    </FormSearchContainer>
  );
};

export default DatabaseSearch;
