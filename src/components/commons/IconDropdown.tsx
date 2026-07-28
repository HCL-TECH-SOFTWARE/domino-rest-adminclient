/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Button, Menu, MenuItem } from '@mui/material';
import appIcons from '../../styles/app-icons';
import { InputContainer } from '../../styles/CommonStyles';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import React from 'react';

type IconDropdownProps = {
    handleSelectIcon: (event: React.MouseEvent<HTMLElement>) => void;
    displayIconName: string;
    anchorEl: null | HTMLElement;
    handleClose: () => void;
    selectedIndex: number;
    handleMenuItemClick: any;
    size: number;
};

export const IconDropdown: React.FC<IconDropdownProps> = ({
    handleSelectIcon,
    displayIconName,
    anchorEl,
    handleClose,
    selectedIndex,
    handleMenuItemClick,
}) => {
    return (
        <InputContainer>
            <Button
                aria-controls="icons-menu"
                aria-haspopup="true"
                onClick={handleSelectIcon}
                className="icon-select"
            >
                <img
                    className="icon-dropdown-image"
                    src={`data:image/svg+xml;base64, ${appIcons[displayIconName]}`}
                    alt="db-icon"
                />
                <span className='icon-dropdown-span'>
                    {displayIconName.toLowerCase()}
                </span>
                <ChevronDown className='big-text' />
            </Button>
            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
                disablePortal
            >
                {Object.keys(appIcons).map((iconName, index) => (
                    <MenuItem
                        key={iconName}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        <>
                            <img
                                className="icon-dropdown-image"
                                src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                                alt="db-icon"
                            />
                            {iconName}
                        </>
                    </MenuItem>
                ))}
            </Menu>
        </InputContainer>
    )
};
