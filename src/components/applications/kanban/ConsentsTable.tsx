/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { Consent } from '../../../store/consents/types';
import ConsentItem from './ConsentItem';
import ConsentFilterContainer from '../../consents/ConsentFilterContainer';
import { KeepDataTable, KeepPageLoading } from '../../keep-elements/KeepElements';
import { KeepIcon } from '../../keep-elements/react/KeepIcon';

const Head = styled.thead`
  border-bottom: 1px solid var(--wa-color-surface-border);

  .text {
    font-weight: bold;
    font-size: var(--wa-font-size-m);
  }

  .search-bar {
    border-radius: var(--wa-border-radius-m);
    border: 1px solid var(--wa-color-surface-border);
    padding: 3px 10px;
    background-color: var(--wa-color-surface-default);
    color: var(--wa-color-text-normal);
  }
`

const Body = styled.tbody`
  font-size: var(--wa-font-size-m);
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: none;
`

const ColumnLayout = styled.div`
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
          // The consents container is an auto-height flex column, so `pageHeight` is what
          // keeps this the full-page box it was rather than a strip at the top.
          <KeepPageLoading
            contained
            pageHeight
            message="Users and Consents are loading. This may take a few seconds..."
          />
          :
          <ColumnLayout>
            <KeepDataTable
              paginated
              headerBand
              count={filteredConsents.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(e) => setPage(e.detail.page)}
              onRowsPerPageChange={(e) => { setRowsPerPage(e.detail.rowsPerPage); setPage(0); }}
            >
              <table aria-label="consents table">
                <Head>
                  <tr>
                    <th className='expand' />
                    <th className='user'>
                      <div className='full-width flex flex-col gap-3'>
                        <span className='small-text text-bold flex items-center gap-3'>
                          User
                          <button
                            onClick={handleSortUsers}
                            className='no-background no-border cursor-pointer m-0 p-0'
                          >
                            <KeepIcon name='sort' label='Sort by user' />
                          </button>
                        </span>
                        <input type='text' placeholder='Search User' value={user} onChange={(e) => setUser(e.target.value)} className='search-bar' />
                      </div>
                    </th>
                    <th className='app-name text'>
                      <div className='full-width flex flex-col gap-3'>
                        <span className='small-text text-bold flex items-center gap-3'>
                          App Name
                          <button
                            onClick={handleSortAppNames}
                            className='no-background no-border cursor-pointer m-0 p-0'
                          >
                            <KeepIcon name='sort' label='Sort by app name' />
                          </button>
                        </span>
                        <input type='text' placeholder='Search App Name' value={appName} onChange={(e) => setAppName(e.target.value)} className='search-bar' />
                      </div>
                    </th>
                    <th className='expirations text'>
                      <div className='full-width flex flex-col gap-3'>
                        <span className='small-text text-bold flex items-center gap-3'>
                          Expirations
                        </span>
                        <input type='text' className='search-bar hidden' />
                      </div>
                    </th>
                    <th className='action text'>
                      <div className='full-width flex flex-col gap-3'>
                        <span className='small-text text-bold flex items-center gap-3'>
                          Action
                        </span>
                        <input type='text' className='search-bar hidden' />
                      </div>
                    </th>
                  </tr>
                </Head>
                <Body>
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
                </Body>
              </table>
            </KeepDataTable>
          </ColumnLayout>
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