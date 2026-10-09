import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PasswordRecoveryView() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendPasswordReset } = useAuth();

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    const result = await sendPasswordReset(email.trim().toLowerCase());
    if (result.success) {
      setMessage(result.message);
      setSent(true);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-5 rotate-12">📖</div>
        <div className="absolute top-40 right-20 text-5xl opacity-5 -rotate-12">📚</div>
        <div className="absolute bottom-20 left-1/4 text-7xl opacity-5 rotate-6">🔖</div>
        <div className="absolute bottom-40 right-1/3 text-7xl opacity-5 -rotate-6">✉️</div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-amber-100 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-inner">
            {sent ? (
              <MailCheck className="w-8 h-8 text-amber-600" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            {sent ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {sent
              ? 'Follow the link in the email to choose a new password'
              : 'Enter your account email and we\u2019ll send you a reset link'}
          </p>
        </div>

        {/* Message/Error */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!sent ? (
          <form onSubmit={handleSendReset} className="space-y-4">
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <p className="text-gray-600 text-sm">
              Didn\u2019t get the email? Check your spam folder, or try again with a
              different address.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setMessage('');
                setEmail('');
              }}
              className="text-sm text-amber-600 hover:text-amber-700 transition"
            >
              Try a different email
            </button>
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
