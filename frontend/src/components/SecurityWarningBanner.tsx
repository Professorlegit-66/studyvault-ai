import React, { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const AUTO_DISMISS_MS = 10000;

// Same backdrop + card shell as ConfirmDialog, so every popup in the app
// (delete confirmations, this warning) shares one consistent visual
// language instead of some being modals and others floating banners.
export const SecurityWarningBanner: React.FC = () => {
  const { user, justLoggedIn, acknowledgeJustLoggedIn, updateUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (justLoggedIn && user && !user.hide_security_warning) {
      setVisible(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justLoggedIn, user]);

  const handleDismiss = async () => {
    setVisible(false);
    acknowledgeJustLoggedIn();

    if (dontShowAgain) {
      try {
        await apiClient.put('/auth/me', { hide_security_warning: true });
        updateUser({ hide_security_warning: true });
      } catch (err) {
        console.error('Failed to save "don\'t show again" preference', err);
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 relative">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss warning"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Before you get started</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Please avoid uploading sensitive personal information (IDs, financial
              details, medical records, or similar) to StudyVault AI.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none pl-[3.25rem]">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span>Don't show this again</span>
        </label>
      </div>
    </div>
  );
};