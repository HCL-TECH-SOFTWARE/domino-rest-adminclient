/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import { styled } from '@linaria/react';

import { AccessContext } from './AccessContext';
import { capitalizeFirst } from '../../utils/common';
import { KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';

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
    _event: React.MouseEvent<HTMLElement>,
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
        <KeepIcon name='plus' label={`Add ${item.content} to this mode`} size='xl' />
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
        <KeepTooltip
          content={`This field is ${item.kind in kindReadableText ? kindReadableText[item.kind as keyof typeof kindReadableText] : item.kind}`}
          className='add-field'
        >
          <KeepIcon name='circle-info' size='xl' />
        </KeepTooltip>
      }
    </div>
  );
};

export default SingleFieldContainer;
