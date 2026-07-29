/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import ActivateSwitch from './ActivateSwitch';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { KeepDataTable, KeepTooltip } from '../keep-elements/KeepElements';

const StatusHeader = styled.div`
  cursor: default;

  .tooltip {
    background: #ffffff;
    text-color: #000000;
  }

  & > div > div {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .status-icon {
    display: inline-block;
    vertical-align: middle;
  }
`

const AgentNameHeader = styled.div`
  margin-left: 20px;
`

const AgentNameDisplay = styled.div`
  text-transform: none;
  margin-left: 20px;
`

/** `width` is valid on <th> but absent from React's ThHTMLAttributes, which types it only on <td>. */
const colWidth = (width: string) => ({ width });

interface AgentsTableProps {
  agents: Array<{
    agentActive: boolean;
    agentAlias: Array<string>;
    agentName: string;
    agentUnid: string;
  }>;
  toggleActive: (agent?: any) => Promise<void>;
  toggleInactive: (agent?: any) => Promise<void>;
}

const AgentsTable: React.FC<AgentsTableProps> = ({ agents, toggleActive, toggleInactive }) => {
  return (
    <KeepDataTable zebra>
      <table className="p-30" aria-label="views and agents table">
        <thead>
          <tr>
            <th {...colWidth('550px')}><AgentNameHeader>Agent Name</AgentNameHeader></th>
            <th>
              <StatusHeader>
                <div>
                  <KeepTooltip content={`Activate the Agents that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </KeepTooltip>
                </div>
              </StatusHeader>
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.agentName}>
              <td width="550px">
                <AgentNameDisplay>
                    {agent.agentName}
                </AgentNameDisplay>
              </td>
              <td><ActivateSwitch view={agent} toggleActive={toggleActive} toggleInactive={toggleInactive} type={'agent'}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </KeepDataTable>
  );
};

export default AgentsTable;