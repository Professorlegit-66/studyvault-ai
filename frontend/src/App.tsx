import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { apiClient } from './api/client';
import { BookOpen, KeyRound, Mail, User, Loader2, AlertCircle, ShieldCheck, RotateCw } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';

const AuthScreenContent: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // After a successful registration, we don't log the user in right away -
  // the backend requires email verification first. 'authStep' controls
  // whether we're showing the normal login/register form or the OTP entry
  // screen; registeredEmail carries the address into the verify request.
  const [authStep, setAuthStep] = useState<'form' | 'verify'>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Sends a fresh OTP to targetEmail and switches to the verify screen.
  // Takes the email as a parameter (rather than reading the registeredEmail
  // state) so it can be called right after login/register discovers the
  // email, without waiting on a state update to land first. Used both by
  // the normal post-registration flow and by the "recover an interrupted
  // registration" path below.
  const enterVerifyStep = async (targetEmail: string, { autoResend }: { autoResend: boolean }) => {
    setRegisteredEmail(targetEmail);
    setAuthStep('verify');
    setCode('');
    setError(null);
    setSuccess(null);

    if (autoResend) {
      setResending(true);
      try {
        await apiClient.post('/auth/resend-verification', { email: targetEmail });
        setSuccess('Looks like your last registration didn\u2019t finish. We\u2019ve sent a fresh code to your email.');
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Could not automatically resend a code - use the resend button below.');
      } finally {
        setResending(false);
      }
    }
  };

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
        const res = await apiClient.post('/auth/register', {
          email,
          password,
          name,
          full_name: name,
        });

        await enterVerifyStep(res.data.email, { autoResend: false });
        setPassword('');
      }
    } catch (err: any) {
      console.error("Auth error details:", err.response);

      if (isLogin && err.response?.status === 403) {
        await enterVerifyStep(email, { autoResend: true });
        setLoading(false);
        return;
      }

      if (!isLogin && err.response?.status === 400 &&
          typeof err.response?.data?.detail === 'string' &&
          err.response.data.detail.toLowerCase().includes('already exists')) {
        await enterVerifyStep(email, { autoResend: true });
        setLoading(false);
        return;
      }

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);

    try {
      const res = await apiClient.post('/auth/verify-email', {
        email: registeredEmail,
        code: code.trim(),
      });

      const token = res.data.access_token;
      const userRes = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      login(token, userRes.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setSuccess(null);
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: registeredEmail });
      setSuccess('A new code has been sent to your email.');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (authStep === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors duration-300">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl transition-colors duration-300">
          <div className="flex flex-col items-center mb-6">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-slate-700 dark:text-slate-200 text-center">Verify your email</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
              We sent a 6-digit code to <span className="text-slate-700 dark:text-slate-200">{registeredEmail}</span>
            </p>
          </div>

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

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.3em] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Verify & Continue</span>
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending...' : "Didn't get a code? Resend"}
            </button>
            <button
              onClick={() => {
                setAuthStep('form');
                setError(null);
                setSuccess(null);
              }}
              className="text-xs text-slate-400 dark:text-slate-500 hover:underline cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
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

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          StudyVault AI is under active development — some features may change or behave unexpectedly.
        </p>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading, isSlowConnection } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-slate-100 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        {isSlowConnection && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-6">
            Waking up the server — this can take up to a minute on first load.
          </p>
        )}
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