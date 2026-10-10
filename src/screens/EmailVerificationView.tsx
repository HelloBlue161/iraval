import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function EmailVerificationView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);

  const handleResend = async () => {
    if (!user) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(user);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheckEmail = async () => {
    if (!user) return;
    // Reload the user from Firebase: the cached auth object keeps the old
    // emailVerified=false until explicitly refreshed. A plain page reload
    // is not enough.
    setChecking(true);
    setStillUnverified(false);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        navigate('/library', { replace: true });
        return;
      }
      setStillUnverified(true);
    } catch (err) {
      console.error('Failed to refresh verification status:', err);
      setStillUnverified(true);
    } finally {
      setChecking(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-amber-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-inner">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Verify Your Email</h1>
          <p className="text-gray-500 mt-1">
            We sent a verification link to
          </p>
          <p className="text-amber-700 font-medium mt-1">{user.email}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Check your inbox</strong> and click the verification link to activate your account.
            The link expires in 1 hour.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <span className="bg-amber-100 text-amber-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <p>Open your email inbox</p>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <span className="bg-amber-100 text-amber-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <p>Look for an email from <strong>Iraval</strong></p>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <span className="bg-amber-100 text-amber-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <p>Click the verification link in the email</p>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <span className="bg-amber-100 text-amber-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            <p>Come back here and click "I Verified My Email"</p>
          </div>
        </div>

        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-green-700">✓ Verification email sent! Check your inbox.</p>
          </div>
        )}

        {stillUnverified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800">Still not verified — make sure you clicked the link in the email (check spam), then try again.</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-200"
          >
            <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button
            onClick={handleCheckEmail}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition shadow-lg shadow-green-200"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'I Verified My Email - Continue'}
          </button>

          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Didn't receive the email? Check your spam folder or click "Resend" above.
          </p>
        </div>
      </div>
    </div>
  );
}
