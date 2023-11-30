/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import Typography from '@material-ui/core/Typography';
import Switch from '@material-ui/core/Switch';
import {
  SettingsDescription,
  SettingsList,
  SettingsContainer,
  SettingsConfiguration,
} from './styles';
import { SettingContext } from '../SettingContext';
import { DrawerContainer } from '../../../../styles/CommonStyles';

const SettingItem: React.FC<{ title: string; description: string }> = ({
  title,
  description,
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

interface AccessSectionProps {}

const AccessSection: React.FC<AccessSectionProps> = () => {
  const [context, setContext] = useContext(SettingContext) as any;
  const { openAccess, dqlAccess, allowCode, allowDecryption } = context;

  const handleChange = (event: React.ChangeEvent<any>) => {
    const status = event.target.checked;
    setContext({
      ...context,
      [event.target.name]: status,
    });
  };

  return (
    <DrawerContainer>
      <SettingsList>
        <SettingsContainer>
          <SettingItem
            title="Open Access"
            description="Enable/Disable Open Access"
          />
          <SettingsConfiguration>
            <Switch
              checked={openAccess}
              onChange={handleChange}
              name="openAccess"
              color="primary"
              inputProps={{ 'aria-label': 'openAccess switch' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="DQL Access"
            description="Provide Database of DQL Access"
          />
          <SettingsConfiguration>
            <Switch
              checked={dqlAccess}
              onChange={handleChange}
              name="dqlAccess"
              color="primary"
              inputProps={{ 'aria-label': 'dqlAccess switch' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem title="Allow Code" description="Enable Code" />
          <SettingsConfiguration>
            <Switch
              checked={allowCode}
              onChange={handleChange}
              name="allowCode"
              color="primary"
              inputProps={{ 'aria-label': 'Code switch' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Allow Decryption"
            description="Allows Database to be Decrypted"
          />
          <SettingsConfiguration>
            <Switch
              checked={allowDecryption}
              onChange={handleChange}
              name="allowDecryption"
              color="primary"
              inputProps={{ 'aria-label': 'Database Decryption switch' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
      </SettingsList>
    </DrawerContainer>
  );
};

export default AccessSection;
