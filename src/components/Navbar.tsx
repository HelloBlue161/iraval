import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Search, Users, MessageSquare, Tag, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { logoutFn } = useAuth();
  const location = useLocation();

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
      <nav className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/library" className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <span className="font-bold text-lg text-amber-700 font-serif">Iraval</span>
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
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  active
                    ? 'text-amber-700 border-t-2 border-amber-600 -mt-[1px]'
                    : 'text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : ''}`} />
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
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-medium border-r-3 border-amber-600'
                    : 'text-gray-600 hover:bg-amber-50/50 hover:text-amber-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-400'}`} />
                {tab.label}
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
