/**
 * Generate a random 6-digit numeric recovery code.
 */
export function generateRecoveryCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Validate that a code is exactly 6 digits.
 */
export function validateCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Check if a recovery code has expired (> 10 minutes old).
 */
export function isCodeExpired(timestampMs: number): boolean {
  return Date.now() - timestampMs > 10 * 60 * 1000;
}

/**
 * Hash a code for secure storage.
 * Simple hash for obfuscation; not cryptographic-grade.
 */
export function hashCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a safe key for storing recovery data in Firestore.
 */
export function getRecoveryKey(email: string): string {
  return 'rc_' + email.replace(/[^a-zA-Z0-9]/g, '_');
}
