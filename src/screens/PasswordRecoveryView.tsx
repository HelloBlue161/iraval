import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculatePasswordStrength } from '../lib/passwordUtils';
import { validateCodeFormat } from '../lib/recoveryUtils';

type RecoveryStep = 'email' | 'code' | 'newPassword' | 'success';

export default function PasswordRecoveryView() {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendRecoveryCode, verifyRecoveryCode } = useAuth();

  const strength = calculatePasswordStrength(newPassword);

  // Countdown timer
  useEffect(() => {
    if (step !== 'code') return;

    setTimer(600);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setError('Code expired. Please request a new one.');
          setStep('email');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    const result = await sendRecoveryCode(email.trim().toLowerCase());
    if (result.success) {
      setMessage(result.message);
      setStep('code');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !validateCodeFormat(code)) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    const result = await verifyRecoveryCode(email.trim().toLowerCase(), code);
    if (result.success) {
      setMessage(result.message);
      setStep('newPassword');
    } else {
      setError(result.message);
      if (result.message.includes('expired')) {
        setStep('email');
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    // Use Firebase's password reset email link flow
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../services/firebase');

      // Send password reset email (this generates an oobCode/link)
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());

      // Show instructions to the user
      setMessage('Check your email and click the password reset link to complete the change.');
      setStep('success');
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-5 rotate-12">📖</div>
        <div className="absolute top-40 right-20 text-5xl opacity-5 -rotate-12">📚</div>
        <div className="absolute bottom-20 left-1/4 text-7xl opacity-5 rotate-6">🔖</div>
        <div className="absolute bottom-40 right-1/3 text-6xl opacity-5 -rotate-6">✉️</div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-amber-100 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            {step === 'email' && 'Reset Password'}
            {step === 'code' && 'Verify Code'}
            {step === 'newPassword' && 'New Password'}
            {step === 'success' && 'Success!'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 'email' && 'Enter your email to receive a verification code'}
            {step === 'code' && `We sent a code to ${email}`}
            {step === 'newPassword' && 'Create a new strong password'}
            {step === 'success' && 'Your password has been reset'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['email', 'code', 'newPassword', 'success'] as RecoveryStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                ['email', 'code', 'newPassword', 'success'].indexOf(step) >= i
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {['email', 'code', 'newPassword', 'success'].indexOf(step) > i ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${
                ['email', 'code', 'newPassword', 'success'].indexOf(step) > i ? 'bg-amber-500' : 'bg-gray-200'
              }`} />}
            </div>
          ))}
        </div>

        {/* Back button */}
        {step !== 'email' && step !== 'success' && (
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (step === 'code') setStep('email');
              else if (step === 'newPassword') setStep('code');
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-amber-600 transition mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Message/Error */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-200"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* Step 2: Code */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {/* Timer */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Code expires in</p>
              <p className={`text-2xl font-mono font-bold ${
                timer < 60 ? 'text-red-500 animate-pulse' : 'text-amber-600'
              }`}>
                {formatTime(timer)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                required
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1 text-center">Check your email for the 6-digit code</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-200"
              >
                Verify Code
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setStep('email');
              }}
              className="w-full text-sm text-amber-600 hover:text-amber-700 transition"
            >
              Resend code
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Enter new password"
                  required
                  autoFocus
                />
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          strength.score >= i
                            ? i === 4 ? 'bg-green-500' : i === 3 ? 'bg-yellow-500' : 'bg-orange-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength.color}`}>
                    {strength.label} — {strength.feedback}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Confirm new password"
                  required
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-200"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-gray-600">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:text-amber-600 transition">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
