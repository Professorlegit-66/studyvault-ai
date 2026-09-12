import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Brain, FileText, Sparkles, ArrowRight, Flame, Activity, Clock } from 'lucide-react';

interface HomeOverviewProps {
  userName: string;
  documentCount: number;
  onNavigate: (tab: 'home' | 'documents' | 'memory' | 'chat') => void;
}

interface ActivityItem {
  id: number;
  title: string;
  type: string;
  created_at?: string;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ userName, documentCount, onNavigate }) => {
  const [recentDocs, setRecentDocs] = useState<ActivityItem[]>([]);
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [docsRes, memoryRes] = await Promise.all([
          apiClient.get('/documents/'),
          apiClient.get('/memory/due')
        ]);
        if (Array.isArray(docsRes.data)) {
          setRecentDocs(docsRes.data.slice(0, 5));
        }
        if (Array.isArray(memoryRes.data)) {
          setCardCount(memoryRes.data.length);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      }
    };
    fetchOverviewData();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Welcome back, {userName}! 👋
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here is a summary of your study progress and active recall retention.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-indigo-500">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/10 rounded-full">Vault</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{documentCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Uploaded Documents</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-emerald-500">
            <Brain className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 rounded-full">Memory</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{cardCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cards Due for Review</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <Flame className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 rounded-full">Streak</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">5 Days</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Study Streak</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-rose-500">
            <Activity className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-rose-500/10 rounded-full">Retention</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">85%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Estimated Mastery</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-bold">Ready to boost your memory?</h3>
          <p className="text-indigo-100 text-sm max-w-md">
            You have {cardCount} flashcards waiting for review today. Keep your streak alive!
          </p>
        </div>
        <button
          onClick={() => onNavigate('memory')}
          className="px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-sm rounded-xl transition-colors shadow-lg cursor-pointer flex items-center gap-2 shrink-0"
        >
          <span>Start Reviewing</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" /> Recent Document Activity
        </h3>
        {recentDocs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No recent documents uploaded yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Added {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('documents')}
                  className="text-xs font-semibold text-indigo-500 hover:underline cursor-pointer"
                >
                  View Vault
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};