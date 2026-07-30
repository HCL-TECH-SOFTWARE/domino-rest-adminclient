/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from '../../router/react';
import { Button } from '@mui/material';
import { AppState } from '../../store';
import { handleDatabaseViews } from '../../store/databases/action';
import { styled } from '@linaria/react';
import { TopNavigator } from '../../styles/CommonStyles';
import ViewsTable from './ViewsTable';
import { Database } from '../../store/databases/types';
import { KeepButton, KeepFormDialogHeader, KeepSearchInput, KeepSwitch } from '../keep-elements/KeepElements';
import type { KeepSearchChangeDetail } from '../keep-elements/keep-search-input';
import { useAppDispatch } from '../../store/hooks';

const TabViewsContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const ViewPanel = styled.div`
  box-sizing: border-box;

  display: flex;
  left: 0px;
  top: 0px;

  background: #FFFFFF;
  border: 1px solid #B9B9B9;
  border-radius: var(--wa-border-radius-l);
`;

const ButtonsPanel = styled.div`
  height: 60px;
  padding-left: 5px;
  
  .activate {
    color: #087251;
    padding: 0 10px 0 0;
    cursor: pointer;
    text-transform: none;
    background-color: transparent;
  }

  .deactivate {
    color: #aa1f51;
    padding: 0 0 0 10px;
    cursor: pointer;
    text-transform: none;
    background-color: transparent;
  }

  .disabled {
    color: var(--wa-color-text-quiet);
  }

  /*
   * The rule between the two buttons is CSS now rather than a glyph: .short-vertical from
   * styles.css, the separator AppItem already draws. Two adjustments are scoped here. It
   * is a div where the icon was inline, so it has to rejoin the buttons' inline flow; and
   * its shared 31px height is taller than these two buttons, so the height the glyph was
   * given (size 1.4em) is restated. Centring on the line box also retires the
   * translateY(29%) nudge the glyph needed to look level.
   */
  .short-vertical {
    display: inline-block;
    vertical-align: middle;
    height: 1.4em;
  }
`

/**
 * Database views Component
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 */


interface TabViewsProps {
  setViewOpen: (viewOpen: boolean) => void;
  setOpenViewName: (viewName: string) => void;
  schemaData: Database;
  setSchemaData: (data: any) => void;
}

