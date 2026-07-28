/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import { AppState } from '../../store';
import { styled } from '@linaria/react';
import { handleDatabaseAgents } from '../../store/databases/action';
import AgentSearch from './AgentSearch';
import { TopNavigator } from '../../styles/CommonStyles';
import AgentsTable from './AgentsTable';
import { RxDividerVertical } from 'react-icons/rx';
import { Database } from '../../store/databases/types';
import { KeepButton, KeepSwitch } from '../keep-elements/KeepElements';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { useAppDispatch } from '../../store/hooks';

/**
 * Database Agents Component
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 */

 const ButtonsPanel = styled.div`
  height: 60px;
  margin: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-content: center;
 
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
  const { dbName } = useParams() as { dbName: string, nsfPath: string };
  const dispatch = useAppDispatch();
  const [searchKey, setSearchKey] = useState('');
  const [resetAllAgents, setResetAllAgents] = useState(false);
  const [lists, setLists] = useState(agents)
  const [showActive, setShowActive] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    if (showActive) {
      setLists(activeAgents)
    } else {
      setLists(agents)
    }
  }, [showActive, agents, activeAgents])

  const handleToggleShowActive = useCallback(() => {
      setShowActive(!showActive)
    }, [showActive]);

  const toggleActive = async (agent: any) => {
    dispatch(handleDatabaseAgents([agent], activeAgents, dbName, schemaData, true, agents));
  }

  const toggleInactive = async (agent: any) => {
    dispatch(handleDatabaseAgents([agent], activeAgents, dbName, schemaData, false, agents));
  }

  const handleActivateAll = () => {
    dispatch(handleDatabaseAgents(agents, activeAgents, dbName, schemaData, true, agents));
  }

  const handleDeactivateAll = () => {
    dispatch(handleDatabaseAgents(agents, activeAgents, dbName, schemaData, false, agents));
    setResetAllAgents(false);
  }

  useEffect(() => {
    if (resetAllAgents) {
      ref.current?.showModal()
    } else {
      if (ref.current?.close) {
        ref.current?.close()
      }
    }
  }, [resetAllAgents])

  return (
    <>
      <TopNavigator>
        <AgentSearch handleSearchAgent={handleSearchAgent} />
      </TopNavigator>
      <ButtonsPanel>
        <Box>
          <Button
            disabled={lists.length === 0 || loading}
            onClick={handleActivateAll}
            className={`activate ${lists.length === 0 || loading ? 'disabled' : ''}`}
          >
            Activate All
          </Button>
          <RxDividerVertical size={"1.4em"} className="vertical"/>
          <Button
            disabled={lists.length === 0 || loading}
            onClick={() => setResetAllAgents(true)}
            className={`deactivate ${lists.length === 0 || loading ? 'disabled' : ''}`}
          >
            Deactivate All
          </Button>
        </Box>
        <KeepSwitch onToggle={handleToggleShowActive}>Show Active</KeepSwitch>
      </ButtonsPanel>
      <div className="flex-container">
        <AgentsTable 
          agents={
            searchKey === ''
              ? lists
                .slice()
                .sort((a, b) => (a.agentName > b.agentName ? 1 : -1))
                  : filtered
          }
          toggleActive={toggleActive}
          toggleInactive={toggleInactive}
        />
      </div>
      <dialog ref={ref} className='dialog'>
        <FormDialogHeader
          title='Reset ALL Agents?'
          onClose={() => {setResetAllAgents(false)}}
        />
        <div className='dialog-content'>
          <text id="reset-view-dialog-contents" className='dialog-content-text'>
            Deactivate all database agents?
          </text>
        </div>
        <div className='dialog-actions'>
          <KeepButton variant="neutral" appearance="outlined"
            onClick={() => {setResetAllAgents(false)}}
          >No</KeepButton>
          <KeepButton onClick={handleDeactivateAll}>Yes</KeepButton>
        </div>
      </dialog>
    </>
  );
};
export default TabAgents;
