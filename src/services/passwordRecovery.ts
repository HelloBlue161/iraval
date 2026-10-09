import { auth } from './firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

/**
 * Send a password reset email using Firebase Auth's built-in flow.
 *
 * We intentionally use Firebase's default action handler (no custom
 * actionCodeSettings): the email contains a secure link that opens
 * Firebase's hosted password-reset page, where the user picks a new
 * password. This avoids building a custom code-delivery mechanism
 * (which would need a backend to email the code securely).
 */
export async function sendPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  try {
    await sendPasswordResetEmail(auth, normalized);
    return {
      success: true,
      message: `Password reset link sent to ${normalized}. Check your inbox (and spam folder) and follow the link to choose a new password.`,
    };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // Don't reveal whether the address is registered: Firebase already
    // returns success for unknown emails in most configs, but if it throws
    // auth/user-not-found we still show the generic message to avoid
    // account enumeration.
    if (code === 'auth/user-not-found') {
      return {
        success: true,
        message: `If an account exists for ${normalized}, a password reset link is on its way. Check your inbox (and spam folder).`,
      };
    }
    if (code === 'auth/too-many-requests') {
      return {
        success: false,
        message: 'Too many attempts. Please wait a few minutes and try again.',
      };
    }
    return {
      success: false,
      message: 'Could not send the reset email. Please check the address and try again.',
    };
  }
}
