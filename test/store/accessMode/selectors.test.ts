/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import {
  selectFieldIsAdded,
  selectFirstColumnFields,
} from '../../../src/store/accessMode/selectors';
import type { AppState } from '../../../src/store';
import type { AccessModeState } from '../../../src/store/accessMode/types';

const stateWith = (fields: AccessModeState['fields']) => ({ accessMode: { fields } }) as AppState;

describe('accessMode selectors', () => {
  it('reads the first column, which is the one an add writes to', () => {
    const state = stateWith({ read: [{ content: 'Subject' }], write: [{ content: 'Body' }] });
    expect(selectFirstColumnFields(state)).toEqual([{ content: 'Subject' }]);
  });

  it('returns the same empty array when there is no column', () => {
    // Not a fresh []. StoreController compares with Object.is, so a selector that allocates
    // is never equal to its previous result and re-renders its host on every store change.
    const empty = stateWith({});
    expect(selectFirstColumnFields(empty)).toEqual([]);
    expect(selectFirstColumnFields(empty)).toBe(selectFirstColumnFields(stateWith({})));
  });

  it('returns the same empty array when the first column holds nothing', () => {
    // Reachable through `setAccessFields`, which takes whatever map it is handed.
    const holed = stateWith({ read: undefined as unknown as [] });
    expect(selectFirstColumnFields(holed)).toEqual([]);
  });

  it('recognises a field that is already in the mode', () => {
    const state = stateWith({ read: [{ content: 'Subject' }] });
    expect(selectFieldIsAdded(state, 'Subject')).toBe(true);
    expect(selectFieldIsAdded(state, 'Body')).toBe(false);
  });

  it('does not let a field with no name match anything real', () => {
    const nameless = stateWith({ read: [{ id: '1' }] });
    expect(selectFieldIsAdded(nameless, 'Subject')).toBe(false);
    // The element passes '' rather than undefined for an item with no content, so a
    // nameless entry in the column cannot silently swallow that add either.
    expect(selectFieldIsAdded(nameless, '')).toBe(false);
  });
});
