/**
 * Tests for password recovery utilities
 */
import { describe, it, expect } from 'vitest';

describe('Recovery Code Generation', () => {
  function generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  it('generates a 6-digit code', () => {
    const code = generateRecoveryCode();
    expect(code.length).toBe(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('generates codes between 100000 and 999999', () => {
    const num = parseInt(generateRecoveryCode());
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it('generates different codes on each call', () => {
    const code1 = generateRecoveryCode();
    let different = false;
    for (let i = 0; i < 100; i++) {
      if (generateRecoveryCode() !== code1) { different = true; break; }
    }
    expect(different).toBe(true);
  });
});

describe('Code Validation', () => {
  function validateCodeFormat(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

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

describe('Code Expiration', () => {
  function isCodeExpired(createdAt: number, expiryMs: number = 10 * 60 * 1000): boolean {
    return Date.now() - createdAt > expiryMs;
  }

  it('returns false for fresh codes', () => {
    expect(isCodeExpired(Date.now())).toBe(false);
    expect(isCodeExpired(Date.now() - 60000)).toBe(false); // 1 minute old
  });

  it('returns true for expired codes', () => {
    const oldTime = Date.now() - (30 * 60 * 1000); // 30 minutes old
    expect(isCodeExpired(oldTime)).toBe(true);
  });

  it('handles 10-minute expiry correctly', () => {
    const justExpired = Date.now() - (10 * 60 * 1000 + 1); // Just past 10 min
    expect(isCodeExpired(justExpired, 10 * 60 * 1000)).toBe(true);

    const notExpired = Date.now() - (9 * 60 * 1000); // 9 minutes old
    expect(isCodeExpired(notExpired, 10 * 60 * 1000)).toBe(false);
  });
});

describe('Code Hashing (simplified)', () => {
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  it('produces consistent hash for same input', () => {
    expect(hashCode('123456')).toBe(hashCode('123456'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashCode('123456')).not.toBe(hashCode('654321'));
  });

  it('produces non-negative hashes', () => {
    expect(hashCode('000000')).toBeGreaterThanOrEqual(0);
    expect(hashCode('999999')).toBeGreaterThanOrEqual(0);
  });
});

describe('Recovery Key Generation', () => {
  function getRecoveryKey(email: string): string {
    return `recovery_${email}`;
  }

  it('generates consistent key for same email', () => {
    expect(getRecoveryKey('user@test.com')).toBe(getRecoveryKey('user@test.com'));
  });

  it('generates different keys for different emails', () => {
    expect(getRecoveryKey('alice@test.com')).not.toBe(getRecoveryKey('bob@test.com'));
  });
});

describe('Attempt Rate Limiting', () => {
  const MAX_ATTEMPTS = 5;
  const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  function isRateLimited(firstAttempt: number, count: number, currentTime: number): boolean {
    const windowElapsed = currentTime - firstAttempt;
    return windowElapsed < ATTEMPT_WINDOW_MS && count >= MAX_ATTEMPTS;
  }

  it('allows requests under the limit', () => {
    expect(isRateLimited(Date.now(), 3, Date.now())).toBe(false);
    expect(isRateLimited(Date.now(), 4, Date.now())).toBe(false);
  });

  it('blocks requests at and above the limit within the window', () => {
    expect(isRateLimited(Date.now(), 5, Date.now())).toBe(true);
    expect(isRateLimited(Date.now(), 10, Date.now())).toBe(true);
  });

  it('allows requests after the window expires', () => {
    const oldTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago
    expect(isRateLimited(oldTime, 10, Date.now())).toBe(false);
  });
});
