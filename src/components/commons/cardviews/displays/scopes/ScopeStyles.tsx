/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Card } from '@mui/material';
import { styled } from '@linaria/react';

export const SchemaCardContainer = styled(Card)<{
  state: { selected: string; open: boolean; apiName: string };
}>`
  width: 18%;
  min-width: 250px;
  height: 200px;
  margin: 0 20px 20px 0px;
  border-radius: var(--wa-border-radius-l) !important;
  position: relative;
  display: flex;
  background: var(--wa-color-surface-raised) !important;

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

  pointer-events: ${(props) => (props.state.open ? 'none' : 'auto')};
  opacity: ${(props) => (props.state.open ? (props.state.apiName === props.state.selected ? 1 : 0.2) : 1)};

  user-select: none;
  cursor: pointer;

  &:hover {
    border: 1px solid var(--hover-color);

    .more {
      visibility: visible;
    }

    .config {
      display: block;
    }
  }

  .description {
    margin-top: 1px;
    font-size: var(--wa-font-size-m);
    text-overflow: ellipsis;
    overflow-x: hidden;
    max-height: 65px;
    width: calc(100% - 10px);
    max-width: 100%;
  }

  .api-list {
    margin-top: 5px;
    &:hover::-webkit-scrollbar-thumb {
      background-color: grey;
    }
  }
`;

export const ScopeCardHeader = styled.div`
  display: flex;

  .file-name {
    flex: 1;
    font-weight: 400 !important;
    font-size: 16px;
    margin-left: 10px;

    @media only screen and (max-width: 1366px) {
      font-size: var(--wa-font-size-m);
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
