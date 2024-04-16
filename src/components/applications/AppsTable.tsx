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
import { Box, ButtonBase, IconButton, TableFooter, TablePagination, Typography } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { FirstPage, LastPage, KeyboardArrowLeft, KeyboardArrowRight } from '@material-ui/icons';
import { FaSort } from "react-icons/fa";
import { AppState } from '../../store';
import { Consent } from '../../store/consents/types';
import APILoadingProgress from '../loading/APILoadingProgress';
import ConsentItem from './kanban/ConsentItem';
import ConsentFilterContainer from '../consents/ConsentFilterContainer';
import { AppProp } from '../../store/applications/types';
import AppItem from './AppItem';
import { FormikProps } from 'formik';

const StyledTableHead = styled(TableHead)`
  border-bottom: 1px solid #B8B8B8;
//   background-color: #F0F4F7;

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
    // width: calc(30% - 70px);
    // min-width: calc(30% - 200px);
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
//   // states for filters
//   const [user, setUser] = React.useState("")
  const [appName, setAppName] = React.useState("")
//   const [status, setStatus] = React.useState("All")
//   const [showWithApps, setShowWithApps] = React.useState(false)
//   const [expiration, setExpiration] = React.useState({ expiration: "All", date: new Date()})
//   const [tokenExpiration, setTokenExpiration] = React.useState({ expiration: "All", date: new Date()})
//   const [scopes, setScopes] = React.useState([""])
  // sorting flags states
//   const [sortUser, setSortUser] = React.useState(true)
  const [sortAppName, setSortAppName] = React.useState(true)

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

  const resetFilters = () => {
    // setStatus("All")
    // setShowWithApps(false)
    // setExpiration({ expiration: "All", date: new Date()})
    // setTokenExpiration({ expiration: "All", date: new Date()})
    // setScopes([""])
  }

  const getConsentAppName = (consent: Consent) => {
    const app = apps.find((app: any) => app.appId === consent.client_id)
    return app ? app.appName : "-"
  }

  const handleSortAppNames = () => {
    // const sortedConsents = consents.sort((a, b) => {
    //   const aAppName = getConsentAppName(a)
    //   const bAppName = getConsentAppName(b)
    //   if (sortAppName) return aAppName.localeCompare(bAppName)
    //   else return bAppName.localeCompare(aAppName)
    // })
    // setFilteredConsents(sortedConsents)
    setSortAppName(!sortAppName)
  }

  React.useEffect(() => {
    const filterApps = (
    //   user: string,
      appName: string,
    //   status: string,
    //   showWithApps: boolean,
    //   expiration: { expiration: string, date: Date },
    //   tokenExpiration: { expiration: string, date: Date },
    //   scopes: Array<string>,
    ) => {
      let newApps = apps
    //   if (user.length > 0) newConsents = newConsents.filter((consent) => {
    //     const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
    //     const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
    //                       ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] :
    //                       consent.username
    //     return username.toLowerCase().indexOf(user.toLowerCase()) !== -1
    //   })
      if (appName.length > 0) {
        // newApps = newApps.filter((appName) => {
        //   const app = apps.find((app: any) => app.appId === consent.client_id)
        //   const consentApp = app ? app.appName : "-"
        //   if (consentApp.toLowerCase().indexOf(appName.toLowerCase()) !== -1) {
        //     return true
        //   } else {
        //     return false
        //   }
        // })
        newApps = newApps.filter((app) => app.appName.toLowerCase().indexOf(appName.toLowerCase()) !== -1)
      }

      if (reset) {
        setFilteredApps(newApps)
        setReset(false)
        resetFilters()
      } else {
        // if (status.length > 0) {
        //   switch (status) {
        //     case "Active":
        //       newConsents = newConsents.filter((consent) => {
        //         if (new Date(consent.code_expires_at) > new Date()) return true
        //         else return false
        //       })
        //       break
        //     default:
        //   }
        // }
        // if (showWithApps) {
        //   newConsents = newConsents.filter((consent) => {
        //     const app = apps.find((app: any) => app.appId === consent.client_id)
        //     if (app !== undefined) {
        //       if (!!app.appName && app.appName !== '-') return true
        //       else return false
        //     } else {
        //       return false
        //     }
        //   })
        // }
        // if (expiration.expiration.length > 0) {
        //   switch (expiration.expiration) {
        //     case "All":
        //       break
        //     case "None":
        //       newConsents = newConsents.filter((consent) => new Date(consent.code_expires_at).toUTCString() === "Invalid Date")
        //       break
        //     default:
        //       newConsents = newConsents.filter((consent) => {
        //         const consentExpiration = new Date(consent.code_expires_at)
        //         const filterExpiration = new Date(expiration.date)
        //         return (
        //           consentExpiration.getDate() === filterExpiration.getDate() &&
        //           consentExpiration.getMonth() === filterExpiration.getMonth() &&
        //           consentExpiration.getFullYear() === filterExpiration.getFullYear()
        //         )
        //       })
        //   }
        // }
        // if (tokenExpiration.expiration.length > 0) {
        //   switch (tokenExpiration.expiration) {
        //     case "All":
        //       break
        //     case "None":
        //       newConsents = newConsents.filter((consent) => new Date(consent.refresh_token_expires_at).toUTCString() === "Invalid Date")
        //       break
        //     default:
        //       newConsents = newConsents.filter((consent) => {
        //         const consentTokenExpiration = new Date(consent.refresh_token_expires_at)
        //         const filterTokenExpiration = new Date(tokenExpiration.date)
        //         return (
        //           consentTokenExpiration.getDate() === filterTokenExpiration.getDate() &&
        //           consentTokenExpiration.getMonth() === filterTokenExpiration.getMonth() &&
        //           consentTokenExpiration.getFullYear() === filterTokenExpiration.getFullYear()
        //         )
        //       })
        //   }
        // }
        // if (scopes.filter(s => s !== '').length > 0) {
        //   newConsents = newConsents.filter((consent: Consent) => {
        //     const consentScopes = consent.scope.split(",");
        //     return scopes.some((scope) => scope !== '' && consentScopes.includes(scope));
        //   });
        // }
        setFilteredApps(newApps)
        setFiltersOn(true)
      }

      setPage(0)

    //   if (status === "All" || showWithApps || expiration.expiration === "All" || tokenExpiration.expiration === "All" || scopes.length > 0) setFiltersOn(false)
    }

    filterApps(appName)
  }, [appName, reset, setReset, apps, setFiltersOn])

  React.useEffect(() => {
    if (filtersOn) {
      resetFilters()
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
          <APILoadingProgress label="Applications" />
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
                      {/* <input type='text' className='search-bar' style={{ visibility: 'hidden' }} /> */}
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
                {/* {
                    filteredApps.map((app: any, idx: number) => {
                        return <app-item key={app.appId} ref={(ref: any) => {
                            if (ref) ref.setData(app)
                        }} />
                    })
                } */}
              </StyledTableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                    count={apps.length}
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
                        <IconButton disabled={page === 0} aria-label='First Page' onClick={() => setPage(0)}>
                          <FirstPage />
                        </IconButton>
                        <IconButton disabled={page === 0} aria-label="Previous Page" onClick={() => setPage(page - 1)}>
                          <KeyboardArrowLeft />
                        </IconButton>
                        <IconButton disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label='Next Page' onClick={() => setPage(page + 1)}>
                          <KeyboardArrowRight />
                        </IconButton>
                        <IconButton disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label='Last Page' onClick={() => setPage(Math.max(0, Math.ceil(apps.length / rowsPerPage) - 1))}>
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
        {/* <ConsentFilterContainer
          setStatus={setStatus}
          showWithApps={showWithApps}
          setShowWithApps={setShowWithApps}
          exp={expiration}
          setExp={setExpiration}
          tokenExp={tokenExpiration}
          setTokenExp={setTokenExpiration}
          setReset={setReset}
          scopes={scopes}
          setScopes={setScopes}
        /> */}
    </>
  );
};

export default AppsTable;