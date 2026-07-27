/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// a little function to help us with reordering the result
export const reorder = (list: any, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};
/**
 * Moves an item from one list to another list.
 */
export const copy = (
  source: any,
  destination: any,
  droppableSource: any,
  droppableDestination: any
) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const item = sourceClone[droppableSource.index];

  destClone.splice(droppableDestination.index, 0, {
    ...(item as any),
    id: 1,
  });
  return destClone;
};

export const move = (
  source: any,
  destination: any,
  droppableSource: any,
  droppableDestination: any
) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result = {} as any;
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
};

export const convertField2DesignType = (fieldType: string) => {
  switch (fieldType) {
    case "binary":
      // other: json
      return "attachments"
    case "date":
    case "date-time":
      return "datetime"
    case "float":
    case "double":
      return "number"
    case "authors":
      return "authors"
    case "password":
      return "password"
    case "richtext":
      // other: richtextlite
      return "richtext"
    case "names":
      return "names"
    case "readers":
      return "readers"
    case "boolean":
      return "boolean"
    default:
      // others: keyword, color, formula, timezone, int32, int64, byte
      return "text"
  }
}
