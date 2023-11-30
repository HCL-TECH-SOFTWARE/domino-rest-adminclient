/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@material-ui/core';
import { tableCellClasses } from '@mui/material/TableCell';
import { RiDeleteBinLine } from 'react-icons/ri';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  paddingLeft: "30px",
  paddingRight: "30px",
  [`&.${tableCellClasses.head}`]: {
    fontWeight: "bold",
    paddingTop: "30px",
    borderBottom: "1px solid #848484",
  },
  [`&.${tableCellClasses.body}`]: {
    paddingTop: "20px",
    paddingBottom: "20px",
    borderBottom: '1px solid #bdbdbd',
  }
}));

const ColumnDetailsContainer = styled.div`
  box-sizing: border-box;

  position: absolute;
  width: 75%;
  height: 87%;
  
  background: #FFF;
  border: 1px solid #B4B4B4;
  border-radius: 10px;
  left: 23%;
  margin: 2% 2% 2% 0;

  overflow-y: scroll;

  .delete-icon {
    cursor: pointer;
    margin-left: 30px;
  }
`

interface ColumnDetailsProps {
  viewName: string;
  column: any;
  chosenColumns: any[];
  handleEditColumn: any;
  setEditColumn: any;
  setRemoveColumn: any;
}

const ColumnDetails: React.FC<ColumnDetailsProps> = ({
  viewName,
  column,
  chosenColumns,
  handleEditColumn,
  setEditColumn,
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
      <Table aria-label="edit columns table">
        <TableHead>
          <TableRow>
            <StyledTableCell width="150px"> </StyledTableCell>
            <StyledTableCell width="550px">Column Name</StyledTableCell>
            <StyledTableCell width="550px">External Name</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {chosenColumns.map((column) => (
            <TableRow key={column.name}>
              <StyledTableCell><RiDeleteBinLine size={"1.3em"} className='delete-icon' onClick={() => setRemoveColumn(column.name)} /></StyledTableCell>
              <StyledTableCell>{column.name}</StyledTableCell>
              <StyledTableCell><TextField hiddenLabel fullWidth 
                error={!!column.error ? (column.error === null ? false : true) : false} 
                helperText={!!column.error && errorTypes(column.error)}
                placeholder={column.externalName} 
                onChange={(event) => {handleEditColumn(column, event.target.value)}} />
              </StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ColumnDetailsContainer>
  );
}

export default ColumnDetails;
