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
    <div
      className={`multicard-view-container ${scopePull ? 'pointer-auto' : 'pointer-none'}`}
    >
      <Button
          className='flex full-width text-transform-none medium-text justify-between color-text-primary'
          id="view-dropdown-button"
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
       >
        <span>{view === "nsf" ? view.toUpperCase() : view.charAt(0).toUpperCase() + view.slice(1)} View</span>
        <ArrowDropDownIcon className='color-text-primary' />
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
    </div> 
  );
};

export default CardViewOptions;
