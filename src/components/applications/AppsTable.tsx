/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { AppProp } from '../../store/applications/types';
import AppItem from './AppItem';
import { FormikProps } from 'formik';
import AppFilterContainer from './AppFilterContainer';
import { fetchMyApps } from '../../store/applications/action';
import ZeroResultsWrapper from '../commons/ZeroResultsWrapper';
import { useAppDispatch } from '../../store/hooks';
import { KeepDataTable } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

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
  .launch {
    width: 4%;
  }

  .app-name {
    width: 26%;
  }

  .app-id-secret {
    width: 30%;
    font-size: var(--wa-font-size-m);
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

  const dispatch = useAppDispatch()

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    dispatch(fetchMyApps())
  };

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
        <ColumnLayout>
          <KeepDataTable
            paginated
            count={filteredApps.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(e) => handleChangePage(null, e.detail.page)}
            onRowsPerPageChange={(e) => { setRowsPerPage(e.detail.rowsPerPage); setPage(0); }}
          >
            <table aria-label="consents table">
              <Head>
                <tr>
                  <th className='launch' />
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
                      {/* <KeepInputText
                        hint='Search App Name'
                      /> */}
                    </div>
                  </th>
                  <th className='app-id-secret text'>
                    <div className='full-width flex flex-col gap-3'>
                      <span className='text-bold text-13'>
                        App ID
                      </span>
                      <span className='text-bold text-13'>
                        App Secret
                      </span>
                    </div>
                  </th>
                  <th className='description text'>
                    <div className='full-width flex flex-col gap-3'>
                      <span className='small-text text-bold'>
                        Description
                      </span>
                      <input type='text' className='search-bar hidden' />
                    </div>
                  </th>
                  <th className='icons' />
                </tr>
              </Head>
              <Body>
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
              </Body>
            </table>
          </KeepDataTable>
        </ColumnLayout>
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