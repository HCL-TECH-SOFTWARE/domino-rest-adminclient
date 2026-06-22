/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';

const ColumnBarContainer = styled.div`
  box-sizing: border-box;

  position: absolute;
  width: 316px;
  height: 901px;
  margin: 38px;
  
  background: light-dark(#FFFFFF, #252535);
  
  border: 1px solid light-dark(#A5AFBE, #3a3a4a);
  border-radius: 10px;
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
    font-size: 14px;
    line-height: 17px;

    color: light-dark(#636363, #999);
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
  viewName,
  dbName,
  nsfPathDecode,
  scopes,
  columns,
  chooseColumn
}) => {
  return (
    <div>
        <ColumnBarContainer>
            <AllColumnsList>
              {columns.map((column: any, index: any) => (
                  <div className="listitem" onClick={chooseColumn(column)}>
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
