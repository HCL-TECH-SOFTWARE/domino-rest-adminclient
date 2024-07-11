/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState }  from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { useLocation } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { MultiCardViewContainer } from './CarViewstyles';

interface CardViewOptionsProps {
  changeView: (view: string) => void;
}

const CardViewOptions: React.FC<CardViewOptionsProps> = ({ changeView }) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { scopePull } = useSelector((state: AppState) => state.databases);
  const location = useLocation();
  const { search } = location;

  const displayType = search.split('?view=')[1];
  const view = search && displayType ? displayType : 'card';
  let views = ['Stack View', 'Card View', 'Alphabetical View', 'NSF View'];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuItemClick = (event: any, view: string) => {
    changeView(view);
    setAnchorEl(null);
  }

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <MultiCardViewContainer
      style={{ width: '200px', height: '43px', pointerEvents: scopePull ? 'auto' : 'none' }}
      theme={themeMode}
    >
      <Button
          className='view-dropdown'
          id="view-dropdown-button"
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          style={{textTransform: 'none', paddingLeft: '15px', width: '100%', fontSize: '16px', justifyContent: 'space-between', color: '#000'}}
       >
        {view === "nsf" ? view.toUpperCase() : view.charAt(0).toUpperCase() + view.slice(1)} View
        <ArrowDropDownIcon style={{ color: '#2B2B2B' }}/>
      </Button>
      <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {views.map((key) => (
              <MenuItem key={key}
                onClick={(event) => handleMenuItemClick(event, key.replace(" View","").toLowerCase())}
              >
              {key}
              </MenuItem>
          ))}
      </Menu>   
    </MultiCardViewContainer> 
  );
};

export default CardViewOptions;
