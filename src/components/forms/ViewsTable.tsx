/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import styled from 'styled-components';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ActivateSwitch from './ActivateSwitch';
import { Button, Tooltip } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { useDispatch } from 'react-redux';
import { toggleAlert } from '../../store/alerts/action';
import { FiEdit2 } from 'react-icons/fi';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { FaRegFolderOpen } from "react-icons/fa";

const StyledTableCell = styled(TableCell)`
  padding-left: 30px;
  padding-right: 30px;
`

const StyledTableHead = styled(TableHead)`
  font-weight: bold;
  padding-top: 30px;
  border-bottom: 1px solid #B8B8B8;
`

const StyledTableBody = styled(TableBody)`
  font-size: 14px;
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: none;
`

const StyledTableRow = styled(TableRow)`
  &:nth-of-type(odd) {
    background-color: #F8FBFF;
    border-bottom: none;
  }

  // hide last border
  &:last-child th, &:last-child td {
    border-bottom: 0;
  }
`

const StyledTableContainer = styled(TableContainer)`
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid #B9B9B9;
  background: #FFF;
`

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

const EditIcon = styled.div`
  cursor: pointer;
`

const ViewNameDisplay = styled.div`
  text-transform: none;
  display: flex;
  align-items: center;
  gap: 10px;
`

const AliasContainer = styled.span`
    text-transform: none;
    cursor: default;
`

interface ViewsTableProps {
  views: Array<any>;
  toggleActive: any;
  toggleInactive: any;
  dbName: string;
  nsfPath: string;
  setViewOpen: any;
  setOpenViewName: any;
}

const ViewsTable: React.FC<ViewsTableProps> = ({ views, toggleActive, toggleInactive, dbName, nsfPath, setViewOpen, setOpenViewName }) => {
  const { loading } = useSelector((state: AppState) => state.dialog);
  const { folders } = useSelector((state: AppState) => state.databases);
  const folderNames = folders.map((folder) => {return folder.viewName});
  const dispatch = useDispatch();

  const handleClickViewName = (viewName: string, viewActive: boolean) => {
    if (!viewActive) {
      setViewOpen(false);
      dispatch(toggleAlert(`Please activate this view before editing it!`))
    } else {
      setOpenViewName(viewName);
      setViewOpen(true);
    }
  }
  
  return (
    <StyledTableContainer>
      <Table sx={{ padding: "30px" }} aria-label="views and agents table">
        <StyledTableHead>
          <TableRow>
            <StyledTableCell width="50px" />
            <StyledTableCell width="550px">View Name</StyledTableCell>
            <StyledTableCell width="500px">Alias</StyledTableCell>
            <StyledTableCell>
              <StatusHeader>
                <div>
                  <Tooltip title={`Activate the Views that should be accessible\nvia rest API`}>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </Tooltip>
                </div>
              </StatusHeader>
            </StyledTableCell>
          </TableRow>
        </StyledTableHead>
        <StyledTableBody>
          {views.map((view) => (
            <StyledTableRow key={view.viewName}>
              <StyledTableCell component="th" scope="row" width="50px">
                <EditIcon onClick={() => {handleClickViewName(view.viewName, view.viewActive)}}>
                  <Button title={view.viewName} disabled={loading}><FiEdit2 size='1.5em' /></Button>
                </EditIcon>
              </StyledTableCell>
              <StyledTableCell width="550px">
                <ViewNameDisplay>
                  {folderNames.includes(view.viewName) && 
                    <Tooltip title={`${view.viewName} is a folder.`} arrow>
                      <span>
                        <FaRegFolderOpen size='1.2em' />
                      </span>
                    </Tooltip>
                  }
                  {
                  view.viewUpdated && view.viewActive ?
                  <span>
                    <Tooltip title={`A change was made in this view.`} arrow>
                        <span>
                        <AiOutlineQuestionCircle color='#0F52BA' />
                        </span>
                    </Tooltip>
                    <b>{view.viewName}</b>
                  </span> 
                    :
                    <span>{view.viewName}</span>  
                    
                  }
                  </ViewNameDisplay>
              </StyledTableCell>
              <StyledTableCell width="500px">
                <AliasContainer>
                  {(view.viewAlias.length > 0) && <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>
                    {Array.isArray(view.viewAlias) ? view.viewAlias.join('\n') : view.viewAlias}</div>} placement='bottom-start'>
                      <div>{view.viewAlias[0]}</div>
                  </Tooltip>}
                </AliasContainer>
              </StyledTableCell>
              <StyledTableCell><ActivateSwitch view={view} toggleActive={toggleActive} toggleInactive={toggleInactive} type={'view'}/></StyledTableCell>
            </StyledTableRow>
          ))}
        </StyledTableBody>
      </Table>
    </StyledTableContainer>
  );
};

export default ViewsTable;