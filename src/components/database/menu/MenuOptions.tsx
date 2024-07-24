/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useContext } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import RemoveIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import DeactivateIcon from '@mui/icons-material/Lock';
import EyeIcon from '@mui/icons-material/Visibility';
import CircularProgress from '@mui/material/CircularProgress';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { Divider } from '@mui/material';
import { Database } from '../../../store/databases/types';
import { AppState } from '../../../store';
import { toggleSettings } from '../../../store/dbsettings/action';
import { toggleDeleteDialog } from '../../../store/dialog/action';
import { fetchDBConfig, updateSchema } from '../../../store/databases/action';
import { getDatabaseIndex } from '../../../store/databases/scripts';
import { SettingContext } from '../settings/SettingContext';
import { MenuOptionsContainer, OptionList } from '../../../styles/CommonStyles';

const options = (database: Database) => {
  return [
    {
      left: <EyeIcon className="left-icon" />,
      label: 'Open',
    },
    {
      left: <DeactivateIcon className="left-icon" />,
      label: database.isActive ? 'Deactivate' : 'Activate',
      right: '',
    },
    { left: <RemoveIcon className="left-icon" />, label: 'Delete', right: '' },
    {
      left: <SettingsIcon className="left-icon" />,
      label: 'Properties',
      right: '',
    },
  ];
};

const Information = styled.div`
  padding: 10px 15px;

  .apiName {
    font-size: 16px;
    font-weight: 500;
  }

  .api-item {
    font-size: 13px;
    font-weight: 300;
    margin: 2px 0;
  }

  .api-item-value {
    font-size: 13px;
    font-weight: 400;
    margin: 2px 0;
  }
`;

interface MenuOptionsProps {
  data: any;
  openDatabase: (apiName: string) => void;
  onMenuHide: () => void;
}

const MenuOptions: React.FC<MenuOptionsProps> = ({
  data,
  openDatabase,
  onMenuHide,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { databases, contextViewIndex } = useSelector(
    (state: AppState) => state.databases
  );
  const { loading } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  const [, setContext] = useContext(SettingContext) as any;

  const {
    apiName,
    schemaName,
    nsfPath,
    description,
    formulaEngine,
    icon,
    iconName,
    isActive,
    owners,
    agents,
    allowCode,
    dqlAccess,
    openAccess,
    allowDecryption,
    excludedViews,
    storedProcedures,
    applicationAccessApprovers,
    configuredForms,
    forms,
  } = databases[contextViewIndex];

  const currentDB = databases[getDatabaseIndex(databases, apiName, nsfPath)];

  useEffect(() => {
    const getDatabaseConfig = (api: string) => {
      dispatch(fetchDBConfig(api) as any);
    };
    const board = document.getElementById('menu-option') as HTMLDivElement;
    board.addEventListener('contextmenu', (event) => event.preventDefault());

    if (currentDB.allowCode === null) {
      getDatabaseConfig(data.apiName);
    }
  }, [currentDB.allowCode, apiName,data.apiName,dispatch]);

  const deactivate = () => {
    const updatedSchema = {
      apiName,
      schemaName,
      nsfPath,
      description,
      isActive: false,
      icon,
      iconName,
      formulaEngine,
      allowCode,
      dqlAccess,
      openAccess,
      allowDecryption
    };
    dispatch(updateSchema(updatedSchema) as any);
    onMenuHide();
  };

  const activate = () => {
    const updatedSchema = {
      apiName,
      schemaName,
      nsfPath,
      description,
      isActive: true,
      icon,
      iconName,
      formulaEngine,
      allowCode,
      dqlAccess,
      openAccess,
      allowDecryption
    };
    dispatch(updateSchema(updatedSchema) as any);
    onMenuHide();
  };

  return (
    <MenuOptionsContainer id="menu-option" theme={themeMode}>
      <div>
        {loading ? (
          <div
            style={{
              height: 320,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CircularProgress color="primary" />
          </div>
        ) : (
          <>
            <Information>
              <Typography className="apiName" color="textPrimary">
                {apiName}
              </Typography>
              <div style={{ display: 'flex' }}>
                <div style={{}}>
                  <Typography className="api-item" color="textPrimary">
                    File Path
                  </Typography>
                  <Typography className="api-item" color="textPrimary">
                    Open Access
                  </Typography>
                  <Typography className="api-item" color="textPrimary">
                    DQL Access
                  </Typography>
                  <Typography className="api-item" color="textPrimary">
                    Allow Code
                  </Typography>
                  <Typography className="api-item" color="textPrimary">
                    Allow Decryption
                  </Typography>
                </div>
                <div style={{ marginLeft: 10 }}>
                  <Typography className="api-item-value" color="textPrimary">
                    {nsfPath}
                  </Typography>
                  <Typography className="api-item-value" color="textPrimary">
                    {openAccess ? 'Enable' : 'Disable'}
                  </Typography>
                  <Typography className="api-item-value" color="textPrimary">
                    {dqlAccess ? 'Enable' : 'Disable'}
                  </Typography>
                  <Typography className="api-item-value" color="textPrimary">
                    {allowCode ? 'Enable' : 'Disable'}
                  </Typography>
                  <Typography className="api-item-value" color="textPrimary">
                    {allowDecryption ? 'Enable' : 'Disable'}
                  </Typography>
                </div>
              </div>
            </Information>
            <Divider />
            <OptionList>
              <List>
                {options(databases[contextViewIndex]).map((option) => (
                  <ListItem
                    onClick={() => {
                      switch (option.label) {
                        case 'Open':
                          // Open Forms Page
                          openDatabase(apiName);
                          break;
                        case 'Delete':
                          // Show delete dialog
                          onMenuHide();
                          dispatch(toggleDeleteDialog());
                          break;
                        case 'Deactivate':
                          // Show delete dialog
                          deactivate();
                          break;
                        case 'Activate':
                          // Show delete dialog
                          activate();
                          break;
                        case 'Properties':
                          // Open Database Settings Dialog
                          dispatch(toggleSettings());
                          setContext({
                            apiName,
                            description,
                            nsfPath,
                            formulaEngine,
                            icon,
                            iconName,
                            owners,
                            isActive,
                            openAccess,
                            dqlAccess,
                            allowCode,
                            allowDecryption,
                            excludedViews,
                            agents,
                            storedProcedures,
                            applicationAccessApprovers,
                            forms,
                            configuredForms,
                          });
                          // Hide Menu
                          onMenuHide();
                          break;
                        default:
                      }
                    }}
                    className="option-item"
                    key={option.label}
                  >
                    <ListItemAvatar>{option.left}</ListItemAvatar>
                    <ListItemText className="label" primary={option.label} />
                    <ListItemSecondaryAction>
                      {option.right}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </OptionList>
          </>
        )}
      </div>
    </MenuOptionsContainer>
  );
};

export default MenuOptions;
