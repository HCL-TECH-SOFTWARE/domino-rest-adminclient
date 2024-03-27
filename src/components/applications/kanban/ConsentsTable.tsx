/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import styled from 'styled-components';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { TableFooter, TablePagination } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import APILoadingProgress from '../../loading/APILoadingProgress';
import TablePaginationActions from '@material-ui/core/TablePagination/TablePaginationActions';
import { Consent } from '../../../store/consents/types';
import ConsentItem from './ConsentItem';

const StyledTableHead = styled(TableHead)`
  border-bottom: 1px solid #B8B8B8;
  background-color: #F0F4F7;

  .text {
    font-weight: bold;
  }
`

const StyledTableBody = styled(TableBody)`
  font-size: 14px;
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: none;
`

const StyledTableContainer = styled(TableContainer)`
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid #B9B9B9;
  background: #FFF;
  padding: 0;

  .expand {
    width: 50px;
  }

  .user {
    width: 30%;
  }

  .app-name {
    width: 20%;
  }

  .expirations {
    width: calc(40% - 50px);
  }

  .action {
    width: 10%;
  }

  .collapse {
    width: 100%;
  }
`

interface ConsentsTableProps {
  expand: boolean;
}

const ConsentsTable: React.FC<ConsentsTableProps> = ({ expand }) => {
  const { consents } = useSelector((state: AppState) => state.consents)
  const { consentsLoading, usersLoading } = useSelector((state: AppState) => state.loading)
  
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(5)

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - consents.length) : 0

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }
  
  return (
    <>
        {consentsLoading || usersLoading ? 
          <APILoadingProgress label="Users and Consents" />
          :
          <StyledTableContainer>
            <Table aria-label="consents table">
              <StyledTableHead>
                <TableRow>
                  <TableCell className='expand' />
                  <TableCell className='user text'>User</TableCell>
                  <TableCell className='app-name text'>App Name</TableCell>
                  <TableCell className='expirations text'>Expirations</TableCell>
                  <TableCell className='action text'>Action</TableCell>
                </TableRow>
              </StyledTableHead>
              <StyledTableBody>
                {(rowsPerPage > 0
                  ? consents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  : consents
                )
                  .map((consent: Consent, idx: number) => {
                    return (
                      <ConsentItem
                        key={`${consent.username}-${idx}`}
                        consent={consent}
                        idx={idx}
                        lastItem={idx === consents.length - 1 ? true : false}
                        expand={expand}
                      />
                    )
                  })}
              </StyledTableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                    count={consents.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    SelectProps={{
                      inputProps: {
                        'aria-label': 'rows per page',
                      },
                      style: {
                        borderRadius: '10px',
                        border: '1px solid black',
                        width: '70px',
                      }
                    }}
                    ActionsComponent={TablePaginationActions}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </StyledTableContainer>
        }
    </>
  );
};

export default ConsentsTable;