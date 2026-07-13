/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/* eslint-disable no-use-before-define */
import React, { useContext } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import DBIcon from '@mui/icons-material/Storage';
import appIcons from '../../styles/app-icons';
import { checkIcon } from '../../styles/scripts';
import { SettingContext } from './settings/SettingContext';
import { AutoContainer } from '../../styles/CommonStyles';

interface DropdownIconsProps {}

const DropdownIcons: React.FC<DropdownIconsProps> = () => {
  const [context, setContext] = useContext(SettingContext) as any;

  const { iconName } = context;
  const onTagsChange = (event: any, values: any) => {
    setContext({ ...context, icon: appIcons[values], iconName: values });
  };

  return (
    <AutoContainer>
      <Autocomplete
        size="small"
        id="databases-icon"
        options={Object.keys(appIcons)}
        value={iconName}
        getOptionLabel={(option) => option}
        onChange={onTagsChange}
        renderOption={(props, option, { selected }) => {
          return (
            <li {...props}>
              <img
                style={{ height: 30, marginRight: 10 }}
                src={`data:image/svg+xml;base64, ${appIcons[selected ? option : option]}`}
                alt="database-icon"
              />
              <span className="color-text-primary">
                {option}
              </span>
            </li>
          );
        }}
        renderInput={(params) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {checkIcon(context.iconName) ? (
              <img
                style={{ height: 30, marginRight: 10 }}
                src={`data:image/svg+xml;base64, ${appIcons[context.iconName]}`}
                alt="database-icon"
              />
            ) : (
              <DBIcon style={{}} />
            )}

            <TextField
              color="primary"
              {...params}
              variant="outlined"
              fullWidth
            />
          </div>
        )}
      />
    </AutoContainer>
  );
};

export default DropdownIcons;
