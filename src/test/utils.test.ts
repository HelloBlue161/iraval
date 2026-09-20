import { describe, it, expect } from 'vitest';
import { generateRecoveryCode, validateCodeFormat, isCodeExpired, hashCode } from '../lib/recoveryUtils';
import { calculatePasswordStrength, isValidPassword } from '../lib/passwordUtils';
import { ZIP_CITY_MAP } from '../types';

describe('generateRecoveryCode', () => {
  it('generates a 6-digit code', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('generates codes between 100000 and 999999', () => {
    const code = generateRecoveryCode();
    const num = parseInt(code);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it('generates different codes on each call', () => {
    const code1 = generateRecoveryCode();
    // There's a tiny chance they're the same, so we test multiple times
    let different = false;
    for (let i = 0; i < 100; i++) {
      if (generateRecoveryCode() !== code1) { different = true; break; }
    }
    expect(different).toBe(true);
  });
});

describe('validateCodeFormat', () => {
  it('accepts valid 6-digit codes', () => {
    expect(validateCodeFormat('123456')).toBe(true);
    expect(validateCodeFormat('000000')).toBe(true);
    expect(validateCodeFormat('999999')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(validateCodeFormat('12345')).toBe(false);
    expect(validateCodeFormat('1234567')).toBe(false);
    expect(validateCodeFormat('abc123')).toBe(false);
    expect(validateCodeFormat('')).toBe(false);
    expect(validateCodeFormat('1234 56')).toBe(false);
  });
});

describe('isCodeExpired', () => {
  it('returns false for fresh codes', () => {
    expect(isCodeExpired(Date.now())).toBe(false);
  });

  it('returns false for codes within 10 minutes', () => {
    expect(isCodeExpired(Date.now() - 5 * 60 * 1000)).toBe(false);
  });

  it('returns true for codes older than 10 minutes', () => {
    expect(isCodeExpired(Date.now() - 11 * 60 * 1000)).toBe(true);
  });

  it('returns true for past timestamps', () => {
    expect(isCodeExpired(0)).toBe(true);
  });
});

describe('hashCode', () => {
  it('produces consistent hashes', () => {
    expect(hashCode('123456')).toBe(hashCode('123456'));
  });

  it('produces different hashes for different codes', () => {
    expect(hashCode('123456')).not.toBe(hashCode('654321'));
  });
});

describe('calculatePasswordStrength', () => {
  it('returns weak for empty password', () => {
    const result = calculatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('Very Weak');
  });

  it('returns weak for short password', () => {
    const result = calculatePasswordStrength('abc');
    expect(result.score).toBeLessThanOrEqual(2);
  });

  it('returns good for medium password with variety', () => {
    const result = calculatePasswordStrength('Hello123');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('returns strong for long complex password', () => {
    const result = calculatePasswordStrength('MyStr0ng!Pass2025');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });
});

describe('isValidPassword', () => {
  it('rejects passwords shorter than 6', () => {
    expect(isValidPassword('abc').valid).toBe(false);
    expect(isValidPassword('ab123').valid).toBe(false); // only 5 chars
  });

  it('accepts passwords with 6+ chars, letter and number', () => {
    expect(isValidPassword('ab1234').valid).toBe(true);
  });

  it('rejects passwords without letters', () => {
    expect(isValidPassword('123456').valid).toBe(false);
  });

  it('rejects passwords without numbers', () => {
    expect(isValidPassword('abcdef').valid).toBe(false);
  });

  it('accepts valid passwords', () => {
    expect(isValidPassword('Hello1').valid).toBe(true);
    expect(isValidPassword('MyP4ss').valid).toBe(true);
  });
});

describe('ZIP_CITY_MAP', () => {
  it('maps known zip codes to cities', () => {
    expect(ZIP_CITY_MAP['10001']).toBe('New York');
    expect(ZIP_CITY_MAP['90210']).toBe('Beverly Hills');
    expect(ZIP_CITY_MAP['94101']).toBe('San Francisco');
  });

  it('returns undefined for unknown zip codes', () => {
    expect(ZIP_CITY_MAP['00000']).toBeUndefined();
  });
});
