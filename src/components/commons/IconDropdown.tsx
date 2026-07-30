/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Button, Menu, MenuItem } from '@mui/material';
import { APP_ICON_NAMES } from '../../services/app-icons';
import { AppIcon } from './AppIcon';
import { InputContainer } from '../../styles/CommonStyles';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
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
                <AppIcon
                    name={displayIconName}
                    className="icon-dropdown-image"
                    alt="db-icon"
                />
                <span className='icon-dropdown-span'>
                    {displayIconName.toLowerCase()}
                </span>
                {/* No size: .big-text sets font-size 18px, and a wa-size-* token could not
                    override it from @layer wa-utilities. The glyph is the KeyboardArrowDown
                    module, whatever the local alias said. */}
                <KeepIcon name='chevron-down' className='big-text' />
            </Button>
            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
                disablePortal
            >
                {APP_ICON_NAMES.map((iconName, index) => (
                    <MenuItem
                        key={iconName}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        <>
                            <AppIcon
                                name={iconName}
                                className="icon-dropdown-image"
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
