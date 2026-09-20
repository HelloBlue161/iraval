export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  feedback: string;
}

/**
 * Calculate password strength on a 0-4 scale.
 * Checks: length, uppercase, lowercase, numbers, special chars, common patterns.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'text-red-500', feedback: 'Enter a password' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1); // repetitive chars
  if (/^(password|123456|qwerty|abc123)/i.test(password)) score = 0;

  // Map score to label
  const maxPossible = 8;
  const normalized = Math.min(score, maxPossible) / maxPossible;

  if (normalized <= 0.2) return { score: 1, label: 'Very Weak', color: 'text-red-500', feedback: 'Add more characters and variety' };
  if (normalized <= 0.4) return { score: 2, label: 'Weak', color: 'text-orange-500', feedback: 'Try using a mix of letters, numbers, and symbols' };
  if (normalized <= 0.7) return { score: 3, label: 'Good', color: 'text-yellow-500', feedback: 'Looks solid!' };
  return { score: 4, label: 'Strong', color: 'text-green-500', feedback: 'Excellent password!' };
}

/**
 * Validate password meets minimum requirements.
 * At least 6 characters, 1 letter, 1 number.
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) errors.push('At least 6 characters');
  if (!/[a-zA-Z]/.test(password)) errors.push('At least 1 letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');

  return { valid: errors.length === 0, errors };
}
