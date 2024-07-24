/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Card } from '@mui/material';
import styled from 'styled-components';
import { getTheme } from '../../store/styles/action';

export const NsfCardContainer = styled(Card)<{
  theme: string;
  state: { open: boolean; apiName: string };
}>`
  width: 456px;
  height: 456px;
  min-width: 295px;
  margin: 0 20px 20px 0px;
  padding: 30;
  border-radius: 20px !important;
  border: 1px solid #C5C5C5;
  position: relative;
  display: flex;

  .MuiCardContent-root {
    padding: 10px 16px;
    width: calc( 100% - 30px);
  }

  .config {
    display: none;
  }

  @media only screen and (max-width: 1366px) {
    width: 250px !important;
  }

  user-select: none;

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
    padding-left: 8px;
    font-size: 16px;
    width: calc(100% - 4px - 10%);
    overflow-x: hidden;
    text-overflow: ellipsis;
    line-height: 1.1em;

    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }

  .scope {
    padding: 0;
    width: 100%;
  }

  .api-list {
    height: calc(75% - 16px - 25px);
    background-color: #FAFDFF;
    border-radius: 10px;
    border: 1px solid #D1D1D1;
    padding: 0 16px;
    overflow-y: scroll;
    &:hover::-webkit-scrollbar-thumb {
      background-color: grey;
    }
  }
`;

export const SchemaCardHeader = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 44px;

  .file-name {
    flex: 1;
    font-weight: 600 !important;
    font-size: 18px;
    margin-left: 10px;
    overflow-x: hidden;
    text-overflow: ellipsis;

    @media only screen and (max-width: 1366px) {
      font-size: 18px;
    }
  }
`;

export const SchemaDBImage = styled.img`
  height: 44px !important;
`;

export const SchemaIconStatus = styled.div<{ isActive: string }>`
  width: 10px;
  height: 10px;
  position: absolute;
  right: 20px;
  top: 20px;
  background-image: ${(props) =>
    props.isActive
      ? `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgMEgxOFYxOEw3Ljg1MTA2IDcuNzVMMCAwWiIgZmlsbD0iIzAyNjUwMSIvPgo8L3N2Zz4K')`
      : `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgMEgxOFYxOEw3Ljg1MTA2IDcuNzVMMCAwWiIgZmlsbD0iI0U1MzkzNSIvPgo8L3N2Zz4K")`};
  background-position: top right;
  background-repeat: no-repeat;
  background-size: contain;
`;
