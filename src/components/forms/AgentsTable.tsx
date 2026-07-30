/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { KeepActivateSwitch, KeepDataTable, KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

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
                    <div>Status <KeepIcon name='circle-question' /></div>
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
              <td>
                <KeepActivateSwitch
                  view={agent}
                  type="agent"
                  onToggleActive={(event) => { void toggleActive(event.detail.view); }}
                  onToggleInactive={(event) => { void toggleInactive(event.detail.view); }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </KeepDataTable>
  );
};

export default AgentsTable;