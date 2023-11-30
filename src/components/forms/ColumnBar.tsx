/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import styled from 'styled-components';

const ColumnBarContainer = styled.div`
  box-sizing: border-box;

  position: absolute;
  width: 316px;
  height: 901px;
  margin: 38px;
  
  background: #FFFFFF;
  
  border: 1px solid #A5AFBE;
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

    color: #636363;
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
                    <Typography display="block" className="columnName">{column.name}</Typography>
                    <Typography display="block" className="columnDetails">{`Column Position ${column.position}`}</Typography>
                    {column.title.length > 0 && <Typography display="block" className="columnDetails">{`Title: ${column.title}`}</Typography>}
                  </div>
              ))}
            </AllColumnsList>
        </ColumnBarContainer>
    </div>
  );
}

export default ColumnBar;
