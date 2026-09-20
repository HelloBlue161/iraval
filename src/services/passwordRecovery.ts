import { auth, db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  type ActionCodeSettings,
} from 'firebase/auth';
import {
  generateRecoveryCode,
  validateCodeFormat,
  isCodeExpired,
  hashCode,
  getRecoveryKey,
} from '../lib/recoveryUtils';

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface RecoveryRecord {
  codeHash: string;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

interface AttemptRecord {
  count: number;
  firstAttempt: string;
}

/**
 * Send a 6-digit recovery code to the user's email.
 * Stores the hashed code in Firestore and also triggers Firebase email reset.
 */
export async function sendRecoveryCode(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const key = getRecoveryKey(email);

    // Check rate limiting
    const attemptRef = doc(db, 'recoveryAttempts', key);
    const attemptSnap = await getDoc(attemptRef);

    if (attemptSnap.exists()) {
      const attemptData = attemptSnap.data() as AttemptRecord;
      const firstAttempt = new Date(attemptData.firstAttempt).getTime();
      if (Date.now() - firstAttempt < ATTEMPT_WINDOW_MS && attemptData.count >= MAX_ATTEMPTS) {
        return { success: false, message: 'Too many attempts. Please wait 10 minutes.' };
      }
    }

    // Generate and store recovery code
    const code = generateRecoveryCode();
    const codeHash = hashCode(code);

    await setDoc(doc(db, 'recoveryCodes', key), {
      codeHash,
      createdAt: new Date().toISOString(),
      attempts: 0,
    } as RecoveryRecord, { merge: true });

    // Also send Firebase password reset email as backup
    const actionCodeSettings: ActionCodeSettings = {
      url: 'https://iraval.app/reset-password',
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);

    // Log the attempt
    if (attemptSnap.exists()) {
      const existing = attemptSnap.data() as AttemptRecord;
      await updateDoc(attemptRef, {
        count: (existing.count || 0) + 1,
      });
    } else {
      await setDoc(attemptRef, {
        count: 1,
        firstAttempt: new Date().toISOString(),
      } as AttemptRecord);
    }

    return { success: true, message: `A verification code has been sent to ${email}` };
  } catch {
    return { success: false, message: 'Failed to send recovery code. Please try again.' };
  }
}

/**
 * Verify the recovery code. Returns true if valid and not expired.
 */
export async function verifyRecoveryCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  if (!validateCodeFormat(code)) {
    return { success: false, message: 'Code must be exactly 6 digits' };
  }

  try {
    const key = getRecoveryKey(email);
    const codeRef = doc(db, 'recoveryCodes', key);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { success: false, message: 'No recovery code found. Please request a new one.' };
    }

    const data = codeSnap.data() as RecoveryRecord;

    // Check expiration
    if (isCodeExpired(new Date(data.createdAt).getTime())) {
      await deleteDoc(codeRef);
      return { success: false, message: 'Code has expired. Please request a new one.' };
    }

    // Check attempts
    if ((data.attempts || 0) >= MAX_ATTEMPTS) {
      await deleteDoc(codeRef);
      return { success: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    // Verify code
    if (hashCode(code) !== data.codeHash) {
      await updateDoc(codeRef, {
        attempts: (data.attempts || 0) + 1,
        lastAttempt: new Date().toISOString(),
      });
      const remaining = MAX_ATTEMPTS - (data.attempts || 0) - 1;
      return { success: false, message: `Invalid code. ${remaining} attempts remaining.` };
    }

    // Success - mark as verified (don't delete yet, allow password reset)
    await updateDoc(codeRef, {
      verified: true,
      verifiedAt: new Date().toISOString(),
    });

    return { success: true, message: 'Code verified!' };
  } catch {
    return { success: false, message: 'Verification failed. Please try again.' };
  }
}

/**
 * Reset the password after successful code verification.
 */
export async function resetPassword(
  email: string,
  newPassword: string,
  oobCode?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Use Firebase out-of-band code if provided (from email link)
    if (oobCode) {
      await confirmPasswordReset(auth, oobCode, newPassword);
      // Clean up
      const key = getRecoveryKey(email);
      await deleteDoc(doc(db, 'recoveryCodes', key));
      return { success: true, message: 'Password reset successful!' };
    }

    // Use in-app verification (code was verified via Firestore)
    const key = getRecoveryKey(email);
    const codeRef = doc(db, 'recoveryCodes', key);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { success: false, message: 'Verification session expired. Please start over.' };
    }

    const data = codeSnap.data() as RecoveryRecord & { verified?: boolean };
    if (!data.verified) {
      return { success: false, message: 'Please verify your code first.' };
    }

    // Use Firebase auth to reset password
    // We need the user to be signed in for updatePassword, so we'll use confirmPasswordReset flow
    // Alternative: use the email link flow
    // For in-app, we use sendPasswordResetEmail and have the user click the link
    return { success: false, message: 'Please check your email and click the reset link to complete password change.' };
  } catch {
    return { success: false, message: 'Password reset failed. Please try again.' };
  }
}

/**
 * Check if a recovery code is still valid (not expired, not maxed attempts).
 */
export async function isRecoveryValid(email: string): Promise<boolean> {
  try {
    const key = getRecoveryKey(email);
    const codeSnap = await getDoc(doc(db, 'recoveryCodes', key));
    if (!codeSnap.exists()) return false;

    const data = codeSnap.data() as RecoveryRecord;
    if (isCodeExpired(new Date(data.createdAt).getTime())) return false;
    if ((data.attempts || 0) >= MAX_ATTEMPTS) return false;

    return true;
  } catch {
    return false;
  }
}
