/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { TextField } from '@mui/material';
import { RiDeleteBinLine } from 'react-icons/ri';
import { KeepDataTable } from '../keep-elements/KeepElements';

const ColumnDetailsContainer = styled.div`
  box-sizing: border-box;

  width: 75%;
  height: 100%;

  left: 23%;
  margin-right: 2%;
  padding: 0;

  .delete-icon {
    cursor: pointer;
    margin-left: 30px;
  }
`

/** `width` is valid on <th> but absent from React's ThHTMLAttributes, which types it only on <td>. */
const colWidth = (width: string) => ({ width });

interface ColumnDetailsProps {
  viewName: string;
  column: any;
  chosenColumns: any[];
  handleEditColumn: any;
  setEditColumn: any;
  setRemoveColumn: any;
}

const ColumnDetails: React.FC<ColumnDetailsProps> = ({
  chosenColumns,
  handleEditColumn,
  setRemoveColumn,
}) => {

  const errorTypes = (error: any) => {
    switch (error) {
      case "duplicate":
        return "Cannot have duplicate external names!"
      default:
        return ""
    }
  }

  return (
    <ColumnDetailsContainer>
      <KeepDataTable>
        <table aria-label="edit columns table">
          <thead>
            <tr>
              <th {...colWidth('150px')}> </th>
              <th {...colWidth('550px')}>Column Name</th>
              <th {...colWidth('550px')}>External Name</th>
            </tr>
          </thead>
          <tbody>
            {chosenColumns.map((column) => (
              <tr key={column.name}>
                <td><RiDeleteBinLine size={"1.3em"} className='delete-icon' onClick={() => setRemoveColumn(column.name)} /></td>
                <td>{column.name}</td>
                <td><TextField hiddenLabel fullWidth
                  error={column.error ? (column.error === null ? false : true) : false}
                  helperText={!!column.error && errorTypes(column.error)}
                  placeholder={column.externalName}
                  onChange={(event) => {handleEditColumn(column, event.target.value)}} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </KeepDataTable>
    </ColumnDetailsContainer>
  );
}

export default ColumnDetails;
