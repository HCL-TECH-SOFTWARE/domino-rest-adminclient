/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { AppState } from '../../store';
import ViewSearch from './ViewSearch';
import { handleDatabaseViews } from '../../store/databases/action';
import styled from 'styled-components';
import { TopNavigator } from '../../styles/CommonStyles';
import ViewsTable from './ViewsTable';
import { RxDividerVertical } from 'react-icons/rx';
import { Database } from '../../store/databases/types';
import { LitSwitch } from '../lit-elements/LitElements';

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
  border-radius: 10px;
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
    color: #5d6160;
  }

  .vertical {
    transform: translateY(29%);
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
  const { views, folders } = useSelector((state: AppState) => state.databases);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
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
  }, [showActive, views, updatedFolders])

  const handleSearchView = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
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
    dispatch(handleDatabaseViews([view], activeViews, dbName, schemaData, true, setSchemaData, folders.map((folder) => {return folder.viewName})) as any);
  }

  const toggleInactive = async (view: any) => {
    dispatch(handleDatabaseViews([view], activeViews, dbName, schemaData, false, setSchemaData, folders.map((folder) => {return folder.viewName})) as any);
  }

  const handleActivateAll = () => {
    dispatch(handleDatabaseViews(views, activeViews, dbName, schemaData, true, setSchemaData, folders.map((folder) => {return folder.viewName})) as any);
  }

  const handleDeactivateAll = () => {
    dispatch(handleDatabaseViews(views, activeViews, dbName, schemaData, false, setSchemaData, folders.map((folder) => {return folder.viewName})) as any);
    setResetAllViews(false);
  }

  return (
    <TabViewsContainer>
      <TopNavigator>
        <ViewSearch handleSearchView={handleSearchView} />
      </TopNavigator>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <ButtonsPanel>
          <Button
            disabled={views.length === 0 || loading}
            onClick={handleActivateAll}
            className={`activate ${views.length === 0 || loading ? 'disabled' : ''}`}
          >
            Activate All
          </Button>
          <RxDividerVertical size={"1.4em"} className="vertical"/>
          <Button
            disabled={views.length === 0 || loading}
            onClick={() => setResetAllViews(true)}
            className={`deactivate ${views.length === 0 || loading ? 'disabled' : ''}`}
          >
            Deactivate All
          </Button>
        </ButtonsPanel>
        <LitSwitch onToggle={handleToggleShowActive}>Show Active</LitSwitch>
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
      <Dialog
        open={resetAllViews}
        onClose={() => {setResetAllViews(false)}}
        aria-labelledby="reset-view-dialog"
        aria-describedby='reset-view-description'
      >
        <DialogTitle id="reset-view-dialog-title">
          {"Reset ALL View Columns?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-view-dialog-contents" color='textPrimary'>
            Making this view inactive will reset all columns and remove any configuration done to ALL the views. Do you wish to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeactivateAll}>Yes</Button>
          <Button onClick={() => {setResetAllViews(false)}}>No</Button>
        </DialogActions>
      </Dialog>
    </TabViewsContainer>
  );
};
export default TabViews;
