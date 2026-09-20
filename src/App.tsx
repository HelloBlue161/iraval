import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import LoginView from './screens/LoginView';
import SignupView from './screens/SignupView';
import TermsView from './screens/TermsView';
import PasswordRecoveryView from './screens/PasswordRecoveryView';
import LibraryView from './screens/LibraryView';
import SearchView from './screens/SearchView';
import FriendRequestView from './screens/FriendRequestView';
import ChatListView from './screens/ChatListView';
import MyExchangesView from './screens/MyExchangesView';
import SettingsView from './screens/SettingsView';
import ProfileView from './screens/ProfileView';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/library" replace />;
  }

  return <>{children}</>;
}

function MainLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex">
      <Navbar />

      <main className="flex-1 overflow-auto lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/library" element={<LibraryView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/friends" element={<FriendRequestView />} />
            <Route path="/chats" element={<ChatListView />} />
            <Route path="/exchanges" element={<MyExchangesView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginView />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupView />
                </PublicRoute>
              }
            />
            <Route path="/terms" element={<TermsView />} />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <PasswordRecoveryView />
                </PublicRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
