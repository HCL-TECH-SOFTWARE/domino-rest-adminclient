/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '../../../../../router/react';
import { ExtraFlex } from '../../../../flex';
import { mapSchemas } from '../../../../../utils/mapper';
import { SchemasMainContainer } from './SchemaStyles';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { shallowEqual, useSelector } from 'react-redux';
import { AppState } from '../../../../../store';
import { KeepNsfCard } from '../../../../keep-elements/KeepElements';
import { toggleDeleteDialog } from '../../../../../store/dialog/action';
import { toggleAlert } from '../../../../../store/alerts/action';
import { useAppDispatch } from '../../../../../store/hooks';

type SchemasDefaultViewProps = {
  databases: Array<any>;
};

const SchemasDefaultView: React.FC<SchemasDefaultViewProps> = ({
  databases
}) => {
  const navigate = useNavigate();
  const [selectedNsf, setSelectedNsf] = useState('');
  const [selectedDB, setSelectedDB] = useState('');
  const { deleteDialog } = useSelector((state: AppState) => state.dialog, shallowEqual);
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const { scopes, permissions } = useSelector((state: AppState) => state.databases, shallowEqual);
  
  const dispatch = useAppDispatch();

  const prevScopesRef = useRef<any[]>([]);

  // Memoize mapped databases to prevent infinite re-renders
  const mappedDatabases = useMemo(() => {
    return mapSchemas(databases, 'schemas');
  }, [databases]);

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
        <span className='big-text mb-10 color-text-primary'>
          HCL Domino REST API Databases Schema
        </span>
        <ExtraFlex className='flex flex-row gap-5 flex-wrap'>
          {
            mappedDatabases.map((database: any) => {
              return (
                <KeepNsfCard
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