const TabViews : React.FC<TabViewsProps> = ({ setViewOpen, setOpenViewName, schemaData, setSchemaData }) => {
  // `scopePull` used to be selected a second time inside ViewSearch; it gates pointer input
  // on the filter box while the list is still being pulled, and this component already
  // holds the slice it comes from.
  const { views, folders, scopePull } = useSelector((state: AppState) => state.databases);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const dispatch = useAppDispatch();
  const [searchKey, setSearchKey] = useState('');
  const [resetAllViews, setResetAllViews] = useState(false);

  let { dbName, nsfPath } = useParams() as { dbName: string, nsfPath: string };
  dbName = decodeURIComponent(dbName);
  nsfPath = decodeURIComponent(nsfPath);
  
  const [activeViews, setActiveViews] = useState(schemaData['views']?.map((view: any) => {
    const folderNames = folders.map((folder) => {return folder.viewName});
    return {
      viewActive: true,
      viewAlias: view.alias,
      viewName: view.name,
      viewUnid: view.unid,
      viewUpdated: view.viewUpdated,
      viewColumns: view.columns,
      viewFolder: folderNames.includes(view.name),
      viewSelectionFormula: view.selectionFormula,
    }
  }));

  const [activeViewNames, setActiveViewNames] = useState(activeViews?.map((view: any) => {return view.viewName}))
  const [updatedFolders, setUpdatedFolders] = useState(folders.map((folder) => {
    return {
      viewName: folder.viewName,
      viewUnid: folder.viewUnid,
      viewAlias: folder.viewAlias,
      viewUpdated: folder.viewUpdated,
      viewActive: activeViewNames?.includes(folder.viewName),
    }
  }));

  const [lists, setLists] = useState([...views, ...updatedFolders]);
  const [filtered, setFiltered] = useState(lists);
  const [showActive, setShowActive] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setActiveViews(schemaData['views']?.map((view: any) => {
      const folderNames = folders.map((folder) => {return folder.viewName});
      return {
        viewActive: true,
        viewAlias: view.alias,
        viewName: view.name,
        viewUnid: view.unid,
        viewUpdated: view.viewUpdated,
        viewColumns: view.columns,
        viewFolder: folderNames.includes(view.name),
        viewSelectionFormula: view.selectionFormula,
      }
    }))
  }, [schemaData, folders])

  useEffect(() => {
    setActiveViewNames(activeViews?.map((view: any) => {return view.viewName}))
  }, [activeViews])

  useEffect(() => {
    setUpdatedFolders(folders.map((folder) => {
      return {
        viewName: folder.viewName,
        viewUnid: folder.viewUnid,
        viewAlias: folder.viewAlias,
        viewUpdated: folder.viewUpdated,
        viewActive: activeViewNames?.includes(folder.viewName),
      }
    }))
  }, [folders, activeViewNames])

  useEffect(() => {
    setLists([...views, ...updatedFolders])
  }, [views, updatedFolders])

  useEffect(() => {
    if (showActive) {
      const activeList = [...views, ...updatedFolders].filter((view) => {
        return activeViewNames?.includes(view.viewName);
      });
      setLists(activeList);
    } else {
      setLists([...views, ...updatedFolders]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showActive, views, updatedFolders])

  const handleSearchView = (e: CustomEvent<KeepSearchChangeDetail>) => {
    const key = e.detail.value;
    setSearchKey(key);

    const filteredViews = lists.filter((data) => {
      return (
        data.viewName &&
        data.viewName.toLowerCase().indexOf(key.toLowerCase()) !== -1
      );
    });
    setFiltered(filteredViews);
  };

  const handleToggleShowActive = useCallback(() => {
    setShowActive(!showActive)
  }, [showActive]);

  const toggleActive = async (view: any) => {
    dispatch(handleDatabaseViews([view], activeViews, dbName, schemaData, true, setSchemaData, folders.map((folder) => {return folder.viewName})));
  }

  const toggleInactive = async (view: any) => {
    dispatch(handleDatabaseViews([view], activeViews, dbName, schemaData, false, setSchemaData, folders.map((folder) => {return folder.viewName})));
  }

  const handleActivateAll = () => {
    dispatch(handleDatabaseViews(views, activeViews, dbName, schemaData, true, setSchemaData, folders.map((folder) => {return folder.viewName})));
  }

  const handleDeactivateAll = () => {
    dispatch(handleDatabaseViews(views, activeViews, dbName, schemaData, false, setSchemaData, folders.map((folder) => {return folder.viewName})));
    setResetAllViews(false);
  }

  useEffect(() => {
    if (resetAllViews) {
      ref.current?.showModal()
    } else {
      if (ref.current?.close) {
        ref.current?.close()
      }
    }
  }, [resetAllViews])

  return (
    <TabViewsContainer>
      <TopNavigator>
        {/* No `value` — the element is deliberately uncontrolled; see KeepSearchInput. */}
        <KeepSearchInput
          placeholder="Search Views"
          disabled={!scopePull}
          onSearch={handleSearchView}
        />
      </TopNavigator>
      <div className='flex flex-row justify-between'>
        <ButtonsPanel>
          <Button
            disabled={views.length === 0 || loading}
            onClick={handleActivateAll}
            className={`activate ${views.length === 0 || loading ? 'disabled' : ''}`}
          >
            Activate All
          </Button>
          <div className='short-vertical' />
          <Button
            disabled={views.length === 0 || loading}
            onClick={() => setResetAllViews(true)}
            className={`deactivate ${views.length === 0 || loading ? 'disabled' : ''}`}
          >
            Deactivate All
          </Button>
        </ButtonsPanel>
        <KeepSwitch onToggle={handleToggleShowActive}>Show Active</KeepSwitch>
      </div>
      <ViewPanel>
        <ViewsTable
          views = {
            searchKey === ''
              ? lists
                  .slice()
                  .sort((a, b) => (a.viewName > b.viewName ? 1 : -1))
              : filtered
          }
          toggleActive={toggleActive}
          toggleInactive={toggleInactive}
          dbName={dbName}
          nsfPath={nsfPath}
          setViewOpen={setViewOpen}
          setOpenViewName={setOpenViewName}
         />
      </ViewPanel>
      <dialog ref={ref} className='dialog'>
        <KeepFormDialogHeader
          heading="Reset ALL View Columns?"
          onClose={() => {setResetAllViews(false)}}
        />
        <div className='dialog-content'>
          <text id="reset-view-dialog-contents" className='dialog-content-text'>
            Making this view inactive will reset all columns and remove any configuration done to ALL the views. Do you wish to proceed?
          </text>
        </div>
        <div className='dialog-actions'>
          <KeepButton variant="neutral" appearance="outlined"
            onClick={() => {setResetAllViews(false)}}
          >No</KeepButton>
          <KeepButton onClick={handleDeactivateAll}>Yes</KeepButton>
        </div>
      </dialog>
    </TabViewsContainer>
  );
};
export default TabViews;
