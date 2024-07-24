/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import SettingTitle from '../SettingTitle';
import {
  SettingsDescription,
  SettingsList,
  SettingsContainer,
  SettingsConfiguration
} from '../styles';
import SubSettingTitle from '../SubSettingTitle';
import { DrawerContainer } from '../../../styles/CommonStyles';

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

interface MailSettingsPageProps {}

const AccountPage: React.FC<MailSettingsPageProps> = () => {
  const [state, setState] = React.useState({
    checkedA: true
  });

  const handleChange = (event: any) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };
  return (
    <DrawerContainer>
      <SettingTitle>Account</SettingTitle>
      <SettingsList>
        <SettingsContainer>
          <SettingItem title="Email" description="Last update March 28, 2020" />
          <SettingsConfiguration>
            michaelangelo.silva@pnp-hcl.com
          </SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Username"
            description="HCL Domino REST API Username"
          />
          <SettingsConfiguration>lquirm</SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Enable Notification"
            description="Want irritation? Switch it on!"
          />
          <SettingsConfiguration>
            <Switch
              checked={state.checkedA}
              onChange={handleChange}
              name="checkedA"
              color="primary"
              inputProps={{ 'aria-label': 'secondary checkbox' }}
            />
          </SettingsConfiguration>
        </SettingsContainer>
        <SubSettingTitle>Properties</SubSettingTitle>
        <SettingsContainer>
          <SettingItem
            title="Accounts"
            description="Accounts provide the information needed by components to connect to servers"
          />
          <SettingsConfiguration />
        </SettingsContainer>
      </SettingsList>
    </DrawerContainer>
  );
};

export default AccountPage;
