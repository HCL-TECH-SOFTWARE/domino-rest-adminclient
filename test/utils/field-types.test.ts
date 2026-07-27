import { describe, it, expect } from 'vitest';
import { convert2FieldType, convertDesignType2Format } from '../../src/utils/field-types';

describe('convertDesignType2Format', () => {
  it('maps a date-only datetime to "date"', () => {
    expect(convertDesignType2Format('datetime', ['date'])).toBe('date');
  });

  it('maps a time-only datetime to "string"', () => {
    // Deliberate: there is no JSON-schema "time" format in use here.
    expect(convertDesignType2Format('datetime', ['time'])).toBe('string');
  });

  it('maps a datetime with both attributes to "date-time"', () => {
    expect(convertDesignType2Format('datetime', ['date', 'time'])).toBe('date-time');
  });

  it('maps a datetime with no attributes to "date-time"', () => {
    expect(convertDesignType2Format('datetime', [])).toBe('date-time');
  });

  it.each([
    ['number', 'float'],
    ['authors', 'authors'],
    ['password', 'password'],
    ['richtext', 'richtext'],
    ['richtextlite', 'richtext'],
    ['names', 'names'],
    ['readers', 'readers'],
    ['json', 'binary'],
    ['attachments', 'binary'],
  ])('maps %s to %s', (designType, expected) => {
    expect(convertDesignType2Format(designType, [])).toBe(expected);
  });

  it.each(['keyword', 'color', 'timezone', 'text', 'formula', 'anything-unknown'])(
    'falls back to "string" for %s',
    (designType) => {
      expect(convertDesignType2Format(designType, [])).toBe('string');
    },
  );
});

describe('convert2FieldType', () => {
  it('returns "array" for a multi-value field regardless of format', () => {
    // The multi-value check runs first, so it wins over every format below.
    expect(convert2FieldType('boolean', true)).toBe('array');
    expect(convert2FieldType('binary', true)).toBe('array');
  });

  it.each([
    ['boolean', 'boolean'],
    ['float', 'number'],
    ['double', 'number'],
    ['int32', 'integer'],
    ['int64', 'integer'],
    ['byte', 'integer'],
    ['binary', 'object'],
    ['json', 'object'],
  ])('maps single-value %s to %s', (format, expected) => {
    expect(convert2FieldType(format, false)).toBe(expected);
  });

  it.each(['string', 'date', 'date-time', 'names', ''])(
    'falls back to "string" for %s',
    (format) => {
      expect(convert2FieldType(format, false)).toBe('string');
    },
  );
});
