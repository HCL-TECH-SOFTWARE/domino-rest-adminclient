/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleAlert } from '../../store/alerts/action';
import { KeepActivateSwitch, KeepDataTable, KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
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
`

const EditIcon = styled.div`
  cursor: pointer;

  /* Was FiEdit2 size='1.5em'. wa-icon takes its box from font-size, not width, so the
     same relative measure has to be spelled as a font-size here. */
  .edit-icon {
    font-size: 1.5em;
  }
`

const ViewNameDisplay = styled.div`
  text-transform: none;
  display: flex;
  align-items: center;
  gap: 10px;

  /* Was FaRegFolderOpen size='1.2em'. */
  .folder-icon {
    font-size: 1.2em;
  }
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
                    <div>Status <KeepIcon name='circle-question' /></div>
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
                  <Button title={view.viewName} disabled={loading}><KeepIcon name='pencil' className='edit-icon' /></Button>
                </EditIcon>
              </th>
              <td {...colWidth('550px')}>
                <ViewNameDisplay>
                  {folderNames.includes(view.viewName) &&
                    <KeepTooltip content={`${view.viewName} is a folder.`}>
                      <span>
                        <KeepIcon name='folder-open' className='folder-icon' />
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
                        <KeepIcon name='circle-question' className='views-table-question-circle' />
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
              <td>
                <KeepActivateSwitch
                  view={view}
                  type="view"
                  onToggleActive={(event) => { toggleActive(event.detail.view); }}
                  onToggleInactive={(event) => { toggleInactive(event.detail.view); }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </KeepDataTable>
  );
};

export default ViewsTable;
