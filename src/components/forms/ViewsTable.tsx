/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import ActivateSwitch from './ActivateSwitch';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { FiEdit2 } from 'react-icons/fi';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { FaRegFolderOpen } from "react-icons/fa";
import { KeepDataTable, KeepTooltip } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

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

/** `width` is valid on <th> but absent from React's ThHTMLAttributes, which types it only on <td>. */
const colWidth = (width: string) => ({ width });

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
  const dispatch = useAppDispatch();

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
    <KeepDataTable zebra>
      <table className='p-30' aria-label="views and agents table">
        <thead>
          <tr>
            <th {...colWidth('50px')}>{null}</th>
            <th {...colWidth('550px')}>View Name</th>
            <th {...colWidth('500px')}>Alias</th>
            <th>
              <StatusHeader>
                <div>
                  <KeepTooltip content={`Activate the Views that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                    <div>Status <AiOutlineQuestionCircle className='status-icon' /></div>
                  </KeepTooltip>
                </div>
              </StatusHeader>
            </th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr key={view.viewName}>
              <th scope="row" {...colWidth('50px')}>
                <EditIcon onClick={() => {handleClickViewName(view.viewName, view.viewActive)}}>
                  <Button title={view.viewName} disabled={loading}><FiEdit2 size='1.5em' /></Button>
                </EditIcon>
              </th>
              <td {...colWidth('550px')}>
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
              </td>
              <td {...colWidth('500px')}>
                <AliasContainer>
                  {(view.viewAlias.length > 0) && <KeepTooltip
                    content={Array.isArray(view.viewAlias) ? view.viewAlias.join('\n') : view.viewAlias}
                    placement='bottom'
                    without-arrow
                  >
                    <div>{view.viewAlias[0]}</div>
                  </KeepTooltip>}
                </AliasContainer>
              </td>
              <td><ActivateSwitch view={view} toggleActive={toggleActive} toggleInactive={toggleInactive} type={'view'}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </KeepDataTable>
  );
};

export default ViewsTable;
