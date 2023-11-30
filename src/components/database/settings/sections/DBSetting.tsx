/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import Switch from '@material-ui/core/Switch';
import { useSelector } from 'react-redux';
import TextField from '@material-ui/core/TextField';
import {
  SettingsDescription,
  SettingsList,
  SettingsContainer,
  SettingsConfiguration
} from './styles';
import DropdownIcons from '../../DropdownIcons';
import { SettingContext } from '../SettingContext';
import { getTheme } from '../../../../store/styles/action';
import { AppState } from '../../../../store';
import DropdownFormulaEngine from '../../../dialogs/DropdownFormulaEngine';
import { DrawerContainer } from '../../../../styles/CommonStyles';

const SettingItem: React.FC<{ title: string; description: string }> = ({
  title,
  description
}) => (
  <SettingsDescription>
    <Typography className="title" color="textPrimary">
      {title}
    </Typography>
    <Typography className="description" color="textPrimary">
      {description}
    </Typography>
  </SettingsDescription>
);

interface DBSettingProps {}

const DBSetting: React.FC<DBSettingProps> = () => {
  const [context, setContext] = useContext(SettingContext) as any;
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { apiName, description, isActive, filePath } = context;

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    const value =
      e.target.name === 'isActive' ? e.target.checked : e.target.value;
    setContext({ ...context, [e.target.name]: value });
  };

  return (
    <DrawerContainer>
      <SettingsList>
        <SettingsContainer>
          <SettingItem
            title="Active"
            description="Set Active or Inactive Database"
          />
          <SettingsConfiguration>
            <Switch
              checked={isActive}
              onChange={onChange}
              name="isActive"
              color="primary"
              inputProps={{ 'aria-label': 'active switch' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Api Name"
            description="Api Name in HCL Domino REST API Databases"
          />
          <SettingsConfiguration>
            <TextField
              onChange={onChange}
              name="apiName"
              value={apiName.toLowerCase().replace(/[^a-z0-9]/g, '')}
              InputLabelProps={{ shrink: false }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem title="File Path" description="Database Filepath" />
          <SettingsConfiguration>
            <InputBase
              disabled
              color="primary"
              name="filePath"
              defaultValue={filePath}
              inputProps={{ 'aria-label': 'naked' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Description"
            description="Provide Description on HCL Domino REST API Database"
          />
          <SettingsConfiguration>
            <TextareaAutosize
              name="description"
              onChange={onChange}
              defaultValue={description}
              style={{
                border: 0,
                fontSize: 14,
                resize: 'none',
                padding: '5px 5px 5px 0',
                background: 'none',
                color: getTheme(themeMode).textColorPrimary,
                borderBottom: `1px solid ${
                  getTheme(themeMode).textColorPrimary
                }`,
                outline: 'none'
              }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Formula Engine"
            description="Default Engine is Domino"
          />
          <SettingsConfiguration>
            <DropdownFormulaEngine />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem title="Icon" description="Set Icon of Database" />
          <SettingsConfiguration>
            <DropdownIcons />
          </SettingsConfiguration>
        </SettingsContainer>
      </SettingsList>
    </DrawerContainer>
  );
};

export default DBSetting;
