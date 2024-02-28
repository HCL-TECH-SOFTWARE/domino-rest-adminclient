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

export const convertDesignType2Format = (designType: string) => {
  if (designType === "datetime") {
    return "date-time";
  } else if (designType === "number") {
    return "float";
  } else if (designType === "authors") {
    return "authors";
  } else if (designType === "password") {
    return "password";
  } else if (designType === "richtext" || designType === "richtextlite") {
    return "richtext";
  } else if (designType === "names") {
    return "names";
  } else if (designType === "readers") {
    return "readers";
  } else if (designType === "json") {
    return "binary";
  } else if (designType === "attachments") {
    return "binary";
  } else {
    //keyword, color, timezone, text, formula
    return "string";
  }
};

export const convert2FieldType = (fieldFormat: string, isMultipleValue: boolean) => {
  if (isMultipleValue) {
    return "array";
  }

  if (fieldFormat === "boolean") {
    return "boolean";
  } else if (fieldFormat === "float" || fieldFormat === "double") {
    return "number";
  } else if (fieldFormat === "int32" 
    || fieldFormat === "int64"
    || fieldFormat === "byte") {
    return "integer";
  } else if (fieldFormat === "binary") {
    return "object";
  } else if (fieldFormat === "json") {
    return "object";
  } else {
    return "string";
  }
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
