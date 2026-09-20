import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bell, Image, User, Shield, Info, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';

export default function SettingsView() {
  const { user, logoutFn } = useAuth();
  const [showBookCovers, setShowBookCovers] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyNote, setVerifyNote] = useState('');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile link */}
      {user && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-xl font-serif shadow-inner">
                {((user as any).fullName || user.email || '??').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 font-serif">{(user as any).fullName || user.email}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400">User ID: {user.uid.substring(0, 12)}...</p>
              </div>
            </div>
            <RouterLink
              to="/profile"
              className="text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center gap-1"
            >
              View Profile
            </RouterLink>
          </div>
        </div>
      )}

      {/* Email Verification (blocked for now) */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 mb-6 shadow-sm">
        <div className="p-4 border-b border-amber-100">
          <h3 className="font-semibold text-gray-900 font-serif flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Account Security
          </h3>
        </div>
        <div className="divide-y divide-amber-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Verification</p>
                  <p className="text-xs text-gray-500">Verify your email to prevent fake accounts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={() => setEmailVerified(!emailVerified)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            {!emailVerified && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Status:</span> Disabled for testing.
                  When enabled, a verification code will be sent to your email.
                </p>
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  rows={3}
                  placeholder="Verification note (e.g., OTP sent to user email)..."
                />
              </div>
            )}
            {emailVerified && (
              <p className="text-xs text-green-600 font-medium">
                Email verification is now enabled. All new accounts will require verification.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 mb-6 shadow-sm">
        <div className="p-4 border-b border-amber-100">
          <h3 className="font-semibold text-gray-900 font-serif flex items-center gap-2">
            <Image className="w-5 h-5 text-amber-500" />
            Preferences
          </h3>
        </div>
        <div className="divide-y divide-amber-50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Show Book Covers</p>
                <p className="text-xs text-gray-500">Display cover images in library</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={showBookCovers} onChange={() => setShowBookCovers(!showBookCovers)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">Receive notifications for new messages</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl mb-6 p-5">
        <h3 className="font-semibold text-amber-900 font-serif flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-600" />
          Disclaimer &amp; Guidelines
        </h3>
        <div className="text-sm text-amber-800 space-y-2">
          <p>
            <strong>Iraval is a peer-to-peer book sharing platform.</strong> We facilitate connections
            between readers, but we are <strong>not responsible</strong> for any books that are not
            returned after borrowing or exchange.
          </p>
          <p>
            <strong>Before lending or borrowing:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Meet in a public, safe location</li>
            <li>Inspect books together for condition</li>
            <li>Exchange contact information and set clear return dates</li>
            <li>Consider building trust through friend requests and message history</li>
          </ul>
          <p className="text-xs text-amber-600 mt-2">
            By using Iraval, you acknowledge that all exchanges are at your own risk.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 mb-6 shadow-sm">
        <div className="p-4 border-b border-amber-100">
          <h3 className="font-semibold text-gray-900 font-serif flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-500" />
            About
          </h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 font-serif">Iraval</p>
              <p className="text-sm text-gray-500">Version 1.2.0 (Web)</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Iraval is a book exchange community that connects readers who share
            similar interests. Search for books, find users who have them, and start
            conversations. Exchange physical books within your community.
          </p>
          <Link
            to="/terms"
            className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 hover:underline font-medium"
          >
            View Terms & Conditions
          </Link>
        </div>
      </div>

      {/* Friend requests are optional note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl mb-6 p-5">
        <h3 className="font-semibold text-blue-900 font-serif flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-blue-600" />
          Friend Requests Are Optional
        </h3>
        <p className="text-sm text-blue-800">
          You can send message requests and borrow books from any reader — <strong>you do not need to be friends first</strong>.
          Friend requests simply help you narrow your search to people you already know.
        </p>
      </div>

      {/* Sign Out */}
      <button
        onClick={logoutFn}
        className="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 hover:border-red-300 transition flex items-center justify-center gap-2"
      >
        <User className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
