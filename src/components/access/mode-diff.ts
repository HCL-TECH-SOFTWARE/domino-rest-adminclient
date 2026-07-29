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

/**
 * Whether a field is identical in **every** selected mode.
 *
 * The `return` used to sit inside the loop, so this exited on the first iteration and
 * compared mode 1 against mode 2 only. `ModeCompare` offers a column per mode and turns
 * on its remove button at `selectedModeNames.length > 2`, so with three or more selected
 * every difference in modes 3+ was reported as "no difference" (#827).
 *
 * The `JSON.parse(JSON.stringify(…))` round trip is kept: it drops `undefined`-valued
 * keys before comparison, and `deepEqual` compares key *counts*, so removing it would
 * change which fields are reported as differing.
 */
export function isFieldEqual(
  allModes: Array<Mode>,
  selectedModeNames: Array<string>,
  fieldName: string,
): boolean {
  const baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
  const baseField = baseModeContents.fields[getFieldIndex(baseModeContents.fields, fieldName)];

  for (let i = 1; i < selectedModeNames.length; i++) {
    if (selectedModeNames[i] === '') {
      return false;
    }

    const modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
    const fieldtoCompare = modeContents.fields[getFieldIndex(modeContents.fields, fieldName)];
    if (!baseField || !fieldtoCompare) {
      return false;
    }
    if (!deepEqual(JSON.parse(JSON.stringify(baseField)), JSON.parse(JSON.stringify(fieldtoCompare)))) {
      return false;
    }
  }

  return true;
}

/**
 * The round trip both predicates compare through, made safe for a missing value.
 *
 * `JSON.parse(JSON.stringify(undefined))` throws `SyntaxError: "undefined" is not valid
 * JSON`, because `stringify` returns the value `undefined` and `parse` coerces it to the
 * string `"undefined"`. That was always true of `isFormulaEqual`, but unreachable in
 * practice while it returned on the first iteration — a mode missing a formula had to be
 * the *second* selected one to be seen at all. Fixing the loop is what makes modes 3+
 * reachable, so the crash comes with it unless it is handled here.
 *
 * Passing `undefined` straight through is what preserves behaviour: `deepEqual` treats
 * two `undefined`s as equal and `undefined` against anything else as a difference, which
 * is the answer the comparison wants in both cases. Every input that did not throw is
 * unaffected — the trip still drops `undefined`-valued keys inside objects, which matters
 * because `deepEqual` compares key counts.
 */
const roundTrip = (value: unknown) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/**
 * Whether one of the five mode formulas is identical in **every** selected mode.
 *
 * Same defect as {@link isFieldEqual} and the one #827 was filed for: the `return` was
 * inside the loop. `isKeyEqual` below never had it, and is the shape both have been
 * brought into line with — keep going until something differs, then say so.
 */
export function isFormulaEqual(
  allModes: Array<Mode>,
  selectedModeNames: Array<string>,
  formula: string,
): boolean {
  const baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
  const baseFormula = baseModeContents[formula as keyof Mode];

  for (let i = 1; i < selectedModeNames.length; i++) {
    if (selectedModeNames[i] === '') {
      return false;
    }

    const modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
    const formulatoCompare = modeContents[formula as keyof Mode];
    if (!deepEqual(roundTrip(baseFormula), roundTrip(formulatoCompare))) {
      return false;
    }
  }

  return true;
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
