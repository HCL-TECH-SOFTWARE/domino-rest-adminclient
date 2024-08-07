/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { ExtraFlex } from '../../../../flex';
import NsfCard from '../../../../schemas/NsfCard';
import { mapSchemas } from '../../../../../utils/mapper';
import { SchemasMainContainer } from './SchemaStyles';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { useSelector } from 'react-redux';
import { AppState } from '../../../../../store';

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
  const { deleteDialog } = useSelector((state: AppState) => state.dialog);

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

  const openSchema = (database: any) => {
    navigate(
      `/schema/${encodeURIComponent(database.nsfPath)}/${
        database.schemaName
      }`
    );
  };

  return (
    <>
      <SchemasMainContainer>
        <Typography
          style={{ fontSize: 18, marginBottom: 10 }}
          color="textPrimary"
        >
          HCL Domino REST API Databases Schema
        </Typography>
        <ExtraFlex>
          {
            mapSchemas(databases, 'schemas').map((database: any) => {
              return (
                <NsfCard
                  openDatabase={openSchema}
                  open={open}
                  key={database.fileName}
                  aria-describedby={id}
                  database={database}
                  setSelectedDB={setSelectedDB}
                  setSelectedNsf={setSelectedNsf}
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
