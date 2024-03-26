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
import { Box, Button, ButtonBase, TableFooter, TablePagination, Tooltip, Typography } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { FiEdit2 } from 'react-icons/fi';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { FaRegFolderOpen } from "react-icons/fa";
import { AppState } from '../../../store';
import APILoadingProgress from '../../loading/APILoadingProgress';
import TablePaginationActions from '@material-ui/core/TablePagination/TablePaginationActions';
import { stringExpiration } from '../../../utils/common';

const StyledTableCell = styled(TableCell)`
  padding-left: 30px;
  padding-right: 30px;
`

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

const StyledTableRow = styled(TableRow)`
//   &:nth-of-type(odd) {
//     background-color: #F8FBFF;
//     border-bottom: none;
//   }

  // hide last border
  // &:last-child th, &:last-child td {
  //   border-bottom: 0;
  // }

  .exp-content {
    display: flex;
    flex-direction: column;
  }

  .exp-row {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
  }

  .text {
    font-size: 14px;
  }

  .revoke {
    color: #AA1F51;
  }
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
`

const StatusHeader = styled.div`
  cursor: default;

  .tooltip {
    background: #ffffff;
    text-color: #000000;
  }

  .status-icon {
    transform: translateY(10%);
  }
`

const EditIcon = styled.div`
  cursor: pointer;
`

const ViewNameDisplay = styled.div`
  text-transform: none;
  display: flex;
  align-items: center;
  gap: 10px;
`

const AliasContainer = styled.span`
    text-transform: none;
    cursor: default;
`

interface ViewsTableProps {
  views: Array<any>;
  toggleActive: any;
  toggleInactive: any;
  dbName: string;
  nsfPath: string;
  setViewOpen: any;
  setOpenViewName: any;
}

const ConsentsTable: React.FC = () => {
//   const { loading } = useSelector((state: AppState) => state.dialog);
//   const { folders } = useSelector((state: AppState) => state.databases);
//   const folderNames = folders.map((folder) => {return folder.viewName});
  const dispatch = useDispatch();
  const { consents, deleteConsentDialog, deleteUnid } = useSelector((state: AppState) => state.consents)
  const { consentsLoading, usersLoading } = useSelector((state: AppState) => state.loading)
  const { users } = useSelector((state: AppState) => state.users)
  const { apps } = useSelector((state: AppState) => state.apps)

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

  React.useEffect(() => {
    console.log(`users loading: ${usersLoading}`)
    console.log(`consents loading: ${consentsLoading}`)
  }, [usersLoading, consentsLoading])
  
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
                  .map((consent) => {
                    const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
                    const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
                                      ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress :
                                      consent.username
                    const app = apps.find((app: any) => app.appId === consent.client_id)
                    const expirationPast = new Date(consent.code_expires_at).getTime() - new Date().getTime()
                    const tokenExpirationPast = new Date(consent.refresh_token_expires_at).getTime() - new Date().getTime()
                    if (!tokenExpirationPast) {
                      console.log(new Date(consent.refresh_token_expires_at))
                      console.log(consent.refresh_token_expires_at)
                      console.log(new Date().getTime() - new Date(consent.refresh_token_expires_at).getTime())
                      console.log(stringExpiration(new Date(consent.refresh_token_expires_at).getTime() - new Date().getTime()))
                    }
                    return (
                      <StyledTableRow>
                        <TableCell className='expand' />
                        <TableCell className='user'>{username}</TableCell>
                        <TableCell className='app-name'>{app ? app.appName : "-"}</TableCell>
                        <TableCell className='expiration exp-content'>
                          <Box className='exp-row'>
                            <Tooltip title={expirationPast > 0 && expirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <circle cx="4.5" cy="4.5" r="4.5" fill={expirationPast < 0 ? '#C3335F' : expirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                              </svg>
                            </Tooltip>
                            <Typography className='text'>Expiration:</Typography>
                            <Typography className='text'>{`${new Date(consent.code_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.code_expires_at).toUTCString() : "-"}`}</Typography>
                          </Box>
                          <Box className='exp-row'>
                            <Tooltip title={tokenExpirationPast > 0 && tokenExpirationPast <= 86400000 ? "Expiring in less than a day" : ""}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <circle cx="4.5" cy="4.5" r="4.5" fill={tokenExpirationPast < 0 ? '#C3335F' : tokenExpirationPast <= 86400000 ? '#FFCD41' : '#0FA068'}/>
                              </svg>
                            </Tooltip>
                            <Typography className='text'>Token Expiration:</Typography>
                            <Typography className='text'>{`${new Date(consent.refresh_token_expires_at).toUTCString() !== 'Invalid Date' ? new Date(consent.refresh_token_expires_at).toUTCString() : "-"}`}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><ButtonBase className='revoke'>Revoke</ButtonBase></TableCell>
                      </StyledTableRow>
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
                        // backgroundColor: 'yellow',
                      },
                      // native: true,
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