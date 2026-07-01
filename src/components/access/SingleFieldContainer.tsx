/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import AddIcon from '@mui/icons-material/Add';
import styled from 'styled-components';

import { AccessContext } from './AccessContext';
import { capitalizeFirst } from '../../utils/common';
import { InfoOutlined } from '@mui/icons-material';
import { LitTooltip } from '../lit-elements/LitElements';

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
    <div
      className={`item-container${item.isDragging ? ' item-container--dragging' : ''}`}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        handleClick(e, item);
      }}
    >
      <ButtonAdd
        className="add-field"
        aria-describedby="popper-item"
      >
        <AddIcon />
      </ButtonAdd>
      <div className='flex flex-1 flex-col'>
        <span className="small-text color-text-primary">
          {item.content}
        </span>
        <span className="tiny-text weight-400 color-text-disabled">
          {capitalizeFirst(item.format)}
        </span>
      </div>
      {item.kind.length > 0 && 
        <LitTooltip
          content={`This field is ${item.kind in kindReadableText ? kindReadableText[item.kind as keyof typeof kindReadableText] : item.kind}`}
          className='add-field'
        >
          <InfoOutlined />
        </LitTooltip>
      }
    </div>
  );
};

export default SingleFieldContainer;
