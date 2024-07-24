/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@mui/material/Typography';
import SettingTitle from '../SettingTitle';
import {
  SettingsDescription,
  SettingsList,
  SettingsContainer,
  SettingsConfiguration,
} from '../styles';
import ListRoles from './ListRoles';
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

interface RolesPageProps {}

const RolesPage: React.FC<RolesPageProps> = () => {
  return (
    <DrawerContainer>
      <SettingTitle>Roles</SettingTitle>
      <SettingsList>
        <SettingsContainer>
          <SettingItem title="Total Users" description="Number of users" />
          <SettingsConfiguration>4</SettingsConfiguration>
        </SettingsContainer>
        <ListRoles />
      </SettingsList>
    </DrawerContainer>
  );
};

export default RolesPage;
