/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ActivateSwitch from './ActivateSwitch';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { useDispatch } from 'react-redux';
import { toggleAlert } from '../../store/alerts/action';
import { FiEdit2 } from 'react-icons/fi';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { FaRegFolderOpen } from "react-icons/fa";
import { KeepTooltip } from '../keep-elements/KeepElements';

const StyledTableCell = styled(TableCell)`
  padding-left: 30px;
  padding-right: 30px;
`

const StyledTableHead = styled(TableHead)`
  font-weight: bold;
  padding-top: 30px;
  border-bottom: 1px solid var(--wa-color-surface-border);
`

const StyledTableBody = styled(TableBody)`
  font-size: var(--wa-font-size-m);
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: none;
`

const StyledTableRow = styled(TableRow)`
  &:nth-of-type(odd) {
    background-color: var(--keep-surface-accent);
    border-bottom: none;
  }

  // hide last border
  &:last-child th, &:last-child td {
    border-bottom: 0;
  }
`

const StyledTableContainer = styled(TableContainer)`
  border-radius: var(--wa-border-radius-l);
  box-sizing: border-box;
  border: 1px solid var(--wa-color-surface-border);
  background: var(--wa-color-surface-raised);
`

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

const ViewsTable: React.FC<ViewsTableProps> = ({ views, toggleActive, toggleInactive, setViewOpen, setOpenViewName }) => {
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
      <Table className='p-30' aria-label="views and agents table">
        <StyledTableHead>
          <TableRow>
            <StyledTableCell width="50px" />
            <StyledTableCell width="550px">View Name</StyledTableCell>
            <StyledTableCell width="500px">Alias</StyledTableCell>
            <StyledTableCell>
              <StatusHeader>
                <div>
                  <KeepTooltip content={`Activate the Views that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </KeepTooltip>
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
                    <KeepTooltip content={`${view.viewName} is a folder.`}>
                      <span>
                        <FaRegFolderOpen size='1.2em' />
                      </span>
                    </KeepTooltip>
                  }
                  {
                  view.viewUpdated && view.viewActive ?
                  <span>
                    <b>{view.viewName}</b>
                    {' '}
                    <KeepTooltip content={`A change was made in this view.`} placement='bottom'>
                      <span>
                        <AiOutlineQuestionCircle className='views-table-question-circle' />
                      </span>
                    </KeepTooltip>
                  </span> 
                    :
                    <span>{view.viewName}</span>  
                    
                  }
                  </ViewNameDisplay>
              </StyledTableCell>
              <StyledTableCell width="500px">
                <AliasContainer>
                  {(view.viewAlias.length > 0) && <KeepTooltip
                    content={Array.isArray(view.viewAlias) ? view.viewAlias.join('\n') : view.viewAlias}
                    placement='bottom'
                    without-arrow
                  >
                    <div>{view.viewAlias[0]}</div>
                  </KeepTooltip>}
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