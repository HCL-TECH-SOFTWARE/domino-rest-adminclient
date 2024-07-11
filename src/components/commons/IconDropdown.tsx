/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Button, Menu, MenuItem } from '@mui/material';
import appIcons from '../../styles/app-icons';
import { InputContainer } from '../../styles/CommonStyles';
import { getTheme } from '../../store/styles/action';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';

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
    size = 98,
}) => {
    const { themeMode } = useSelector((state: AppState) => state.styles);

    return (
        <InputContainer>
            <Button
                aria-controls="icons-menu"
                aria-haspopup="true"
                onClick={handleSelectIcon}
                className="icon-select"
            >
                <img
                    className="icon-image"
                    src={`data:image/svg+xml;base64, ${appIcons[displayIconName]}`}
                    alt="db-icon"
                    style={{
                    color: getTheme(themeMode).hoverColor,
                    width: `${size}px`,
                    height: `${size}px`
                    }}
                />
                <span style={{ textTransform: 'capitalize', paddingLeft: '11px', color: '#000' }}>{displayIconName.toLowerCase()}</span>
                <ChevronDown style={{ fontSize: 18 }} />
            </Button>
            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                {Object.keys(appIcons).map((iconName, index) => (
                    <MenuItem
                        key={iconName}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        <>
                            <img
                                className="icon-image"
                                src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                                alt="db-icon"
                                style={{
                                    color: getTheme(themeMode).hoverColor,
                                    height: 35,
                                    width: 35,
                                    marginRight: 10,
                                }}
                            />
                            {iconName}
                        </>
                    </MenuItem>
                ))}
            </Menu>
        </InputContainer>
    )
};
