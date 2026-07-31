/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { isEmptyOrSpaces, verifyModeName } from '../../src/utils/form';

describe('isEmptyOrSpaces', () => {
  it('returns true for null', () => {
    expect(isEmptyOrSpaces(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isEmptyOrSpaces(undefined)).toBe(true);
  });

  it('returns true for an empty string', () => {
    expect(isEmptyOrSpaces('')).toBe(true);
  });

  it('returns true for a string of only spaces', () => {
    expect(isEmptyOrSpaces('     ')).toBe(true);
  });

  it('returns false for a string with visible content', () => {
    expect(isEmptyOrSpaces('abc')).toBe(false);
  });

  it('returns false for content surrounded by spaces', () => {
    expect(isEmptyOrSpaces('  a  ')).toBe(false);
  });

  it('returns false for whitespace that is not a plain space (tab)', () => {
    // the regex only matches ASCII spaces, not tabs
    expect(isEmptyOrSpaces('\t')).toBe(false);
  });
});

describe('verifyModeName', () => {
  it('returns false (valid) for a plain alphanumeric name', () => {
    expect(verifyModeName('abc123')).toBe(false);
  });

  it('returns false (valid) for names with underscores and spaces', () => {
    expect(verifyModeName('valid_name 123')).toBe(false);
  });

  it('returns true (invalid) when the name ends with a special character', () => {
    expect(verifyModeName('abc@')).toBe(true);
    expect(verifyModeName('name!')).toBe(true);
  });

  it('returns true (invalid) for an empty string', () => {
    expect(verifyModeName('')).toBe(true);
  });

  it('returns false (valid) when only the start has a special character', () => {
    // only the ending characters are validated by the trailing-anchored regex
    expect(verifyModeName('@abc')).toBe(false);
  });

  it('returns false (valid) for a name that is only spaces', () => {
    expect(verifyModeName('   ')).toBe(false);
  });
});
