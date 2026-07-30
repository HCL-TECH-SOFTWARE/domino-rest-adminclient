/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from '../../router/react';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import { AppState } from '../../store';
import { styled } from '@linaria/react';
import { handleDatabaseAgents } from '../../store/databases/action';
import { TopNavigator } from '../../styles/CommonStyles';
import AgentsTable from './AgentsTable';
import { Database } from '../../store/databases/types';
import { KeepButton, KeepFormDialogHeader, KeepSearchInput, KeepSwitch } from '../keep-elements/KeepElements';
import type { KeepSearchChangeDetail } from '../keep-elements/keep-search-input';
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

interface TabAgentsProps {
  schemaData: Database;
}

const TabAgents: React.FC<TabAgentsProps> = ({ schemaData }) => {
  // `scopePull` used to be selected a second time inside AgentSearch; it gates pointer input
  // on the filter box while the list is still being pulled, and this component already
  // holds the slice it comes from.
  const { agents, scopePull } = useSelector((state: AppState) => state.databases);
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

  const handleSearchAgent = (e: CustomEvent<KeepSearchChangeDetail>) => {
    const key = e.detail.value;
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
        {/* No `value` — the element is deliberately uncontrolled; see KeepSearchInput. */}
        <KeepSearchInput
          placeholder="Search Agents"
          disabled={!scopePull}
          onSearch={handleSearchAgent}
        />
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
          <div className='short-vertical' />
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
        <KeepFormDialogHeader
          heading='Reset ALL Agents?'
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
