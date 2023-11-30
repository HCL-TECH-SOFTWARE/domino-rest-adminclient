/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Card } from '@material-ui/core';
import styled, { css } from 'styled-components';
import { getTheme } from '../../../../../store/styles/action';

export const SchemaCardContainer = styled(Card)<{
  theme: string;
  state: { selected: string; open: boolean; apiName: string };
}>`
  width: 18%;
  height: 200px;
  min-width: 295px;
  margin: 0 20px 20px 0px;
  border-radius: 10px !important;
  position: relative;
  display: flex;

  .MuiCardContent-root {
    padding: 10px 16px;
    width: 100%;
  }

  .config {
    display: none;
  }

  @media only screen and (max-width: 1366px) {
    width: 250px !important;
  }

  ${(props) =>
    props.state.open &&
    css`
      pointer-events: none;
      opacity: ${props.state.apiName === props.state.selected ? 1 : 0.2};
    `};

  user-select: none;
  cursor: pointer;

  &:hover {
    border: 1px solid ${(props) => getTheme(props.theme).hoverColor};

    .more {
      visibility: visible;
    }

    .config {
      display: block;
    }
  }

  .description {
    margin-top: 1px;
    font-size: 14px;
    text-overflow: ellipsis;
    overflow-x: hidden;
    max-height: 65px;
    width: calc( 100% - 10px);
    max-width: 100%;
  }

  .api-list {
    margin-top: 5px;
    &:hover::-webkit-scrollbar-thumb {
      background-color: grey;
    }
  }
`;

export const SchemaCardHeader = styled.div`
  display: flex;

  .file-name {
    flex: 1;
    font-weight: 400 !important;
    font-size: 16px;
    margin-left: 10px;

    @media only screen and (max-width: 1366px) {
      font-size: 14px;
    }
  }
`;

export const SchemaDBImage = styled.img`
  background: #383838;
  border-radius: 8px;
  padding: 10px;
  height: 55px !important;
`;

export const SchemasMainContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StackHeader = styled.div`
  display: flex;
  align-items: center;

  .active-counts {
    margin: 5px 0;
  }
`;


