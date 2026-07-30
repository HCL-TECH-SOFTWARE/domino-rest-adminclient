/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { TextField } from '@mui/material';
import { KeepDataTable } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

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
    /* Was RiDeleteBinLine size={"1.3em"}. wa-icon takes its box from font-size, not
       width, so the same relative measure has to be spelled as a font-size here. */
    font-size: 1.3em;
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
                {/* No button wrapper and no accessible name: a pre-existing a11y defect
                    owned by #713, preserved verbatim rather than fixed in passing. */}
                <td><KeepIcon name='trash' className='delete-icon' onClick={() => setRemoveColumn(column.name)} /></td>
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
