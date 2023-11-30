/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import Switch from '@material-ui/core/Switch';
import SettingTitle from '../SettingTitle';
import {
  SettingsDescription,
  SettingsList,
  SettingsContainer,
  SettingsConfiguration,
} from '../styles';
import SubSettingTitle from '../SubSettingTitle';
import { DrawerContainer } from '../../../styles/CommonStyles';

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

interface MailSettingsPageProps {}

const MailSettingsPage: React.FC<MailSettingsPageProps> = () => {
  const [state, setState] = React.useState({
    checkedA: true,
  });

  const handleChange = (event: any) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };
  return (
    <DrawerContainer>
      <SettingTitle>Mail Settings</SettingTitle>
      <SettingsList>
        <SettingsContainer>
          <SettingItem
            title="Mail File Location"
            description="Setup server address"
          />
          <SettingsConfiguration>Local</SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Domino Mail Domain"
            description="Set default Domino Mail Database"
          />
          <SettingsConfiguration>Test</SettingsConfiguration>
        </SettingsContainer>
        <SettingsContainer>
          <SettingItem
            title="Enable Notification"
            description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Necessitatibus suscipit officia tenetur amet eaque."
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

export default MailSettingsPage;
