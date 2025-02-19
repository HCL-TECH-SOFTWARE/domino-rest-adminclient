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
import { Box, ButtonBase, IconButton, TableFooter, TablePagination, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { FirstPage, LastPage, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { FaSort } from "react-icons/fa";
import { AppState } from '../../store';
import { AppProp } from '../../store/applications/types';
import AppItem from './AppItem';
import { FormikProps } from 'formik';
import AppFilterContainer from './AppFilterContainer';
import { fetchMyApps } from '../../store/applications/action';
import { useDispatch } from 'react-redux';
import ZeroResultsWrapper from '../commons/ZeroResultsWrapper';

const StyledTableHead = styled(TableHead)`
  border-bottom: 1px solid #B8B8B8;

  .text {
    font-weight: bold;
    font-size: 14px;
  }

  .search-bar {
    border-radius: 5px;
    border: 1px solid grey;
    padding: 3px 10px;
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

  .launch {
    width: 4%;
  }

  .app-name {
    width: 26%;
  }

  .app-id-secret {
    width: 30%;
    font-size: 14px;
  }

  .description {
    width: 36%;
  }

  .icons {
    width: 9%;
  }

  .collapse {
    width: 100%;
  }

  .can-sort {
    gap: 3px;
    display: flex;
    align-items: center;
  }
`

interface AppsTableProps {
  filtersOn: boolean;
  setFiltersOn: (filtersOn: boolean) => void;
  reset: boolean;
  setReset: (reset: boolean) => void;
  deleteApplication: (appId: string) => void;
  formik: FormikProps<any>;
}

const AppsTable: React.FC<AppsTableProps> = ({ filtersOn, setFiltersOn, reset, setReset, deleteApplication, formik }) => {
  const { apps } = useSelector((state: AppState) => state.apps)
  
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const [filteredApps, setFilteredApps] = React.useState(apps)
  const [appName, setAppName] = React.useState("")
  const [sortAppName, setSortAppName] = React.useState(true)
  const [status, setStatus] = React.useState("All")
  const [appSecret, setAppSecret] = React.useState("All")

  const dispatch = useDispatch()

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    dispatch(fetchMyApps() as any)
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }

  const handleSortAppNames = () => {
    const appsCopy = [...apps]
    const sortedApps = appsCopy.sort((a, b) => {
      const aAppName = a.appName
      const bAppName = b.appName
      if (sortAppName) return aAppName.localeCompare(bAppName)
      else return bAppName.localeCompare(aAppName)
    })
    setFilteredApps(sortedApps)
    setSortAppName(!sortAppName)
  }

  React.useEffect(() => {
    const filterApps = (
      appName: string,
      status: string,
      appSecret: string,
    ) => {
      let newApps = apps
      if (appName.length > 0) {
        newApps = newApps.filter((app) => app.appName.toLowerCase().indexOf(appName.toLowerCase()) !== -1)
      }

      if (reset) {
        setFilteredApps(newApps)
        setReset(false)
        setPage(0)
      } else {
        switch (status) {
          case "Active":
            newApps = newApps.filter((app) => app.appStatus === "isActive")
            break
          case "Inactive":
            newApps = newApps.filter((app) => app.appStatus !== "isActive")
            break
          case "All":
            break
        }
        switch (appSecret) {
          case "App secret":
            newApps = newApps.filter((app) => !app.usePkce)
            break
          case "App secret generated":
            newApps = newApps.filter((app) => !app.usePkce && app.appSecret !== null)
            break
          case "App secret not generated":
            newApps = newApps.filter((app) => !app.usePkce && app.appSecret === null)
            break
          case "PKCE":
            newApps = newApps.filter((app) => app.usePkce)
            break
          case "All":
            break
        }
        setFilteredApps(newApps)
        setFiltersOn(true)
      }
    }

    filterApps(appName, status, appSecret)
  }, [appName, reset, setReset, apps, setFiltersOn, status, appSecret])

  React.useEffect(() => {
    if (filtersOn) {
      setFiltersOn(false)
    }
  }, [filtersOn, setFiltersOn])

  React.useEffect(() => {
    if (reset) {
      setSortAppName(true)
      setReset(false)
    }
  }, [reset, setReset])
  
  return (
    <>
      {apps.length === 0 ? 
        <ZeroResultsWrapper mainLabel='There are currently no apps to display.' secondaryLabel="Click 'Add Application' to create an app." />
        :
        <StyledTableContainer>
          <Table aria-label="consents table">
            <StyledTableHead>
              <TableRow>
                <TableCell className='launch' />
                <TableCell className='app-name text'>
                  <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                    <Typography className='text can-sort'>
                      App Name
                      <ButtonBase onClick={handleSortAppNames}><FaSort /></ButtonBase>
                    </Typography>
                    <input type='text' placeholder='Search App Name' value={appName} onChange={(e) => setAppName(e.target.value)} className='search-bar' />
                  </Box>
                </TableCell>
                <TableCell className='app-id-secret text'>
                  <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                    <Typography className='text' style={{ fontSize: '13px' }}>
                      App ID
                    </Typography>
                    <Typography className='text' style={{ fontSize: '13px' }}>
                      App Secret
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell className='description text'>
                  <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                    <Typography className='text'>
                      Description
                    </Typography>
                    <input type='text' className='search-bar' style={{ visibility: 'hidden' }} />
                  </Box>
                </TableCell>
                <TableCell className='icons' />
              </TableRow>
            </StyledTableHead>
            <StyledTableBody>
              {(rowsPerPage > 0
                ? filteredApps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                : filteredApps
              )
                .map((app: AppProp, idx: number) => {
                  return (
                    <AppItem
                      key={`${app.appName}-${idx}`}
                      app={app}
                      deleteApplication={deleteApplication}
                      formik={formik}
                    />
                  )
                })}
            </StyledTableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                  count={filteredApps.length}
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
                  ActionsComponent={({ count, page }) => (
                    <div style={{ flexShrink: 0, marginLeft: 10 }}>
                      <IconButton disabled={page === 0} aria-label='First Page' onClick={(e) => handleChangePage(e, 0)}>
                        <FirstPage />
                      </IconButton>
                      <IconButton disabled={page === 0} aria-label="Previous Page" onClick={(e) => handleChangePage(e, page - 1)}>
                        <KeyboardArrowLeft />
                      </IconButton>
                      <IconButton disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label='Next Page' onClick={(e) => handleChangePage(e, page + 1)}>
                        <KeyboardArrowRight />
                      </IconButton>
                      <IconButton disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label='Last Page' onClick={(e) => handleChangePage(e, Math.max(0, Math.ceil(filteredApps.length / rowsPerPage) - 1))}>
                        <LastPage />
                      </IconButton>
                    </div>
                  )}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </StyledTableContainer>
      }
      <AppFilterContainer
        status={status}
        setStatus={setStatus}
        appSecret={appSecret}
        setAppSecret={setAppSecret}
      />
    </>
  );
};

export default AppsTable;