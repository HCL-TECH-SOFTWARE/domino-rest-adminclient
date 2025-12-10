/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { ExtraFlex } from '../../../../flex';
import { mapSchemas } from '../../../../../utils/mapper';
import { SchemasMainContainer } from './SchemaStyles';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../../../store';
import { LitNsfCard } from '../../../../lit-elements/LitElements';
import { toggleDeleteDialog } from '../../../../../store/dialog/action';
import { toggleAlert } from '../../../../../store/alerts/action';

type SchemasDefaultViewProps = {
  databases: Array<any>;
};

const SchemasDefaultView: React.FC<SchemasDefaultViewProps> = ({
  databases
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const [selectedNsf, setSelectedNsf] = useState('');
  const [selectedDB, setSelectedDB] = useState('');
  const { deleteDialog } = useSelector((state: AppState) => state.dialog, shallowEqual);
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const { scopes, permissions } = useSelector((state: AppState) => state.databases, shallowEqual);
  
  const dispatch = useDispatch();

  const prevScopesRef = useRef<any[]>([]);

  // Memoize mapped databases to prevent infinite re-renders
  const mappedDatabases = useMemo(() => {
    return mapSchemas(databases, 'schemas');
  }, [databases]);

  const open = Boolean(anchorEl);

  const openSchema = (database: any) => {
    navigate(
      `/schema/${encodeURIComponent(database.nsfPath)}/${
        database.schemaName
      }`
    );
  };

  const handleClickDelete = (data: any) => {
    if (permissions.deleteDbMapping) {
      setSelectedNsf(data.nsfPath);
      setSelectedDB(data.schemaName);
      dispatch(toggleDeleteDialog());
    } else {
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  };

  useEffect(() => {
    const scopesChanged = JSON.stringify(prevScopesRef.current) !== JSON.stringify(scopes);
    
    if (scopesChanged) {
      const schemasScopes = scopes.map((scope) => {
        return scope.nsfPath + ":" + scope.schemaName;
      });
      setSchemasWithScopes(schemasScopes);
      prevScopesRef.current = scopes;
    }
  }, [scopes]);

  return (
    <>
      <SchemasMainContainer>
        <Typography
          style={{ fontSize: 18, marginBottom: 10 }}
          color="textPrimary"
        >
          HCL Domino REST API Databases Schema
        </Typography>
        <ExtraFlex style={{ display: 'flex', gap: '10px' }}>
          {
            mappedDatabases.map((database: any, index: number) => {
              return (
                <LitNsfCard
                  key={database.fileName}
                  database={database}
                  schemasWithScopes={schemasWithScopes}
                  iconName={database.iconName}
                  deleteFn={handleClickDelete}
                  open={openSchema}
                />
              );
            })
          }
        </ExtraFlex>
      </SchemasMainContainer>
      <DeleteDialog
        selected={{
          isDeleteSchema: true,
          nsfPath: selectedNsf,
          schemaName: selectedDB,
        }}
        open={deleteDialog}
      />
    </>
  );
};

export default SchemasDefaultView;
