/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { AppState } from '../index';
import type { AccessField } from './types';

/**
 * Returned when there is no column yet, instead of a fresh `[]`.
 *
 * `StoreController` compares selector results with `Object.is`, so a selector that builds a
 * new array on every call is never equal to its previous result and re-renders its host on
 * *every* store change. One shared empty array keeps this selector safe to subscribe to
 * even though today's only caller reads it once, inside a click handler.
 */
const NO_FIELDS: AccessField[] = [];

/**
 * The fields already in the column that an "add field" click writes to.
 *
 * `moveTo(items, 'read')` in `AccessMode.tsx` appends to `Object.keys(state)[0]`, so that
 * is the column an add has to be de-duplicated against. The map has only ever had one key;
 * the index is what the callers use and is preserved rather than reinterpreted.
 */
export const selectFirstColumnFields = (state: AppState): AccessField[] => {
  const { fields } = state.accessMode;
  const first = Object.keys(fields)[0];
  return first === undefined ? NO_FIELDS : (fields[first] ?? NO_FIELDS);
};

/** Whether a field with this `content` is already in that column. */
export const selectFieldIsAdded = (state: AppState, content: unknown): boolean =>
  selectFirstColumnFields(state).some((field) => field.content === content);
