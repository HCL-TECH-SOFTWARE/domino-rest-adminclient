/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useSelector } from 'react-redux';
import DBIcon from '@mui/icons-material/Storage';
import Tooltip from '@mui/material/Tooltip';

import {
  SchemaCardContainer,
  ScopeCardHeader,
  SchemaDBImage
} from '../ScopeStyles';
import { InUseSymbol, ModeLogo, NotInUseSymbol, SchemaIconStatus } from '../../../../../../styles/CommonStyles';
import appIcons from '../../../../../../styles/app-icons';
import { AppState } from '../../../../../../store';
import { checkIcon } from '../../../../../../styles/scripts';
import { getTheme } from '../../../../../../store/styles/action';
import { CardLabelContainer } from './CardV2Styles';

import '../../../../../../styles/text-manipulation.css';

const ScopeCardWrapper = styled.div`
  flex: 1;
  display: flex;
  margin-top: 22px;
  margin-left: 5px;
  width: 100%;
`;

type SchemaCardV2Props = {
  database: any;
  open: boolean;
  selected: string;
  openDatabase: (database: any) => void;
  onContextMenu: (e: any) => void;
};

const SchemaCardV2: React.FC<SchemaCardV2Props> = ({
  database,
  open,
  openDatabase,
  onContextMenu,
  selected,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      openDatabase(database)
    }
  }

  return (
    <SchemaCardContainer
      state={{ selected, open, apiName: database.apiName }}
      theme={themeMode}
      variant="outlined"
      tabIndex={1}
      onKeyDown={handleKeyPress}
    >
      <Tooltip title={database.isActive ? 'Active' : 'Inactive'}>
        <SchemaIconStatus style={{ position: 'absolute', right: '20px', top: '20px', backgroundImage: database.isActive ? InUseSymbol : NotInUseSymbol }} />  
      </Tooltip>
      <ScopeCardWrapper>
        <CardContent onClick={() => openDatabase(database)}>
          <ScopeCardHeader>
            <ModeLogo>
              {checkIcon(database.iconName) ? (
                <SchemaDBImage
                  src={`data:image/svg+xml;base64, ${
                    appIcons[database.iconName]
                  }`}
                  alt="db-icon"
                  style={{
                    color: getTheme(themeMode).hoverColor,
                  }}
                />
              ) : (
                <DBIcon
                  style={{
                    background: getTheme(themeMode).primary,
                    color: getTheme(themeMode).hoverColor,
                  }}
                />
              )}
            </ModeLogo>
            <CardLabelContainer>
              <Tooltip title={database.apiName} arrow>
                <Typography
                  className="api-name"
                  variant="subtitle1"
                  component="p"
                  color="textPrimary"
                >
                  {database.apiName}
                </Typography>
              </Tooltip>
              <Tooltip title={`${database.schemaName}(${database.nsfPath})`} arrow>
                <Typography
                  className="api-description"
                  variant="subtitle1"
                  component="p"
                  color="textPrimary"
                >
                  {database.schemaName}({database.nsfPath})
                </Typography>
              </Tooltip>
              <Tooltip style=
              {
                !database.maximumAccessLevel || database.maximumAccessLevel === "" ? {color: "orange"} : {color: "green"}
              } 
              
              title={`Maximum Access Level: ${database.maximumAccessLevel ? database.maximumAccessLevel : 'Not Configured'}`} arrow>
                <Typography
                  className="api-description"
                  variant="subtitle2"
                  component="p"
                  color="textPrimary"
                >
                  <b>{database.maximumAccessLevel ? database.maximumAccessLevel : '*Editor'}</b>
                </Typography>
              </Tooltip>
            </CardLabelContainer>
          </ScopeCardHeader>
          <Tooltip title={database.description} arrow placement='bottom'>
            <Typography
              className="description schemaDescription"
              variant="body2"
              component="p"
              color="textPrimary"
            >
              {database.description}
            </Typography>
          </Tooltip>
        </CardContent>
      </ScopeCardWrapper>
    </SchemaCardContainer>
  );
};

export default SchemaCardV2;
