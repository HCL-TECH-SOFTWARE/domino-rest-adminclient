/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import { AppState } from '../../store';
import ViewSearch from './ViewSearch';
import { getDatabaseIndex } from '../../store/databases/scripts';
import { handleDatabaseViews } from '../../store/databases/action';
import styled from 'styled-components';
import { TopNavigator } from '../../styles/CommonStyles';
import ViewsTable from './ViewsTable';
import { RxDividerVertical } from 'react-icons/rx';

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
}

const TabViews : React.FC<TabViewsProps> = (viewState) => {
  const { views } = useSelector((state: AppState) => state.databases);
  const { databases } = useSelector((state: AppState) => state.databases);
  const [filtered, setFiltered] = useState([...views]);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  const [searchKey, setSearchKey] = useState('');
  const [resetAllViews, setResetAllViews] = useState(false);

  let { dbName, nsfPath } = useParams() as { dbName: string, nsfPath: string };
  dbName = decodeURIComponent(dbName);
  nsfPath = decodeURIComponent(nsfPath);
  let activeViews = databases[getDatabaseIndex(databases, dbName, nsfPath)]['views']?.map((view: any) => {
    return {
      viewActive: true,
      viewAlias: view.alias,
      viewName: view.name,
      viewUnid: view.unid,
      viewUpdated: view.viewUpdated,
      viewColumns: view.columns
    }
  });

  const handleSearchView = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSearchKey(key);

    const filteredViews = views.filter((data) => {
      return (
        data.viewName &&
        data.viewName.toLowerCase().indexOf(key.toLowerCase()) !== -1
      );
    });
    setFiltered(filteredViews);
  };

  const toggleActive = async (view: any) => {
    const currentSchema = databases[getDatabaseIndex(databases, dbName, nsfPath)];
    dispatch(handleDatabaseViews([view], activeViews, dbName, currentSchema, true) as any);
  }

  const toggleInactive = async (view: any) => {
    const currentSchema = databases[getDatabaseIndex(databases, dbName, nsfPath)];
    dispatch(handleDatabaseViews([view], activeViews, dbName, currentSchema, false) as any);
  }

  const handleActivateAll = () => {
    const currentSchema = databases[getDatabaseIndex(databases, dbName, nsfPath)];
    dispatch(handleDatabaseViews(views, activeViews, dbName, currentSchema, true) as any);
  }

  const handleDeactivateAll = () => {
    const currentSchema = databases[getDatabaseIndex(databases, dbName, nsfPath)];
    dispatch(handleDatabaseViews(views, activeViews, dbName, currentSchema, false) as any);
    setResetAllViews(false);
  }

  return (
    <TabViewsContainer>
      <TopNavigator>
        <ViewSearch handleSearchView={handleSearchView} />
      </TopNavigator>

      <ButtonsPanel>
        <Button disabled={views.length === 0 || loading} onClick={handleActivateAll} className={`activate ${views.length === 0 || loading ? 'disabled' : ''}`}>Activate All</Button>
        <RxDividerVertical size={"1.4em"} className="vertical"/>
        <Button disabled={views.length === 0 || loading} onClick={() => setResetAllViews(true)} className={`deactivate ${views.length === 0 || loading ? 'disabled' : ''}`}>Deactivate All</Button>
      </ButtonsPanel>
      <ViewPanel>
        <ViewsTable
          views = {
            searchKey === ''
              ? views
                  .slice()
                  .sort((a, b) => (a.viewName > b.viewName ? 1 : -1))
              : filtered
          }
          toggleActive={toggleActive}
          toggleInactive={toggleInactive}
          dbName={dbName}
          nsfPath={nsfPath}
          setViewOpen={viewState.setViewOpen}
          setOpenViewName={viewState.setOpenViewName}
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
