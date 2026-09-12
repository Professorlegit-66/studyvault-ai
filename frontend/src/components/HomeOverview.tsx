import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { BookOpen, Brain, Award, TrendingUp, ArrowRight } from 'lucide-react';

interface HomeOverviewProps {
  userName: string;
  documentCount: number;
  onNavigate: (tab: string) => void;
}

interface AnalyticsData {
  documents_count: number;
  total_flashcards: number;
  due_flashcards: number;
  average_ease_factor: number;
  retention_score: number;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ userName, onNavigate }) => {
  const [stats, setStats] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiClient.get<AnalyticsData>('/analytics/summary');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here is a summary of your study progress and active recall retention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">Vault</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4">{stats?.documents_count ?? 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Uploaded Documents</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Memory</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4">{stats?.total_flashcards ?? 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Flashcards</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">Due</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4">{stats?.due_flashcards ?? 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cards Due for Review</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">Score</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4">{stats?.retention_score ?? 100}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Estimated Retention</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Ready to boost your memory?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-lg">
            You have {stats?.due_flashcards ?? 0} flashcards waiting for review today. Keep your streak alive!
          </p>
        </div>
        <button
          onClick={() => onNavigate('memory')}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <span>Start Reviewing</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};