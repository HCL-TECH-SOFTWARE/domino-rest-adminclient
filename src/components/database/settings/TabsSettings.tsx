/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext, useState } from 'react';
import SwipeableViews from 'react-swipeable-views';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AccessSection from './sections/Access';
import DBSetting from './sections/DBSetting';
import { KEEP_ADMIN_BASE_COLOR } from '../../../config.dev';
import FormSettings from './sections/FormSettings';
import { AppState } from '../../../store';
import { SettingContext } from './SettingContext';
import { clearForms, updateScope } from '../../../store/databases/action';
import { DrawerContainer } from '../../../styles/CommonStyles';
import { toggleSettings } from '../../../store/dbsettings/action';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && <Box p={3}>{children}</Box>}
    </Typography>
  );
}

function a11yProps(index: any) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`
  };
}

const SettingHeader = styled.div`
  display: flex;
  padding: 10px 20px 0 20px;
  height: 70px;
  align-items: center;

  .apiName {
    font-size: 24px;
    margin-left: 10px;
    font-weight: 600;
  }

  .settings {
    margin-left: 5px;
    font-size: 24px;
  }
`;

const TabSettingsContainer = styled.div`
  display: flex;
  min-height: 60vh;

  .MuiTabs-vertical {
    width: 350px;
    padding-top: 20px;
  }

  .Mui-selected {
    color: ${KEEP_ADMIN_BASE_COLOR} !important;
    font-weight: 600;
    border-left: 2px solid #0066b3;
  }

  .MuiButtonBase-root {
    text-transform: capitalize;
    font-size: 16px;

    .MuiTab-wrapper {
      display: flex;
      justify-content: flex-start;
      flex-direction: row;
    }
  }
`;

const FooterDrawer = styled.div`
  height: 100px;
  display: flex;
`;

const tabPanels = [{ section: DBSetting }, { section: AccessSection }, { section: FormSettings }];

interface TabsSettingsProps {}

const TabsSettings: React.FC<TabsSettingsProps> = () => {
  const { databases, contextViewIndex } = useSelector((state: AppState) => state.databases);
  const dispatch = useDispatch();
  const theme = useTheme();
  const [value, setValue] = useState(0);

  const [context] = useContext(SettingContext) as any;

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: number) => {
    setValue(index);
  };

  const updateSetting = () => {
    dispatch(clearForms());
    const { forms, ...keepData } = context;
    dispatch(updateScope(keepData.isActive, keepData) as any);
  };

  return (
    <DrawerContainer>
      <CloseIcon cursor="pointer" className="float-right" onClick={() => dispatch(toggleSettings())} />
      <SettingHeader className="header-title">
        <EditIcon className="pencil-icon" color="primary" style={{ color: 'white' }} />
        <Typography className="apiName" color="textPrimary" style={{ color: 'white' }}>
          {databases[contextViewIndex].apiName}
        </Typography>
        <Typography className="settings" color="textPrimary" style={{ color: 'white' }}>
          Settings
        </Typography>
      </SettingHeader>
      <TabSettingsContainer>
        <Tabs
          orientation="vertical"
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="Database Settings">
          <Tab label="Database" {...a11yProps(0)} />
          <Tab label="Config" {...a11yProps(1)} />
          <Tab label="Forms" {...a11yProps(2)} />
        </Tabs>
        <Grid item md={12}>
          <SwipeableViews axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'} index={value} onChangeIndex={handleChangeIndex}>
            {tabPanels.map((panel, index) => (
              <TabPanel key={panel.section.name} value={value} index={index} dir={theme.direction}>
                <panel.section />
              </TabPanel>
            ))}
          </SwipeableViews>
          <FooterDrawer>
            <Button
              style={{
                width: 100,
                marginTop: 50,
                height: 40,
                backgroundColor: KEEP_ADMIN_BASE_COLOR,
                color: 'white'
              }}
              onClick={updateSetting}>
              <SaveIcon style={{ fontSize: 18, marginRight: 5 }} />
              Update
            </Button>
            <Button
              style={{
                width: 100,
                marginTop: 50,
                height: 40,
                backgroundColor: KEEP_ADMIN_BASE_COLOR,
                color: 'white',
                marginLeft: 20
              }}
              onClick={() => {
                dispatch(toggleSettings());
              }}>
              Close
            </Button>
          </FooterDrawer>
        </Grid>
      </TabSettingsContainer>
    </DrawerContainer>
  );
};

export default TabsSettings;
