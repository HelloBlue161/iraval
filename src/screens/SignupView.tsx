import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isUsernameTaken } from '../services/authService';
import { calculatePasswordStrength, isValidPassword } from '../lib/passwordUtils';

export default function SignupView() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signupFn } = useAuth();
  const navigate = useNavigate();

  // Auto-fill city from zip code, but only if user hasn't manually entered one
  const [cityManual, setCityManual] = useState(false);
  useEffect(() => {
    if (!cityManual && zipCode && zipCityMap[zipCode]) {
      setCity(zipCityMap[zipCode]);
    }
  }, [zipCode, cityManual]);

  const strength = calculatePasswordStrength(password);
  const passwordValidation = isValidPassword(password);

  const minAgeDate = new Date();
  minAgeDate.setFullYear(minAgeDate.getFullYear() - 21);

  const isOver21 = () => {
    if (!birthDate) return false;
    return new Date(birthDate) <= minAgeDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (!isOver21()) {
      setError('You must be 21 or older to use Iraval');
      return;
    }

    setLoading(true);

    try {
      const taken = await isUsernameTaken(username);
      if (taken) {
        setError('Username is already taken');
        setLoading(false);
        return;
      }

      const targetCity = city.trim() || detectedCity;
      await signupFn(email, password, fullName, username, zipCode, birthDate, targetCity);
      navigate('/library');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      console.error('Signup error:', err);
      if (message.includes('permission-denied')) {
        setError('Firestore rules missing or not published. Go to Firebase Console → Firestore → Rules → click Publish, wait 10s, then try again.');
      } else if (message.includes('weak-password')) {
        setError('Password must be at least 6 characters with letters and numbers');
      } else if (message.includes('email-already-in-use')) {
        setError('Email already in use');
      } else if (message.includes('network-request-failed')) {
        setError('Network error. Check your internet connection.');
      } else {
        setError(`Signup failed: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const zipCityMap: Record<string, string> = {
    '10001': 'New York',
    '90210': 'Beverly Hills',
    '33101': 'Miami',
    '60601': 'Chicago',
    '75201': 'Dallas',
    '30301': 'Atlanta',
    '85001': 'Phoenix',
    '19101': 'Philadelphia',
    '77001': 'Houston',
    '94101': 'San Francisco',
  };

  const detectedCity = zipCityMap[zipCode] || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-5 rotate-12">📖</div>
        <div className="absolute top-32 right-16 text-5xl opacity-5 -rotate-12">📚</div>
        <div className="absolute bottom-16 left-1/4 text-7xl opacity-5 rotate-6">🔖</div>
        <div className="absolute bottom-32 right-1/3 text-6xl opacity-5 -rotate-6">📝</div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-amber-100 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-inner">
            <UserPlus className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Create Account</h1>
          <p className="text-gray-500 mt-1">Join the Iraval book exchange community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="Jane Austen"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="janeaustens_reads"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                placeholder="Min. 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
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

            {/* Password requirements */}
            {password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 mb-1">Requirements:</p>
                <div className="flex flex-col gap-0.5">
                  {[
                    { check: password.length >= 6, text: 'At least 6 characters' },
                    { check: /[a-zA-Z]/.test(password), text: 'Contains a letter' },
                    { check: /[0-9]/.test(password), text: 'Contains a number' },
                  ].map(({ check, text }) => (
                    <div key={text} className={`flex items-center gap-1.5 text-xs ${
                      check ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {check ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                placeholder="Re-enter password"
                required
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {password === confirmPassword
                    ? <Check className="w-5 h-5 text-green-500" />
                    : <X className="w-5 h-5 text-red-400" />}
                </div>
              )}
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => { setCityManual(true); setCity(e.target.value); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="Your city"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip / Postal Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                inputMode="numeric"
                maxLength={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                placeholder="10001"
              />
              {zipCode && !city && <p className="text-xs text-gray-400 mt-1">{detectedCity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={minAgeDate.toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                required
              />
              {isOver21() && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 21+ confirmed
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800">
              By signing up, you confirm you are <strong>21 or older</strong> and agree to the{' '}
              <Link to="/terms" className="underline font-medium text-amber-700">
                Terms & Conditions
              </Link>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isOver21() || !passwordValidation.valid}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-200"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
