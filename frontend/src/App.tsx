import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { apiClient } from './api/client';
import { BookOpen, KeyRound, Mail, User, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';

const AuthScreenContent: React.FC = () => {
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await apiClient.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const token = res.data.access_token;
        const userRes = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        login(token, userRes.data);
      } else {
        await apiClient.post('/auth/register', {
          email,
          password,
          name,
          full_name: name,
        });

        setSuccess('Account created successfully! Please sign in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      console.error("Auth error details:", err.response);
      let detailMsg = 'Authentication failed. Please check your inputs.';
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          detailMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          detailMsg = err.response.data.detail.map((e: any) => `${e.loc?.slice(-1)[0] || 'field'}: ${e.msg}`).join(', ');
        }
      } else if (err.message) {
        detailMsg = err.message;
      }
      
      setError(detailMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="relative flex items-center w-16 h-8 p-1 bg-slate-200 dark:bg-slate-900 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border border-slate-300 dark:border-slate-800 shadow-sm"
        >
          <div
            className={`flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-md transform transition-transform duration-300 ${
              isDarkMode ? 'translate-x-8 text-slate-200' : 'translate-x-0 text-amber-500'
            }`}
          >
            {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </div>
          <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none text-slate-400 dark:text-slate-600">
            <Sun className="w-3.5 h-3.5" />
            <Moon className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl transition-colors duration-300">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">StudyVault AI</h1>
        </div>

        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 text-center mb-6">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl text-center font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreenContent />;
  }

  return (
    <>
      <Dashboard onOpenProfile={() => setIsProfileOpen(true)} />
      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        username={user.name || user.email || 'Student User'} 
        userEmail={user.email || ''}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;