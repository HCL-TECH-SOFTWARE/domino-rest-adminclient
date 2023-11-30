/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { DataGrid } from '@material-ui/data-grid';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store';
import { fetchPeople } from '../../store/people/action';
import { AppFormContext } from '../applications/ApplicationContext';

/**
 * PeopleSelector.tsx provides support for fetching the list of People to select for group members
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

const PeopleSelector: React.FC = () => {
  const [formContext, setFormContext] = useState('');
  const dispatch = useDispatch();

  const columns = [
    { field: 'id', headerName: '', hide: true },
    { field: 'personName', headerName: 'Names', width: 280 },
  ];

  const peopleRows = useSelector((state: AppState) => state.peoples.peoples);
  useEffect(() => {
    dispatch(fetchPeople() as any);
  }, [dispatch]);

  return (
    <AppFormContext.Provider value={[formContext, setFormContext]}>
      <div
        style={{
          height: 350,
          width: '98%',
          marginTop: 20,
          borderWidth: '5px',
        }}
      >
        <DataGrid
          rowHeight={28}
          rows={peopleRows}
          columns={columns}
          pageSize={8}
          hideFooterSelectedRowCount
        />
      </div>
    </AppFormContext.Provider>
  );
};

export default PeopleSelector;
