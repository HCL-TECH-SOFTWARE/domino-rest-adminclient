/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ActivateSwitch from './ActivateSwitch';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { LitTooltip } from '../lit-elements/LitElements';

const StyledTableCell = styled(TableCell)`
  padding-left: 30px;
  padding-right: 30px;

  &.${tableCellClasses.head} {
    font-weight: bold;
    padding-top: 30px;
    border-bottom: 1px solid light-dark(#b8b8b8, #3a3a4a);
  }

  &.${tableCellClasses.body} {
    font-size: 14px;
    padding-top: 20px;
    padding-bottom: 20px;
    border-bottom: none;
  }
`

const StyledTableRow = styled(TableRow)`
  &:nth-of-type(odd) {
    background-color: light-dark(#F8FBFF, #1e1e2e);
    border-bottom: none;
  }

  &:last-child th, &:last-child td {
    border-bottom: 0;
  }
`

const StyledTableContainer = styled(TableContainer)`
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid light-dark(#B9B9B9, #3a3a4a);
  background: light-dark(#FFFFFF, #252535);
`;

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
    <StyledTableContainer>
      <Table className='p-30' aria-label="views and agents table">
        <TableHead>
          <TableRow>
            <StyledTableCell width="550px"><AgentNameHeader>Agent Name</AgentNameHeader></StyledTableCell>
            <StyledTableCell>
              <StatusHeader>
                <div>
                  <LitTooltip content={`Activate the Agents that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </LitTooltip>
                </div>
              </StatusHeader>
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {agents.map((agent) => (
            <StyledTableRow key={agent.agentName}>
              <StyledTableCell width="550px">
                <AgentNameDisplay>
                    {agent.agentName}
                </AgentNameDisplay>
              </StyledTableCell>
              <StyledTableCell><ActivateSwitch view={agent} toggleActive={toggleActive} toggleInactive={toggleInactive} type={'agent'}/></StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};

export default AgentsTable;