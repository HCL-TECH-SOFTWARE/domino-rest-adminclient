import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fullEncode,
  insertCharacter,
  capitalizeFirst,
  stringExpiration,
  deepEqual,
  areArraysEqual,
  checkForResponse,
  AlertManager,
} from '../../src/utils/common';

describe('fullEncode', () => {
  it('leaves strings without special characters untouched', () => {
    expect(fullEncode('abcXYZ123')).toBe('abcXYZ123');
  });

  it('returns an empty string for empty input', () => {
    expect(fullEncode('')).toBe('');
  });

  it('encodes parentheses to their percent hex codes', () => {
    expect(fullEncode('a(b)c')).toBe('a%28b%29c');
  });

  it('encodes each of the special characters correctly', () => {
    expect(fullEncode('[')).toBe('%5b');
    expect(fullEncode(']')).toBe('%5d');
    expect(fullEncode('!')).toBe('%21');
    expect(fullEncode('*')).toBe('%2a');
    expect(fullEncode('\\')).toBe('%5c');
    expect(fullEncode('/')).toBe('%2f');
    expect(fullEncode('$')).toBe('%24');
    expect(fullEncode('&')).toBe('%26');
    expect(fullEncode("'")).toBe('%27');
    expect(fullEncode('#')).toBe('%23');
  });

  it('encodes multiple special characters in one pass', () => {
    expect(fullEncode('a!b#c')).toBe('a%21b%23c');
  });
});

describe('insertCharacter', () => {
  it('inserts the character at every interval without a trailing one', () => {
    expect(insertCharacter('abcdef', 2, '-')).toBe('ab-cd-ef');
  });

  it('inserts between every character for interval of 1', () => {
    expect(insertCharacter('abc', 1, ':')).toBe('a:b:c');
  });

  it('returns the original string when the interval exceeds the length', () => {
    expect(insertCharacter('abc', 5, '-')).toBe('abc');
  });

  it('returns the original string when interval equals the length', () => {
    expect(insertCharacter('abcd', 4, '-')).toBe('abcd');
  });

  it('returns an empty string for empty input', () => {
    expect(insertCharacter('', 2, '-')).toBe('');
  });

  it('supports multi-character separators', () => {
    expect(insertCharacter('abcd', 2, '::')).toBe('ab::cd');
  });
});

describe('capitalizeFirst', () => {
  it('capitalizes the first letter of a lowercase word', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
  });

  it('capitalizes a single character', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });

  it('leaves an already-capitalized word unchanged', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });

  it('only affects the first character', () => {
    expect(capitalizeFirst('aBC')).toBe('ABC');
  });

  it('throws on an empty string (no first character)', () => {
    expect(() => capitalizeFirst('')).toThrow();
  });
});

describe('stringExpiration', () => {
  it('formats zero milliseconds as 0:00:00', () => {
    expect(stringExpiration(0)).toBe('0:00:00');
  });

  it('formats exactly one day', () => {
    expect(stringExpiration(24 * 60 * 60 * 1000)).toBe('1:00:00');
  });

  it('formats exactly one hour with padding', () => {
    expect(stringExpiration(60 * 60 * 1000)).toBe('0:01:00');
  });

  it('formats exactly one minute with padding', () => {
    expect(stringExpiration(60 * 1000)).toBe('0:00:01');
  });

  it('formats a compound day/hour/minute value', () => {
    const t = 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000;
    expect(stringExpiration(t)).toBe('1:02:03');
  });

  it('rolls a rounded 60 minutes up into the next hour', () => {
    // one millisecond short of an hour rounds the minutes to 60
    expect(stringExpiration(60 * 60 * 1000 - 1)).toBe('0:01:00');
  });

  it('rolls a rounded 24th hour up into the next day', () => {
    // one millisecond short of a day rounds up through hour and day
    expect(stringExpiration(24 * 60 * 60 * 1000 - 1)).toBe('1:00:00');
  });
});

describe('deepEqual', () => {
  it('returns true for identical references', () => {
    const obj = { a: 1 };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it('returns true for equal primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('x', 'x')).toBe(true);
  });

  it('returns false for unequal primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
  });

  it('returns false when one side is null', () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });

  it('returns true when both sides are null', () => {
    expect(deepEqual(null, null)).toBe(true);
  });

  it('returns true for shallow-equal objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false for objects with different values', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false when key counts differ', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false when keys differ but counts match', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('recurses into nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('compares arrays element by element', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });
});

describe('areArraysEqual', () => {
  it('returns true for equal arrays', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('returns true for two empty arrays', () => {
    expect(areArraysEqual([], [])).toBe(true);
  });

  it('returns false for arrays of different length', () => {
    expect(areArraysEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false when an element differs', () => {
    expect(areArraysEqual([1, 2, 3], [1, 9, 3])).toBe(false);
  });

  it('uses strict equality (no deep comparison)', () => {
    expect(areArraysEqual([{ a: 1 }], [{ a: 1 }])).toBe(false);
  });
});

describe('checkForResponse', () => {
  it('parses JSON when the response is ok', async () => {
    const response = {
      ok: true,
      json: () => Promise.resolve({ data: 1 }),
    } as unknown as Response;
    await expect(checkForResponse(response)).resolves.toEqual({ data: 1 });
  });

  it('parses JSON when a failed response has a JSON content type', async () => {
    const response = {
      ok: false,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: () => Promise.resolve({ error: 'bad' }),
    } as unknown as Response;
    await expect(checkForResponse(response)).resolves.toEqual({ error: 'bad' });
  });

  it('builds an error object for a failed non-JSON response', async () => {
    const response = {
      ok: false,
      status: 500,
      statusText: 'Server Error',
      headers: { get: () => 'text/html' },
    } as unknown as Response;
    await expect(checkForResponse(response)).resolves.toEqual({
      status: 500,
      message: 'Server Error',
      errorId: 0,
    });
  });

  it('builds an error object when the content type header is missing', async () => {
    const response = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    } as unknown as Response;
    await expect(checkForResponse(response)).resolves.toEqual({
      status: 404,
      message: 'Not Found',
      errorId: 0,
    });
  });
});

describe('AlertManager', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    AlertManager.resetAlert();
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    AlertManager.resetAlert();
  });

  it('shows the alert on the first call', () => {
    AlertManager.showAlert('hello');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('hello');
    expect(AlertManager.alertShown).toBe(true);
  });

  it('does not show the alert again while one is already shown', () => {
    AlertManager.showAlert('first');
    AlertManager.showAlert('second');
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the alert again after resetAlert', () => {
    AlertManager.showAlert('first');
    AlertManager.resetAlert();
    expect(AlertManager.alertShown).toBe(false);
    AlertManager.showAlert('second');
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });
});
