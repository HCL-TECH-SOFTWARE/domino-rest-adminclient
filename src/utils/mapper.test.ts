import { describe, it, expect } from 'vitest';
import { mapSchemas } from './mapper';

describe('mapSchemas', () => {
  it('returns an empty array for empty input', () => {
    expect(mapSchemas([], 'schemas')).toEqual([]);
  });

  it('groups a single database under its nsfPath when type is "schemas"', () => {
    const input = [{ nsfPath: 'a.nsf', schemaName: 'S1' }];
    const result = mapSchemas(input, 'schemas');
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('a.nsf');
    expect(result[0].databases).toEqual([{ nsfPath: 'a.nsf', schemaName: 'S1' }]);
  });

  it('groups databases that share an nsfPath when type is "schemas"', () => {
    const input = [
      { nsfPath: 'z.nsf', schemaName: 'A' },
      { nsfPath: 'a.nsf', schemaName: 'B' },
      { nsfPath: 'a.nsf', schemaName: 'C' },
    ];
    const result = mapSchemas(input, 'schemas');
    expect(result).toHaveLength(2);
    // sorted ascending by nsfPath -> a.nsf group comes first
    expect(result[0].fileName).toBe('a.nsf');
    expect(result[0].databases).toHaveLength(2);
    expect(result[1].fileName).toBe('z.nsf');
    expect(result[1].databases).toHaveLength(1);
  });

  it('sorts groups ascending by nsfPath', () => {
    const input = [
      { nsfPath: 'b.nsf', schemaName: 'B' },
      { nsfPath: 'a.nsf', schemaName: 'A' },
      { nsfPath: 'c.nsf', schemaName: 'C' },
    ];
    const result = mapSchemas(input, 'schemas');
    expect(result.map((r: any) => r.fileName)).toEqual(['a.nsf', 'b.nsf', 'c.nsf']);
  });

  it('groups by schemaName when type is not "schemas"', () => {
    const input = [
      { nsfPath: 'x.nsf', schemaName: 'Beta' },
      { nsfPath: 'y.nsf', schemaName: 'Alpha' },
      { nsfPath: 'z.nsf', schemaName: 'Alpha' },
    ];
    const result = mapSchemas(input, 'databases');
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe('Beta');
    expect(result[0].databases).toHaveLength(1);
    expect(result[1].fileName).toBe('Alpha');
    expect(result[1].databases).toHaveLength(2);
  });

  it('does not mutate the original input array order', () => {
    const input = [
      { nsfPath: 'b.nsf', schemaName: 'B' },
      { nsfPath: 'a.nsf', schemaName: 'A' },
    ];
    mapSchemas(input, 'schemas');
    expect(input.map((d) => d.nsfPath)).toEqual(['b.nsf', 'a.nsf']);
  });
});
