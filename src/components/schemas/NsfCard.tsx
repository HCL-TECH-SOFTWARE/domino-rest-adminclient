/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { useSelector, useDispatch } from 'react-redux';
import DBIcon from '@mui/icons-material/Storage';
import Tooltip from '@mui/material/Tooltip';
import { DeleteIcon, FormSearchContainer, ModeLogo, Options, SearchContainer, SearchInput } from '../../styles/CommonStyles';
import { getTheme } from '../../store/styles/action';
import { checkIcon } from '../../styles/scripts';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import {
  NsfCardContainer,
  SchemaCardHeader,
  SchemaDBImage,
} from './SchemaStyles';
import SearchIcon from '@mui/icons-material/Search';
import { Box } from '@mui/material';
import styled from 'styled-components';
import { toggleAlert } from '../../store/alerts/action';
import { toggleDeleteDialog } from '../../store/dialog/action';

const SchemaRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 12px 0;

  .api-status {
    width: 4px;
    height: 20px;
    flex-shrink: 0;
    background: #82DC73;
  }

  .unused {
    background: #F75764;
  }

  .delete-icon {
    right: 0;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');

    &:hover {
      cursor: pointer;
    }
  }
`;

type NsfCardProps = {
  database: any;
  open: boolean;
  openDatabase: (database: any) => void;
  setSelectedDB: (database: string) => void;
  setSelectedNsf: (nsfPath: string) => void;
};

const NsfCard: React.FC<NsfCardProps> = ({
  database,
  open,
  openDatabase,
  setSelectedDB,
  setSelectedNsf
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { scopes, permissions } = useSelector((state: AppState) => state.databases);
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const dispatch = useDispatch();
  const { databases } = database;
  const location = useLocation();
  const { pathname } = location;
  const isSchema = pathname === '/schema';
  const [searchKey, setSearchKey] = useState('');
  const [results, setResults] = useState(databases);

  const handleClickDelete = (data: any) => {
    if (permissions.deleteDbMapping) {
      setSelectedNsf(data.nsfPath);
      setSelectedDB(data.schemaName);
      dispatch(toggleDeleteDialog());
    } else {
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  };

  const handleSearchSchema = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value.trim();
    setSearchKey(key);
  }

  useEffect(() => {
    const schemasScopes = scopes.map((scope) => {
      return scope.nsfPath + ":" + scope.schemaName;
    });
    setSchemasWithScopes(schemasScopes);
  }, [scopes]);

  useEffect(() => {
    let schemas = databases.slice();
    if(searchKey) {
      schemas = schemas.filter((schema: any) => {
        if (isSchema) {
          return schema.schemaName.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        } else {
          return schema.apiName.toLowerCase().indexOf(searchKey.toLowerCase()) !== -1;
        }
      })
    }
    setResults(schemas);
  }, [databases, searchKey]);

  return (
    <NsfCardContainer
      state={{ open, apiName: databases[0].apiName }}
      theme={themeMode}
      variant="outlined"
    >
      <CardContent style={{ flex: 1, marginTop: '10px', marginLeft: '5px'}}>
        <SchemaCardHeader>
          <ModeLogo>
            {checkIcon(databases[0].iconName) ? (
              <SchemaDBImage
                src={`data:image/svg+xml;base64, ${
                  appIcons[databases[0].iconName]
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
          <Tooltip title={database.fileName} arrow placement='bottom'>
            <Typography
              className="file-name"
              variant="subtitle1"
              component="p"
              color="textPrimary"
              gutterBottom
            >
              {database.fileName}
            </Typography>
          </Tooltip>
        </SchemaCardHeader>
        <FormSearchContainer theme={themeMode} style={{ marginTop: 25, marginBottom: 16 }}>
          <SearchContainer style={{ padding: '12px 17px', backgroundColor: '#F9F9F9', border: '1px solid #A5AFBE', borderRadius: '10px' }}>
            <SearchIcon color="primary" className="search-icon" style={{ marginRight: '10px' }} />
            <SearchInput
              onChange={handleSearchSchema}
              type="text"
              placeholder={`Search ${isSchema ? 'Schema' : 'Scope'}`}
            />
          </SearchContainer>
        </FormSearchContainer>
        <Paper
          className="api-list"
          elevation={0}
        >
          {results.map((database: any, index: number) => {
            const openDatabaseByApi = () => openDatabase(database);
            const status = schemasWithScopes?.includes(database.nsfPath + ":" + database.schemaName) ? 'Used by Scopes' : 'Not used by Scopes';
            const description = isSchema ? database.schemaName : database.apiName;
            const handleEnterScope = (e: any) => {
              if (e.key === "Enter") {
                openDatabase(database);
              }
            };
            const handleEnterDelete = (e: any) => {
              if (e.key === "Enter") {
                setSelectedNsf(database.nsfPath);
                setSelectedDB(database.schemaName);
                toggleDeleteDialog();
              }
            };
            return (
              <div key={database.schemaName + database.nsfPath + index}>
                <SchemaRow>
                  {isSchema && <Tooltip title={status}>
                    <Box className={`api-status ${schemasWithScopes?.includes(database.nsfPath + ":" + database.schemaName) ? '' : 'unused'}`} />
                  </Tooltip>}
                  <Tooltip title={description}>
                    <Typography
                      className={`description ${isSchema ? '' : 'scope'}`}
                      variant="body1"
                      component="p"
                      color="textPrimary"
                      onClick={openDatabaseByApi}
                      tabIndex={1}
                      onKeyDown={handleEnterScope}
                    >
                      {description}
                    </Typography>
                  </Tooltip>
                  {isSchema && <Tooltip onClick={() => {handleClickDelete(database)}} title="Delete schema" arrow tabIndex={1} onKeyUp={handleEnterDelete}>
                    <DeleteIcon className="delete-icon"></DeleteIcon>
                  </Tooltip>}
                </SchemaRow>
                <hr color='#E6EBF5' style={{ padding: 0, margin: 0}} />
              </div>
            );
          })}
        </Paper>
      </CardContent>
      <Options>
      </Options>
    </NsfCardContainer>
  );
};

export default NsfCard;
