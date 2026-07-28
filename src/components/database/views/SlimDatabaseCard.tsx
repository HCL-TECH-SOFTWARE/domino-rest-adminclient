/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Card from '@mui/material/Card';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import DBIcon from '@mui/icons-material/Storage';
import { AppState } from '../../../store';
import { AppIcon } from '../../commons/AppIcon';
import { DeleteIcon } from '../../../styles/CommonStyles';
import { toggleDeleteDialog } from '../../../store/dialog/action';
import { toggleAlert } from '../../../store/alerts/action';
import { KeepTooltip } from '../../keep-elements/KeepElements';
import { useAppDispatch } from '../../../store/hooks';

const CardContainer = styled(Card)<{
  state: { selected: string; open: boolean; apiName: string };
}>`
  width: 336px;
  min-width: 250px;
  height: 70px;
  margin: 0 15px 15px 0px;
  padding: 17px 16px;
  border: 1px solid #C8D2DD;
  border-radius: var(--wa-border-radius-l) !important;
  background: var(--wa-color-surface-raised) !important;
  display: flex;
  align-items: center;

  @media only screen and (max-width: 1366px) {
    width: 250px !important;
  }

  user-select: none;
  cursor: pointer;

  &:hover {
    border: 1px solid var(--hover-color);
  }

  .MuiCardContent-root {
    padding: 0 !important;
  }

  .delete {
    display: flex;
    width: 10%;
    justify-content: flex-end;
  }

  .delete-icon {
    right: 0;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  width: 90%;

  .api-name {
    font-weight: 400 !important;
    text-overflow: ellipsis;
    overflow-x: hidden;
    white-space: nowrap;
    margin: 0;
    line-height: 1.2em;

    @media only screen and (max-width: 1366px) {
      font-size: var(--wa-font-size-m);
    }
  }

  .api-nsf {
    font-style: italic;
    text-overflow: ellipsis;
    overflow-x: hidden;
    white-space: nowrap;
    color: #5B666D;
    margin: 0;
    line-height: 1.2em;

    @media only screen and (max-width: 1366px) {
      font-size: var(--wa-font-size-m);
    }
  }

  .text-content {
    width: calc(100% - 44px);
    flex-direction: column;
    padding-left: 16px;
    gap: 0;
  }

  .bold {
    font-weight: bold !important;
  }
`;

const ModeLogo = styled.div`
  width: 44px;

  svg {
    border-radius: 50%;
    height: 35px;
  }
`;

const DBImage = styled.img`
  border-radius: 8px;
  height: 44px !important;
`;

interface DatabaseCardProps {
  database: any;
  selected: string;
  open: boolean;
  onContextMenu: (e: any) => void;
  openDatabase: (database: any) => void;
  setSelectedDB: (database: string) => void;
  setSelectedNsf: (nsfPath: string) => void;
}

const SlimDatabaseCard: React.FC<DatabaseCardProps> = ({
  database,
  onContextMenu,
  open,
  selected,
  openDatabase,
  setSelectedDB,
  setSelectedNsf,
}) => {
  const { permissions } = useSelector((state: AppState) => state.databases);
  const location = useLocation();
  const { pathname } = location;
  const isSchema = pathname === '/schema';
  const dispatch = useAppDispatch();

  const handleClickDelete = () => {
    if(permissions.deleteDbMapping){
      // Open the delete confirmation dialog
      setSelectedDB(database.schemaName);
      setSelectedNsf(database.nsfPath);
      dispatch(toggleDeleteDialog());
    }else{
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  }

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      openDatabase(database)
    }
  }

  const handleKeyPressDelete = (e: any) => {
    if (e.key === "Enter") {
      handleClickDelete();
    }
  }

  return (
    <CardContainer
      state={{ selected, open, apiName: database.apiName }}
      onContextMenu={onContextMenu}
      variant="outlined"
    >
      <CardHeader onClick={() => openDatabase(database)} tabIndex={1} onKeyDown={handleKeyPress}>
        <ModeLogo>
          <AppIcon
            name={database.iconName}
            alt="db-icon"
            className='color-hover'
            as={DBImage}
            fallback={<DBIcon className='color-hover' />}
          />
        </ModeLogo>
        <div className='text-content'>
          <KeepTooltip content={isSchema ? database.schemaName + '(' + database.nsfPath + ')' : database.apiName} without-arrow placement='bottom'>
            <span className="api-name bold color-text-primary">
              {isSchema ? database.schemaName : database.apiName}
            </span>
          </KeepTooltip>
          {isSchema && <span className="block api-nsf">
            {database.nsfPath}
          </span>}
        </div>
      </CardHeader>
      {isSchema && <div className='delete' onClick={handleClickDelete} onKeyUp={handleKeyPressDelete}>
        <KeepTooltip content="Delete schema">
          <DeleteIcon className="delete-icon" tabIndex={1} />
        </KeepTooltip>
      </div>}
    </CardContainer>
  );
};

export default SlimDatabaseCard;
