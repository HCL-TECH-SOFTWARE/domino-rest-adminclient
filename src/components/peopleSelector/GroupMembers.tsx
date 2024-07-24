/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { DataGrid } from '@mui/x-data-grid';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppFormContext } from '../applications/ApplicationContext';
import { AppState } from '../../store';
/**
 * NewGroupMembers.tsx provides support to add people as group members
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

const GroupMembers: React.FC = () => {
  const [formContext, setFormContext] = useState('');

  const columns = [
    { field: 'id', headerName: '', hide: true },
    { field: 'fullName', headerName: 'Group Members', width: 285 },
  ];

  const memberRows = useSelector((state: AppState) => state.members.members);

  return (
    <AppFormContext.Provider value={[formContext, setFormContext]}>
      <div style={{ height: 350, width: '100%', marginTop: 20 }}>
        <DataGrid
          rowHeight={28}
          rows={memberRows}
          columns={columns}
          pageSizeOptions={[8]}
          hideFooterSelectedRowCount
        />
      </div>
    </AppFormContext.Provider>
  );
};

export default GroupMembers;
