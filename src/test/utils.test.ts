import { describe, it, expect } from 'vitest';
import { calculatePasswordStrength, isValidPassword } from '../lib/passwordUtils';
import { ZIP_CITY_MAP } from '../types';

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
