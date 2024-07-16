/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useSelector, useDispatch } from 'react-redux';
import DBIcon from '@mui/icons-material/Storage';
import Tooltip from '@mui/material/Tooltip';

import {
  SchemaCardContainer,
  SchemaCardHeader,
  SchemaDBImage
} from '../SchemaStyles';
import { ModeLogo, Options, OptionsIcon, SchemaIconStatus, DeleteIcon, InUseSymbol, NotInUseSymbol } from '../../../../../../styles/CommonStyles';
import '../../../../../../styles/text-manipulation.css';
import appIcons from '../../../../../../styles/app-icons';
import { AppState } from '../../../../../../store';
import { checkIcon } from '../../../../../../styles/scripts';
import { getTheme } from '../../../../../../store/styles/action';
import { toggleDeleteDialog } from '../../../../../../store/dialog/action';
import { CardLabelContainer } from './CardV2Styles';
import { toggleAlert } from '../../../../../../store/alerts/action';

const SchemaCardV2Container = styled(SchemaCardContainer)`
  &:hover {
    border: 1px solid ${(props) => getTheme(props.theme).hoverColor};

    .more {
      visibility: visible;
    }

    .config {
      display: block;
    }
  }

  .delete-icon {
    width: 20px;
    height: 20px;
    position: absolute;
    right: 20px;
    bottom: 5px;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
  }
`;

const SchemaCardWrapper = styled.div`
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
  setSelectedDB: (database: string) => void;
  setSelectedNsf: (nsfPath: string) => void;
  permissions: any;
  inUse: boolean;
};

const SchemaCardV2: React.FC<SchemaCardV2Props> = ({
  database,
  open,
  openDatabase,
  onContextMenu,
  selected,
  setSelectedDB,
  setSelectedNsf,
  permissions,
  inUse,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  
  const dispatch = useDispatch();
  const onDeleteClick = () => {
    if(permissions.deleteDbMapping){
      // Open the delete confirmation dialog
      setSelectedDB(database.schemaName);
      setSelectedNsf(database.nsfPath);
      dispatch(toggleDeleteDialog());
    }else{
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      openDatabase(database)
    }
  };

  const handleKeyPressDelete = (e: any) => {
    if (e.key === "Enter") {
      onDeleteClick();
    }
  };

  return (
    <SchemaCardV2Container
      state={{ selected, open, apiName: database.apiName }}
      theme={themeMode}
      variant="outlined"
    >
      <OptionsIcon>
        <Tooltip title={inUse ? 'Used by Scopes' : 'Not used by Scopes'}>
          <SchemaIconStatus style={{ position: 'absolute', right: '20px', top: '20px', backgroundImage: inUse ? InUseSymbol : NotInUseSymbol }} />
        </Tooltip>
      </OptionsIcon>
      <SchemaCardWrapper onKeyDown={handleKeyPress} tabIndex={1}>
        <CardContent 
          onClick={() => openDatabase(database)}
          className='schema-card-content'
        >
          <SchemaCardHeader>
            <ModeLogo onClick={onContextMenu}>
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
                    height: '55px !important',
                  }}
                />
              )}
            </ModeLogo>
            <CardLabelContainer>
              <Tooltip title={database.schemaName} arrow>
                <Typography
                  className="api-name"
                  variant="subtitle1"
                  component="p"
                  color="textPrimary"
                >
                  {database.schemaName}
                </Typography>
              </Tooltip>
              <Tooltip title={database.nsfPath} arrow placement='bottom'>
                <Typography
                  className="api-description"
                  variant="subtitle1"
                  component="p"
                  color="textPrimary"
                >
                  {database.nsfPath}
                </Typography>
              </Tooltip>
            </CardLabelContainer>
          </SchemaCardHeader>
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
      </SchemaCardWrapper>
      <Options>
        <Tooltip title="Delete schema" arrow>
          <DeleteIcon className="delete-icon" onClick={onDeleteClick} tabIndex={1} onKeyUp={handleKeyPressDelete} />
        </Tooltip>
      </Options>
    </SchemaCardV2Container>
  );
};

export default SchemaCardV2;
