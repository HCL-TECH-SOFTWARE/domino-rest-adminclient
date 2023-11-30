/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import CardContent from '@material-ui/core/CardContent';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store';
import {
  UPDATE_VIEW,
  ADD_ACTIVEVIEW,
  DELETE_ACTIVEVIEW,
  ViewObj,
} from '../../store/databases/types';
import { Content, Alias, Container } from '../../styles/CommonStyles';
import styled from 'styled-components';
interface ViewCardProps {
  panelName: string;
  dbName: string;
  name: string;
  alias: string;
  unid: string;
  active: boolean;
}

const CardItem = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * ViewCard displays a single View card
 *
 * @author Neil Schultz
 *
 */
const ViewCard: React.FC<ViewCardProps> = ({
  panelName,
  dbName,
  name,
  alias,
  unid,
  active,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const dispatch = useDispatch();

  /**
   * A click on an inactive View will activate it, and a click on an active
   * View will deactivate it.
   */
  const toggleView = (panelName: string) => {
    // Add Active View
    if (panelName === 'views') {
      // Build redux data
      const viewData: ViewObj = {
        viewName: name,
        viewAlias: alias,
        viewUnid: unid,
        viewActive: true,
      };

      // Update All Panel
      dispatch({
        type: UPDATE_VIEW,
        payload: {
          db: dbName,
          view: viewData,
        },
      });

      // Update Active Panel
      dispatch({
        type: ADD_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData,
        },
      });
    }

    // Delete Active View
    else {
      // Build redux data
      const viewData: ViewObj = {
        viewName: name,
        viewAlias: alias,
        viewUnid: unid,
        viewActive: false,
      };

      // Update All Panel
      dispatch({
        type: UPDATE_VIEW,
        payload: {
          db: dbName,
          view: viewData,
        },
      });

      // Update Active Panel
      dispatch({
        type: DELETE_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: unid,
        },
      });
    }
  };

  // Return a View card
  return (
    <Container
      onClick={() => toggleView(panelName)}
      theme={themeMode}
      $active={active}
      variant="outlined"
    >
      <CardContent style={{ padding: 10 }}>
        <Content>
          <Tooltip title={name}>
            <CardItem className='view-name'>{name}</CardItem>
          </Tooltip>
          <Tooltip title={alias}>
            <Alias>
              Alias:
              {alias}
            </Alias>
          </Tooltip>
        </Content>
      </CardContent>
    </Container>
  );
};

export default ViewCard;
