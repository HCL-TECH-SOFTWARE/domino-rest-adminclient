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
import { Box, IconButton, TableFooter, TablePagination, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import APILoadingProgress from '../../loading/APILoadingProgress';
import { Consent } from '../../../store/consents/types';
import ConsentItem from './ConsentItem';
import { FirstPage, LastPage, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import ConsentFilterContainer from '../../consents/ConsentFilterContainer';
import { FaSort } from "react-icons/fa";

const StyledTableHead = styled(TableHead)`
  border-bottom: 1px solid #B8B8B8;
  background-color: #F0F4F7;

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

  .can-sort {
    gap: 3px;
    display: flex;
    align-items: center;
  }
`

interface ConsentsTableProps {
  expand: boolean;
  filtersOn: boolean;
  setFiltersOn: (filtersOn: boolean) => void;
  reset: boolean;
  setReset: (reset: boolean) => void;
}

const ConsentsTable: React.FC<ConsentsTableProps> = ({ expand, filtersOn, setFiltersOn, reset, setReset }) => {
  const { consents } = useSelector((state: AppState) => state.consents)
  const { apps } = useSelector((state: AppState) => state.apps)
  const { users } = useSelector((state: AppState) => state.users)
  const { consentsLoading, usersLoading } = useSelector((state: AppState) => state.loading)
  
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const [filteredConsents, setFilteredConsents] = React.useState(consents)
  // states for filters
  const [user, setUser] = React.useState("")
  const [appName, setAppName] = React.useState("")
  const [status, setStatus] = React.useState("All")
  const [showWithApps, setShowWithApps] = React.useState(false)
  const [expiration, setExpiration] = React.useState({ expiration: "All", date: new Date()})
  const [tokenExpiration, setTokenExpiration] = React.useState({ expiration: "All", date: new Date()})
  const [scopes, setScopes] = React.useState([""])
  // sorting flags states
  const [sortUser, setSortUser] = React.useState(true)
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
    setStatus("All")
    setShowWithApps(false)
    setExpiration({ expiration: "All", date: new Date()})
    setTokenExpiration({ expiration: "All", date: new Date()})
    setScopes([""])
  }

  const getConsentUsername = (consent: Consent) => {
    const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
    const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
                      ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] :
                      consent.username
    return username
  }

  const getConsentAppName = (consent: Consent) => {
    const app = apps.find((app: any) => app.appId === consent.client_id)
    return app ? app.appName : "-"
  }

  const handleSortUsers = () => {
    const sortedConsents = consents.sort((a, b) => {
      const aUsername = getConsentUsername(a)
      const bUsername = getConsentUsername(b)
      if (sortUser) return aUsername.localeCompare(bUsername)
      else return bUsername.localeCompare(aUsername)
    })
    setFilteredConsents(sortedConsents)
    setSortUser(!sortUser)
  }

  const handleSortAppNames = () => {
    const sortedConsents = consents.sort((a, b) => {
      const aAppName = getConsentAppName(a)
      const bAppName = getConsentAppName(b)
      if (sortAppName) return aAppName.localeCompare(bAppName)
      else return bAppName.localeCompare(aAppName)
    })
    setFilteredConsents(sortedConsents)
    setSortAppName(!sortAppName)
  }

  React.useEffect(() => {
    const filterConsents = (
      user: string,
      appName: string,
      status: string,
      showWithApps: boolean,
      expiration: { expiration: string, date: Date },
      tokenExpiration: { expiration: string, date: Date },
      scopes: Array<string>,
    ) => {
      let newConsents = consents
      if (user.length > 0) newConsents = newConsents.filter((consent) => {
        const allMatches = users?.filter((user) => user[Object.keys(user)[0]].FullName[0] === consent.username);
        const username = allMatches && allMatches.length > 0 && allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] !== ''
                          ? allMatches[0][Object.keys(allMatches[0])[0]].InternetAddress[0] :
                          consent.username
        return username.toLowerCase().indexOf(user.toLowerCase()) !== -1
      })
      if (appName.length > 0) {
        newConsents = newConsents.filter((consent) => {
          const app = apps.find((app: any) => app.appId === consent.client_id)
          const consentApp = app ? app.appName : "-"
          if (consentApp.toLowerCase().indexOf(appName.toLowerCase()) !== -1) {
            return true
          } else {
            return false
          }
        })
      }

      if (reset) {
        setFilteredConsents(newConsents)
        setReset(false)
        resetFilters()
      } else {
        if (status.length > 0) {
          switch (status) {
            case "Active":
              newConsents = newConsents.filter((consent) => {
                if (new Date(consent.code_expires_at) > new Date()) return true
                else return false
              })
              break
            default:
          }
        }
        if (showWithApps) {
          newConsents = newConsents.filter((consent) => {
            const app = apps.find((app: any) => app.appId === consent.client_id)
            if (app !== undefined) {
              if (!!app.appName && app.appName !== '-') return true
              else return false
            } else {
              return false
            }
          })
        }
        if (expiration.expiration.length > 0) {
          switch (expiration.expiration) {
            case "All":
              break
            case "None":
              newConsents = newConsents.filter((consent) => new Date(consent.code_expires_at).toUTCString() === "Invalid Date")
              break
            default:
              newConsents = newConsents.filter((consent) => {
                const consentExpiration = new Date(consent.code_expires_at)
                const filterExpiration = new Date(expiration.date)
                return (
                  consentExpiration.getDate() === filterExpiration.getDate() &&
                  consentExpiration.getMonth() === filterExpiration.getMonth() &&
                  consentExpiration.getFullYear() === filterExpiration.getFullYear()
                )
              })
          }
        }
        if (tokenExpiration.expiration.length > 0) {
          switch (tokenExpiration.expiration) {
            case "All":
              break
            case "None":
              newConsents = newConsents.filter((consent) => new Date(consent.refresh_token_expires_at).toUTCString() === "Invalid Date")
              break
            default:
              newConsents = newConsents.filter((consent) => {
                const consentTokenExpiration = new Date(consent.refresh_token_expires_at)
                const filterTokenExpiration = new Date(tokenExpiration.date)
                return (
                  consentTokenExpiration.getDate() === filterTokenExpiration.getDate() &&
                  consentTokenExpiration.getMonth() === filterTokenExpiration.getMonth() &&
                  consentTokenExpiration.getFullYear() === filterTokenExpiration.getFullYear()
                )
              })
          }
        }
        if (scopes.filter(s => s !== '').length > 0) {
          newConsents = newConsents.filter((consent: Consent) => {
            const consentScopes = consent.scope.split(",");
            return scopes.some((scope) => scope !== '' && consentScopes.includes(scope));
          });
        }
        setFilteredConsents(newConsents)
        setFiltersOn(true)
      }

      setPage(0)

      if (status === "All" || showWithApps || expiration.expiration === "All" || tokenExpiration.expiration === "All" || scopes.length > 0) setFiltersOn(false)
    }

    filterConsents(user, appName, status, showWithApps, expiration, tokenExpiration, scopes)
  }, [user, appName, status, showWithApps, expiration, tokenExpiration, scopes, apps, consents, users, setFiltersOn, reset, setReset])

  React.useEffect(() => {
    if (filtersOn) {
      resetFilters()
      setFiltersOn(false)
    }
  }, [filtersOn, setFiltersOn])

  React.useEffect(() => {
    if (reset) {
      setUser("")
      setAppName("")
      setStatus("All")
      setShowWithApps(false)
      setExpiration({ expiration: "All", date: new Date()})
      setTokenExpiration({ expiration: "All", date: new Date()})
      setScopes([])
      setSortUser(true)
      setSortAppName(true)
      setReset(false)
    }
  }, [reset, setReset, consents])
  
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
                  <TableCell className='user'>
                    <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                      <Typography className='text can-sort'>
                        User
                        <button
                          onClick={handleSortUsers}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                        >
                          <FaSort />
                        </button>
                      </Typography>
                      <input type='text' placeholder='Search User' value={user} onChange={(e) => setUser(e.target.value)} className='search-bar' />
                    </Box>
                  </TableCell>
                  <TableCell className='app-name text'>
                    <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                      <Typography className='text can-sort'>
                        App Name
                        <button
                          onClick={handleSortAppNames}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', margin: 0, padding: 0 }}
                        >
                          <FaSort />
                        </button>
                      </Typography>
                      <input type='text' placeholder='Search App Name' value={appName} onChange={(e) => setAppName(e.target.value)} className='search-bar' />
                    </Box>
                  </TableCell>
                  <TableCell className='expirations text'>
                    <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                      <Typography className='text'>
                        Expirations
                      </Typography>
                      <input type='text' className='search-bar' style={{ visibility: 'hidden' }} />
                    </Box>
                  </TableCell>
                  <TableCell className='action text'>
                    <Box width='100%' display='flex' flexDirection='column' style={{ gap: '3px' }}>
                      <Typography className='text'>
                        Action
                      </Typography>
                      <input type='text' className='search-bar' style={{ visibility: 'hidden' }} />
                    </Box>
                  </TableCell>
                </TableRow>
              </StyledTableHead>
              <StyledTableBody>
                {(rowsPerPage > 0
                  ? filteredConsents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  : filteredConsents
                )
                  .map((consent: Consent, idx: number) => {
                    return (
                      <ConsentItem
                        key={`${consent.username}-${idx}`}
                        consent={consent}
                        expand={expand}
                      />
                    )
                  })}
              </StyledTableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                    count={filteredConsents.length}
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
                        <IconButton disabled={page >= Math.ceil(count / rowsPerPage) - 1} aria-label='Last Page' onClick={() => setPage(Math.max(0, Math.ceil(filteredConsents.length / rowsPerPage) - 1))}>
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
        <ConsentFilterContainer
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
        />
    </>
  );
};

export default ConsentsTable;