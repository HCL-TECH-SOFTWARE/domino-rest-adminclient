/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import Button from '@mui/material/Button';
import { AppState } from '../../store';
import styled from 'styled-components';
import { handleDatabaseAgents } from '../../store/databases/action';
import AgentSearch from './AgentSearch';
import { TopNavigator } from '../../styles/CommonStyles';
import AgentsTable from './AgentsTable';
import { RxDividerVertical } from 'react-icons/rx';
import { Database } from '../../store/databases/types';

/**
 * Database Agents Component
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 */

 const ButtonsPanel = styled.div`
 height: 60px;
 margin: auto;
 
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

interface TabAgentsProps {
  schemaData: Database;
}

const TabAgents: React.FC<TabAgentsProps> = ({ schemaData }) => {
  const { agents } = useSelector((state: AppState) => state.databases);
  const { activeAgents } = useSelector((state: AppState) => state.databases);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const [filtered, setFiltered] = useState([...agents]);
  const { dbName, nsfPath } = useParams() as { dbName: string, nsfPath: string };
  const dispatch = useDispatch();
  const [searchKey, setSearchKey] = useState('');
  const [resetAllAgents, setResetAllAgents] = useState(false);

  const handleSearchAgent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSearchKey(key);

    const filteredAgents = agents.filter((data) => {
      return (
        data.agentName &&
        data.agentName.toLowerCase().indexOf(key.toLowerCase()) !== -1
      );
    });
    setFiltered(filteredAgents);
  };

  const toggleActive = async (agent: any) => {
    dispatch(handleDatabaseAgents([agent], activeAgents, dbName, schemaData, true) as any);
  }

  const toggleInactive = async (agent: any) => {
    dispatch(handleDatabaseAgents([agent], activeAgents, dbName, schemaData, false) as any);
  }

  const handleActivateAll = () => {
    dispatch(handleDatabaseAgents(agents, activeAgents, dbName, schemaData, true) as any);
  }

  const handleDeactivateAll = () => {
    dispatch(handleDatabaseAgents(agents, activeAgents, dbName, schemaData, false) as any);
    setResetAllAgents(false);
  }

  return (
    <>
      <TopNavigator>
        <AgentSearch handleSearchAgent={handleSearchAgent} />
      </TopNavigator>
      <ButtonsPanel>
        <Button disabled={agents.length === 0 || loading} onClick={handleActivateAll} className={`activate ${agents.length === 0 || loading ? 'disabled' : ''}`}>Activate All</Button>
        <RxDividerVertical size={"1.4em"} className="vertical"/>
        <Button disabled={agents.length === 0 || loading} onClick={() => setResetAllAgents(true)} className={`deactivate ${agents.length === 0 || loading ? 'disabled' : ''}`}>Deactivate All</Button>
      </ButtonsPanel>
      <div className="flex-container">
        <AgentsTable 
          agents={
            searchKey === ''
              ? agents
                .slice()
                .sort((a, b) => (a.agentName > b.agentName ? 1 : -1))
                  : filtered
          }
          toggleActive={toggleActive}
          toggleInactive={toggleInactive}
        />
      </div>
      <Dialog
        open={resetAllAgents}
        onClose={() => {setResetAllAgents(false)}}
        aria-labelledby="reset-view-dialog"
        aria-describedby='reset-view-description'
        sx={{ overflowY: 'auto' }}
      >
        <DialogTitle id="reset-view-dialog-title">
          {"Reset ALL Agents?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-view-dialog-contents" color='textPrimary'>
            Deactivate all database agents?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeactivateAll}>Yes</Button>
          <Button onClick={() => {setResetAllAgents(false)}}>No</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default TabAgents;
