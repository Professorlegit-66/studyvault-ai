import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Brain, FileText, ArrowRight, Flame, Activity, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface HomeOverviewProps {
  userName: string;
  documentCount: number;
  onNavigate: (tab: 'home' | 'documents' | 'memory' | 'chat' | 'companion') => void;
}

interface ActivityItem {
  id: number;
  title: string;
  type: string;
  created_at?: string;
}

interface HeatmapDay {
  date: string;
  count: number;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ userName, documentCount, onNavigate }) => {
  const [recentDocs, setRecentDocs] = useState<ActivityItem[]>([]);
  const [cardCount, setCardCount] = useState(0);
  const [masteryPercent, setMasteryPercent] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [totalContributions, setTotalContributions] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const availableYears = [2026, 2025];

  const fetchOverviewData = async () => {
    try {
      const [docsRes, memoryRes, analyticsRes] = await Promise.all([
        apiClient.get('/documents'),
        apiClient.get('/memory/due'),
        apiClient.get('/analytics/summary')
      ]);
      if (Array.isArray(docsRes.data)) {
        setRecentDocs(docsRes.data.slice(0, 5));
      }
      if (Array.isArray(memoryRes.data)) {
        setCardCount(memoryRes.data.length);
      }
      if (analyticsRes.data) {
        if (typeof analyticsRes.data.retention_score === 'number') {
          setMasteryPercent(analyticsRes.data.retention_score);
        }
        if (typeof analyticsRes.data.current_streak === 'number') {
          setStreakDays(analyticsRes.data.current_streak);
        }
        const realHeatmap = Array.isArray(analyticsRes.data.heatmap) ? analyticsRes.data.heatmap : [];
        buildYearHeatmap(selectedYear, realHeatmap);
      } else {
        buildYearHeatmap(selectedYear, []);
      }
    } catch (err) {
      console.error('Failed to load overview data', err);
      buildYearHeatmap(selectedYear, []);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [selectedYear]);

  const buildYearHeatmap = (year: number, realData: HeatmapDay[]) => {
    const daysMap = new Map<string, number>();
    let yearTotal = 0;
    realData.forEach(item => {
      daysMap.set(item.date, item.count);
      if (item.date.startsWith(year.toString())) {
        yearTotal += item.count;
      }
    });
    setTotalContributions(yearTotal);

    const days: HeatmapDay[] = [];
    const startDate = new Date(year, 0, 1);
    const startDay = startDate.getDay();
    const diffToMon = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + diffToMon);

    const isCurrentYear = year === new Date().getFullYear();
    const endDate = isCurrentYear ? new Date() : new Date(year, 11, 31);

    let curr = new Date(startDate);
    while (curr <= endDate) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const count = y === year ? (daysMap.get(dateStr) || 0) : 0;
      days.push({ date: dateStr, count });
      curr.setDate(curr.getDate() + 1);
    }
    setHeatmapData(days);
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60';
    if (count <= 2) return 'bg-indigo-300 dark:bg-indigo-700 border border-indigo-400 dark:border-indigo-600/50';
    if (count <= 4) return 'bg-indigo-500 dark:bg-indigo-500 border border-indigo-600 dark:border-indigo-400/50';
    return 'bg-indigo-700 dark:bg-indigo-400 border border-indigo-800 dark:border-indigo-300 shadow-xs shadow-indigo-400/30';
  };

  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, idx) => {
    if (week.length > 0) {
      const validDay = week.find(d => new Date(d.date).getFullYear() === selectedYear) || week[0];
      const d = new Date(validDay.date);
      const m = d.getMonth();
      if (m !== lastMonth && d.getFullYear() === selectedYear) {
        monthLabels.push({
          label: d.toLocaleString('default', { month: 'short' }),
          weekIndex: idx
        });
        lastMonth = m;
      }
    }
  });

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
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {streakDays !== null ? `${streakDays} ${streakDays === 1 ? 'Day' : 'Days'}` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Study Streak</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-rose-500">
            <Activity className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 bg-rose-500/10 rounded-full">Retention</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {masteryPercent !== null ? `${masteryPercent}%` : '—'}
          </p>
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

      {/* Heatmap Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-indigo-500" /> {totalContributions} reviews in {selectedYear}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active recall consistency and review history</p>
          </div>
          
          <div className="flex items-center gap-1.5">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedYear === year
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto custom-scrollbar">
          <div className="flex flex-col gap-1.5 py-1 w-fit">
            <div className="flex text-[10px] text-slate-400 dark:text-slate-500 font-medium pl-7 relative h-3.5">
              {monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `${m.weekIndex * 16 + 28}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium pr-1 py-0.5 h-[102px]">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>

              <div className="flex gap-1">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`w-3 h-3 rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${getHeatmapColor(day.count)}`}
                        title={`${day.date}: ${day.count} review(s)`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="text-[11px]">{totalContributions} total review actions recorded</span>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60" />
              <div className="w-3 h-3 rounded-[3px] bg-indigo-300 dark:bg-indigo-700" />
              <div className="w-3 h-3 rounded-[3px] bg-indigo-500 dark:bg-indigo-500" />
              <div className="w-3 h-3 rounded-[3px] bg-indigo-700 dark:bg-indigo-400" />
            </div>
            <span>More</span>
          </div>
        </div>
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};