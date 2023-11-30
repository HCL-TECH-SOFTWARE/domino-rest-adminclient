/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import styled from 'styled-components';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ActivateSwitch from './ActivateSwitch';
import { Tooltip } from '@material-ui/core';
import { AiOutlineQuestionCircle } from 'react-icons/ai';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  paddingLeft: "30px",
  paddingRight: "30px",
  [`&.${tableCellClasses.head}`]: {
    fontWeight: "bold",
    paddingTop: "30px",
    borderBottom: "1px solid #b8b8b8",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    paddingTop: "20px",
    paddingBottom: "20px",
    borderBottom: 'none',
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: "#F8FBFF",
    borderBottom: "none"
  },
  // hide last border
  "&:last-child th, &:last-child td": {
    borderBottom: 0,
  },
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: "10px",
  boxSizing: 'border-box',
  border: '1px solid #B9B9B9',
  background: '#FFFFFF',
}));

const StatusHeader = styled.div`
  cursor: default;

  .tooltip {
    background: #ffffff;
    text-color: #000000;
  }

  .status-icon {
    transform: translateY(10%);
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
  agents: Array<any>;
  toggleActive: any;
  toggleInactive: any;
}

const AgentsTable: React.FC<AgentsTableProps> = ({ agents, toggleActive, toggleInactive }) => {
  return (
    <StyledTableContainer>
      <Table sx={{ padding: "30px" }} aria-label="views and agents table">
        <TableHead>
          <TableRow>
            <StyledTableCell width="550px"><AgentNameHeader>Agent Name</AgentNameHeader></StyledTableCell>
            <StyledTableCell>
              <StatusHeader>
                <div>
                  <Tooltip title={`Activate the Agents that should be accessible\nvia rest API`}>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </Tooltip>
                </div>
              </StatusHeader>
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {agents.map((agent) => (
            <StyledTableRow key={agent.viewName}>
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