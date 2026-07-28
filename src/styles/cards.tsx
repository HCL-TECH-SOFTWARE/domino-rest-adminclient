/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';
import Card from '@mui/material/Card';

export const CardContainer = styled(Card)<{}>`
  width: 18%;
  min-width: 250px;
  height: 185px;
  padding: 4px 16px;
  margin: 10px 15px 15px 0px;
  border-radius: var(--wa-border-radius-l) !important;
  position: relative;

  .generating {
    font-size: var(--wa-font-size-m);
  }

  .actions {
    visibility: hidden;

    .generate {
      margin-right: 2px;
    }
  }

  .appName {
    flex: 1;
    font-size: 16px;
    font-weight: 500;
    overflow-x: hidden;
    text-overflow: ellipsis;
    max-height: 30px;
    white-space: nowrap;
  }

  .appDescription {
    flex: 1;
    font-size: var(--wa-font-size-s);
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media only screen and (max-width: 1366px) {
    width: 250px !important;
  }
  
  .footer-actions {
    min-height: 26px;
  }

  &:hover {
    .actions {
      visibility: visible;
    }

    .footer-actions {
      visibility: visible;
    }
    user-select: none;
    cursor: pointer;
  }

  &:focus {
    .actions {
      visibility: visible;
    }

    .footer-actions {
      visibility: visible;
    }
    user-select: none;
  }

  &:hover {
    .more {
      visibility: visible;
    }
  }

  &:focus {
  .more {
      visibility: visible;
    }
  }  
`;

interface ContainerProps {
  $active: boolean;
}

export const Container = styled(Card)<ContainerProps>`
  width: 30%;
  height: 120px;
  margin: 0 15px 15px 0px;
  border-radius: var(--wa-border-radius-l) !important;
  box-shadow: 2px 2px 5px
    ${(props) => (props.$active ? '#1966b3' : 'lightgray')};
  color: ${(props) => (props.$active ? '#1966b3' : '#383838')};
  background: var(--wa-color-surface-raised) !important;
  cursor: pointer;
  user-select: none;

  &:hover {
    border: 1px solid var(--wa-color-brand-50);
  }
`;

export const ModeLogo = styled.div`
  margin: 0;
  padding: 0;
  
  svg {
    height: 44px;
    width: 44px;
    border-radius: 50%;
  }
`;

export const SchemaIconStatus = styled.div`
  width: 10px;
  height: 10px;
  background-position: top right;
  background-repeat: no-repeat;
  background-size: contain;
`;

export const InUseSymbol = `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiM4MkRDNzMiLz4KPC9zdmc+Cg==')`

export const NotInUseSymbol = `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiNENjQ2NkYiLz4KPC9zdmc+Cg==")`
