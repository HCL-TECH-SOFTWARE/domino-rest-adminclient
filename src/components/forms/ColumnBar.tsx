/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';

const ColumnBarContainer = styled.div`
  box-sizing: border-box;

  position: absolute;
  width: 316px;
  height: 901px;
  margin: 38px;
  
  background: var(--wa-color-surface-raised);
  
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-l);
`

const AllColumnsList = styled.div`
  .listitem {
    margin: 20px;
  }

  .columnName {
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    line-height: 19px;
  }

  .columnDetails {
    margin-top: 5px;
    white-space: pre-wrap;

    font-weight: 400;
    font-size: var(--wa-font-size-m);
    line-height: 17px;

    color: var(--wa-color-text-quiet);
  }
`

interface ColumnBarProps {
  viewName: string;
  dbName: string;
  nsfPathDecode: string;
  scopes: any[];
  columns: any[];
  chooseColumn: any
}

const ColumnBar: React.FC<ColumnBarProps> = ({
  columns,
  chooseColumn
}) => {
  return (
    <div>
        <ColumnBarContainer>
            <AllColumnsList>
              {columns.map((column: any) => (
                  <div key={column.name} className="listitem" onClick={chooseColumn(column)}>
                    <span className="block columnName">{column.name}</span>
                    <span className="block columnDetails">{`Column Position ${column.position}`}</span>
                    {column.title.length > 0 && <span className="block columnDetails">{`Title: ${column.title}`}</span>}
                  </div>
              ))}
            </AllColumnsList>
        </ColumnBarContainer>
    </div>
  );
}

export default ColumnBar;
