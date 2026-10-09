/**
 * Tests for the password recovery service.
 * The flow uses Firebase Auth's built-in reset-email; these tests mock
 * firebase/auth so no network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return { ...actual, sendPasswordResetEmail: vi.fn() };
});

// Import after the mock is registered
import { sendPasswordResetEmail } from 'firebase/auth';
import { sendPasswordReset } from '../../src/services/passwordRecovery';

const mockSend = vi.mocked(sendPasswordResetEmail);

describe('sendPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue(undefined);
  });

  it('sends a reset email for a valid address', async () => {
    const result = await sendPasswordReset('user@example.com');
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    // email is normalized before sending
    expect(mockSend).toHaveBeenCalledWith(expect.anything(), 'user@example.com');
    expect(result.message).toContain('user@example.com');
  });

  it('normalizes the email (trim + lowercase)', async () => {
    await sendPasswordReset('  USER@Example.COM ');
    expect(mockSend).toHaveBeenCalledWith(expect.anything(), 'user@example.com');
  });

  it('rejects invalid email addresses without calling Firebase', async () => {
    for (const bad of ['', 'not-an-email', 'a@b', '@example.com', 'a b@example.com']) {
      const result = await sendPasswordReset(bad);
      expect(result.success).toBe(false);
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does not reveal whether an account exists (anti-enumeration)', async () => {
    mockSend.mockRejectedValue({ code: 'auth/user-not-found' });
    const result = await sendPasswordReset('ghost@example.com');
    // Still reports success so attackers can't probe for registered emails
    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');
  });

  it('reports rate limiting clearly', async () => {
    mockSend.mockRejectedValue({ code: 'auth/too-many-requests' });
    const result = await sendPasswordReset('user@example.com');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many attempts/i);
  });

  it('reports generic failures without leaking details', async () => {
    mockSend.mockRejectedValue({ code: 'auth/network-request-failed' });
    const result = await sendPasswordReset('user@example.com');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/could not send/i);
  });
});
