import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Search, Users, MessageSquare, Tag, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Navbar() {
  const { logoutFn, user } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  // Count pending exchange requests
  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }

    const countPending = async () => {
      try {
        const q = query(
          collection(db, 'exchanges'),
          where('receiverId', '==', user.email),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        setPendingCount(snap.size);
      } catch (err) {
        console.error('Failed to count pending exchanges:', err);
        setPendingCount(0);
      }
    };

    countPending();
    // Refresh every 30 seconds
    const interval = setInterval(countPending, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const tabs = [
    { key: 'library', label: 'Library', icon: BookOpen, path: '/library' },
    { key: 'search', label: 'Search', icon: Search, path: '/search' },
    { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
    { key: 'friends', label: 'Friends', icon: Users, path: '/friends' },
    { key: 'chats', label: 'Chats', icon: MessageSquare, path: '/chats' },
    { key: 'exchanges', label: 'Exchanges', icon: Tag, path: '/exchanges' },
    { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logoutFn();
  };

  return (
    <>
      {/* Mobile top bar */}
      <nav className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-amber-200 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <Link to="/library" className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-base text-amber-700 font-serif">Iraval</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        {/* Mobile tab bar */}
        <div className="flex border-t border-amber-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`relative flex-1 flex flex-col items-center py-1 text-xs transition-colors ${
                  active
                    ? 'text-amber-700 border-t-2 border-amber-600 -mt-[1px]'
                    : 'text-gray-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-600' : ''}`} />
                {tab.key === 'exchanges' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
                <span className="mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/90 backdrop-blur-sm border-r border-amber-200 h-screen sticky top-0">
        <Link
          to="/library"
          className="flex items-center gap-3 px-6 py-5 border-b border-amber-100"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-amber-700 font-serif">Iraval</span>
        </Link>

        <nav className="flex-1 py-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`relative flex items-center gap-3 px-6 py-3 text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-medium border-r-3 border-amber-600'
                    : 'text-gray-600 hover:bg-amber-50/50 hover:text-amber-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-400'}`} />
                {tab.label}
                {tab.key === 'exchanges' && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-amber-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-amber-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-gray-500 hover:text-red-600 w-full transition-colors py-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
