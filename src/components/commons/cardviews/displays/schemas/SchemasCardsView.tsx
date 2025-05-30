/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ExtraFlex } from '../../../../flex';
import { AppState } from '../../../../../store';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { Database } from '../../../../../store/databases/types';
import { setDbIndex } from '../../../../../store/databases/action';
import { getDatabaseIndex } from '../../../../../store/databases/scripts';
import { SchemasMainContainer } from './SchemaStyles';
import { LitDefaultCard } from '../../../../lit-elements/LitElements';
import appIcons from '../../../../../styles/app-icons';
import { toggleDeleteDialog } from '../../../../../store/dialog/action';
import { toggleAlert } from '../../../../../store/alerts/action';

type SchemasCardsViewProps = {
  databases: Array<any>;
};

const SchemasCardsView: React.FC<SchemasCardsViewProps> = ({ databases }) => {
  const { contextViewIndex, permissions, scopes } = useSelector(
    (state: AppState) => state.databases
  );

  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const setOption = useState({})[1];
  const navigate = useNavigate();

  const [selectedDB, setSelectedDB] = useState('');
  const [selectedNsf, setSelectedNsf] = useState('');
  const dispatch = useDispatch();


  useEffect(() => {
    const schemasScopes = scopes.map((scope) => {
      return scope.nsfPath + ":" + scope.schemaName;
    });
    if schemasWithScopes !== schemasScopes setSchemasWithScopes(schemasScopes);
  }, [scopes]);

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

  const openSchema = (database: any) => {
    navigate(`/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`);
  };

  const onDeleteClick = (database: Database) => {
    if(permissions.deleteDbMapping){
      // Open the delete confirmation dialog
      setSelectedDB(database.schemaName);
      setSelectedNsf(database.nsfPath);
      dispatch(toggleDeleteDialog());
    } else{
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  }

  return (
    <SchemasMainContainer>
      <ExtraFlex>
        {
          databases.map((database: any, index: any) => {
            return (
              <LitDefaultCard
                title={database.schemaName}
                subtitle={database.nsfPath}
                description={database.description}
                delete={true}
                status={schemasWithScopes?.includes(database.nsfPath + ":" + database.schemaName)}
                onClick={() => openSchema(database)}
                icon={`data:image/svg+xml;base64, ${
                  appIcons[database.iconName]
                }`}
                onDelete={() => onDeleteClick(database)}
              />
            );
          })
        }
      </ExtraFlex>
      <DeleteDialog
        selected={{
          isDeleteSchema: true,
          nsfPath: selectedNsf,
          schemaName: selectedDB,
        }}
        open={deleteDialog}
      />
    </SchemasMainContainer>
  );
};

export default SchemasCardsView;
