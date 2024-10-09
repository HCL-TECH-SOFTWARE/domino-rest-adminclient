/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import AddIcon from '@mui/icons-material/Add';
import styled from 'styled-components';
import { Button, Tooltip, Typography } from '@mui/material';
import { ItemContainer } from './styles';
import { AccessContext } from './AccessContext';
import { capitalizeFirst } from '../../utils/common';
import { InfoOutlined } from '@mui/icons-material';

const FieldInfo = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;

  &:hover {
    cursor: pointer;
  }

  .field-name {
    font-size: 14px;
  }

  .field-type {
    font-size: 12px;
    font-weight: 400;
    color: #636363;
  }
`;


const ButtonAdd = styled.button`
  border: 0;
  height: 20px;
  background: none;
  user-select: none;
`;

interface ItemProp {
  id: string;
  content: string;
}

interface SingleFieldContainerProps {
  item?: any;
  moveTo: (items: Array<any>, from: string) => void;
}

const SingleFieldContainer: React.FC<SingleFieldContainerProps> = ({
  item,
  moveTo,
}) => {
  const [context] = useContext(AccessContext) as any;
  const handleClick = (
    event: React.MouseEvent<HTMLElement>,
    item: ItemProp
  ) => {
    const section = Object.keys(context);
    const firstColumn = context[section[0]].findIndex(
      (field: ItemProp) => field.content === item.content
    );
    // Only Add field if it's not been added to the mode
    if (firstColumn < 0) {
      moveTo([item], 'read');
    }
  };
  const kindReadableText = {
    computedfordisplay: "computed for display",
    computedwhencomposed: "computed when composed",
  }

  return (
    <ItemContainer onClick={(e: React.MouseEvent<HTMLElement>) => {
      handleClick(e, item);
    }}
    >
      <ButtonAdd
        className="add-field"
        aria-describedby="popper-item"
      >
        <AddIcon />
      </ButtonAdd>
      <FieldInfo>
        <Typography
          className="field-name"
          color="textPrimary"
        >
          {item.content}
        </Typography>
        <Typography
          className="field-type"
          color="textPrimary"
        >
          {capitalizeFirst(item.format)}
        </Typography>
      </FieldInfo>
      {item.kind.length > 0 && <Tooltip arrow className='add-field' title={`This field is ${item.kind in kindReadableText ? kindReadableText[item.kind as keyof typeof kindReadableText] : item.kind}`}>
        <InfoOutlined />
      </Tooltip>}
    </ItemContainer>
  );
};

export default SingleFieldContainer;
