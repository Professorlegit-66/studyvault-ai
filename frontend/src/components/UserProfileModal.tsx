import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { FileText, Brain, X, Shield, Edit3, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  userEmail?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, username, userEmail }) => {
  const { updateUser } = useAuth();
  const [stats, setStats] = useState({ document_count: 0, flashcard_count: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(username || '');
  const [email, setEmail] = useState(userEmail || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- Email-change verification (PUT /me stages the new address; it
  // isn't live until confirmed here via POST /auth/confirm-email-change) ---
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(username || '');
      setEmail(userEmail || '');
      setPassword('');
      setIsEditing(false);
      setSuccess(false);
      setPendingEmail(null);
      setOtpCode('');
      setConfirmError('');
      setResendMessage('');
      fetchUserStats();
    }
  }, [isOpen, username, userEmail]);

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const [docsRes, memoryRes] = await Promise.all([
        apiClient.get('/documents/'),
        apiClient.get('/memory/due')
      ]);
      setStats({
        document_count: Array.isArray(docsRes.data) ? docsRes.data.length : 0,
        flashcard_count: Array.isArray(memoryRes.data) ? memoryRes.data.length : 0,
      });
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { name, email };
      if (password.trim() !== '') {
        payload.password = password;
      }

      const res = await apiClient.put('/auth/me', payload);

      // Name/password land immediately. Email does NOT - if it changed,
      // the backend leaves user.email untouched and stages the new address
      // in pending_email until the OTP sent to it is confirmed.
      updateUser({ name: res.data.name, email: res.data.email });

      if (res.data.pending_email) {
        setPendingEmail(res.data.pending_email);
        setOtpCode('');
        setConfirmError('');
      } else {
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
      setPassword('');
    } catch (err: any) {
      console.error('Failed to update profile', err);
      alert(err.response?.data?.detail || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await apiClient.post('/auth/confirm-email-change', { code: otpCode.trim() });
      updateUser({ name: res.data.name, email: res.data.email });
      setEmail(res.data.email);
      setPendingEmail(null);
      setOtpCode('');
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setConfirmError(err.response?.data?.detail || 'Failed to confirm email change.');
    } finally {
      setConfirming(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingEmail) return;
    setResending(true);
    setResendMessage('');
    setConfirmError('');
    try {
      const res = await apiClient.put('/auth/me', { email: pendingEmail });
      setPendingEmail(res.data.pending_email || pendingEmail);
      setResendMessage('A new code has been sent.');
      setTimeout(() => setResendMessage(''), 4000);
    } catch (err: any) {
      setConfirmError(err.response?.data?.detail || 'Failed to resend the code.');
    } finally {
      setResending(false);
    }
  };

  // Backs out of the OTP step locally. Note: the backend's pending_email
  // stays set until either confirmed or overwritten by a fresh PUT /me -
  // there's no cancel endpoint yet, so re-editing and resubmitting the
  // original email would be needed to fully clear it server-side.
  const handleCancelEmailChange = () => {
    setPendingEmail(null);
    setOtpCode('');
    setConfirmError('');
    setEmail(userEmail || '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600/10 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> StudyVault Active Account
              </p>
            </div>
          </div>
          {!isEditing && !pendingEmail && (
            <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-100 dark:bg-slate-900 text-indigo-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer" title="Edit Profile">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}

        {pendingEmail ? (
          <form onSubmit={handleConfirmEmailChange} className="space-y-4">
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-xl flex items-start gap-2 text-indigo-500 dark:text-indigo-300 text-xs font-medium">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <span>We sent a verification code to <strong>{pendingEmail}</strong>. Enter it below to finish changing your email.</span>
            </div>

            {confirmError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 dark:text-red-400 text-xs font-medium">
                {confirmError}
              </div>
            )}
            {resendMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 text-xs font-medium">
                {resendMessage}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                placeholder="6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="text-xs font-medium text-indigo-500 hover:text-indigo-400 cursor-pointer disabled:opacity-50"
            >
              {resending ? 'Sending...' : "Didn't get a code? Resend"}
            </button>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleCancelEmailChange} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={confirming || otpCode.trim().length === 0} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Email
              </button>
            </div>
          </form>
        ) : isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              {email !== userEmail && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Changing your email will require verifying the new address with a code.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">New Password (leave blank to keep current)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-lg"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Documents</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.document_count}</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><Brain className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Flashcards</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.flashcard_count}</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer">
          Close Profile
        </button>
      </div>
    </div>
  );
};