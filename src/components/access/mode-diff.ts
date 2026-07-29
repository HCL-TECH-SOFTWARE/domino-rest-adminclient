/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { getFieldIndex, getFormModeIndex } from '../../store/databases/scripts';
import { Mode } from '../../store/databases/types';

/**
 * "Is this the same across every selected mode?" — the four predicates behind
 * `ModeCompare`'s highlighting.
 *
 * Moved out of the component **verbatim** (#827). They were closures inside a
 * `useEffect`, so nothing could reach them without rendering a 759-line dialog, and the
 * bug they carry had been invisible for exactly that long. Pure functions of
 * `(allModes, selectedModeNames, …)`, which is what makes them testable — and being
 * plain `.ts` they survive that component's eventual conversion, whereas the markup
 * around them will not.
 *
 * This commit changes no behaviour; the next one fixes the loops.
 */

// Deep compare two objects
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true
  }

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }

  return true
}

// Check if field is equal across all modes
export function isFieldEqual(
  allModes: Array<Mode>,
  selectedModeNames: Array<string>,
  fieldName: string,
): boolean {
  let fieldEqual = true;

  let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
  let baseField = baseModeContents.fields[getFieldIndex(baseModeContents.fields, fieldName)];

  for (let i = 1; i < selectedModeNames.length; i++) {
    if (selectedModeNames[i] === '') {
      return false;
    }

    let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
    let fieldtoCompare = modeContents.fields[getFieldIndex(modeContents.fields, fieldName)];
    if (baseField && fieldtoCompare) {
      return deepEqual(JSON.parse(JSON.stringify(baseField)), JSON.parse(JSON.stringify(fieldtoCompare)))
    } else {
      return false;
    }
  }

  return fieldEqual;
}

// Check if field is equal across all modes
export function isFormulaEqual(
  allModes: Array<Mode>,
  selectedModeNames: Array<string>,
  formula: string,
): boolean {
  let formulaEqual = true;

  let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
  let baseFormula = baseModeContents[formula as keyof Mode];

  for (let i = 1; i < selectedModeNames.length; i++) {
    if (selectedModeNames[i] === '') {
      return false;
    }

    let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
    let formulatoCompare = modeContents[formula as keyof Mode];
    return deepEqual(JSON.parse(JSON.stringify(baseFormula)), JSON.parse(JSON.stringify(formulatoCompare)))
  }

  return formulaEqual
}

// Check if field type/key is equal across all modes
export function isKeyEqual(
  allModes: Array<Mode>,
  selectedModeNames: Array<string>,
  fieldName: string,
  fieldKey: string,
): boolean {
  let keyEqual = true;

  let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];

  if (getFieldIndex(baseModeContents.fields, fieldName) < 0) {
    return false;
  }
  let baseField = baseModeContents.fields[getFieldIndex(baseModeContents.fields, fieldName)];

  if (!Object.keys(baseField).includes(fieldKey)) {
    return false;
  }

  for (let i = 1; i < selectedModeNames.length; i++) {
    if (selectedModeNames[i] === '') {
      return false;
    }

    let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
    if (getFieldIndex(modeContents.fields, fieldName) < 0) {
      return false;
    }
    let field = modeContents.fields[getFieldIndex(modeContents.fields, fieldName)];
    if (
      Object.keys(baseField).includes(fieldKey) &&
      field[fieldKey as keyof typeof field] === baseField[fieldKey as keyof typeof field]
    ) {
      keyEqual = true;
    } else {
      return false;
    }
  }

  return keyEqual;
}
