/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import accessModeReducer from '../../../src/store/accessMode/reducer';
// Through `action`, not `reducer`: that is the path every component imports, and it is the
// one that would break silently if the re-export were dropped.
import { resetAccessFields, setAccessFields } from '../../../src/store/accessMode/action';
import { INIT_STATE, type AccessModeState } from '../../../src/store/accessMode/types';
import { rootReducer } from '../../../src/store';

/**
 * #806 — `AccessContext` became this slice.
 *
 * The initial droppable id is a uuid generated at module load, so the assertions describe
 * the *shape* rather than a literal: one column, empty.
 */

const unknown = { type: '@@UNKNOWN' } as never;

const columnOf = (state: AccessModeState) => {
  const keys = Object.keys(state.fields);
  expect(keys).toHaveLength(1);
  return { id: keys[0], fields: state.fields[keys[0]] };
};

describe('accessModeReducer', () => {
  it('starts with exactly one empty column', () => {
    // Not an empty map. Every consumer reads Object.keys(fields)[0] and indexes with it;
    // `undefined` as a key is what an empty map would hand them on the first render.
    const { id, fields } = columnOf(accessModeReducer(undefined, unknown));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(fields).toEqual([]);
  });

  it('setAccessFields replaces the whole map', () => {
    const initial = accessModeReducer(undefined, unknown);
    const next = accessModeReducer(initial, setAccessFields({ read: [{ content: 'Subject' }] }));

    expect(next.fields).toEqual({ read: [{ content: 'Subject' }] });
    // Replaced, not merged — the old column is gone.
    expect(Object.keys(next.fields)).not.toContain(Object.keys(initial.fields)[0]);
  });

  it('resetAccessFields empties the map under a fresh id', () => {
    const populated = accessModeReducer(undefined, setAccessFields({ read: [{ content: 'a' }] }));
    const next = accessModeReducer(populated, resetAccessFields());

    const { id, fields } = columnOf(next);
    expect(fields).toEqual([]);
    // A new key each time, matching the `{ [uuid()]: [] }` the component used to build.
    expect(id).not.toBe('read');
    expect(columnOf(accessModeReducer(next, resetAccessFields())).id).not.toBe(id);
  });

  it('generates the reset id outside the reducer, so the reducer stays pure', () => {
    // `prepare` puts the uuid on the action. Replaying one action twice from the same state
    // has to give the same state; a uuid() in the reducer body would not.
    const action = resetAccessFields();
    const from = accessModeReducer(undefined, setAccessFields({ read: [] }));
    expect(accessModeReducer(from, action)).toEqual(accessModeReducer(from, action));
  });

  it('INIT_STATE resets the slice', () => {
    // Matched as the bare literal it is. Declared under `reducers` it would be namespaced
    // to 'accessMode/INIT_STATE' and this broadcast would sail past.
    const populated = accessModeReducer(undefined, setAccessFields({ read: [{ content: 'a' }] }));
    expect(columnOf(accessModeReducer(populated, { type: INIT_STATE })).fields).toEqual([]);
  });

  it('does not mutate the state it is given', () => {
    const frozen = Object.freeze(accessModeReducer(undefined, unknown));
    expect(() => accessModeReducer(frozen, setAccessFields({ read: [] }))).not.toThrow();
  });

  it('is wired into the root reducer, and reacts to nothing else', () => {
    const before = rootReducer(undefined, { type: '@@INIT' } as never);
    expect(before.accessMode).toBeDefined();

    const next = rootReducer(before, setAccessFields({ read: [{ content: 'Subject' }] }) as never);
    expect(next.accessMode.fields).toEqual({ read: [{ content: 'Subject' }] });

    for (const slice of Object.keys(before) as Array<keyof typeof before>) {
      if (slice === 'accessMode') continue;
      expect(next[slice], `${slice} reacted to an accessMode action`).toEqual(before[slice]);
    }
  });
});
