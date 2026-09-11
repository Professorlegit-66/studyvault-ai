import React from 'react';
import { 
  Flame, 
  TrendingUp, 
  CheckSquare, 
  Square, 
  ArrowRight,
  Search
} from 'lucide-react';

interface HomeOverviewProps {
  userName: string;
  documentCount: number;
  onNavigate: (tab: string) => void;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  userName,
  documentCount,
  onNavigate,
}) => {
  const studyTasks = [
    {
      id: 1,
      title: 'Upload your first lecture note or syllabus',
      desc: 'Add a PDF or TXT file to your vault to generate AI embeddings.',
      completed: documentCount > 0,
      action: () => onNavigate('documents'),
      actionLabel: 'Vault Documents',
    },
    {
      id: 2,
      title: 'Ask the AI Tutor a question',
      desc: 'Query your documents to get instant concept explanations.',
      completed: false,
      action: () => onNavigate('chat'),
      actionLabel: 'AI Tutor Chat',
    },
    {
      id: 3,
      title: 'Review personalized weak topics',
      desc: 'Track concepts you struggled with during previous chat sessions.',
      completed: false,
      action: () => onNavigate('memory'),
      actionLabel: 'Student Memory',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Search Header Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search study materials, concepts, or past questions..."
          className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm dark:shadow-inner"
        />
      </div>

      {/* Hero Welcome & Stats Metrics Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome, {userName}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            You're making great progress. Ready to jump back into your study vault?
          </p>
        </div>

        {/* Metric Cards */}
        <div className="flex items-center gap-6 self-start lg:self-auto">
          {/* Study Streak */}
          <div className="text-center px-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">
              STUDY STREAK
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">7</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">days active</span>
          </div>

          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Mastery Progress Radial Widget */}
          <div className="text-center px-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1">
              VAULT MASTERY
            </span>
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-slate-200 dark:text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - 0.65)}
                  className="text-indigo-600 dark:text-indigo-500"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-slate-900 dark:text-slate-100">65%</span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Weekly Activity Heat Dots */}
          <div className="text-center px-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-2">
              WEEKLY ACTIVITY
            </span>
            <div className="flex gap-1.5 items-center justify-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-medium">{day}</span>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      idx < 5 ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Items List Section */}
      <div>
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Next Steps</span>
        </div>

        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl divide-y divide-slate-100 dark:divide-slate-700/50 shadow-md dark:shadow-xl transition-colors duration-300">
          {studyTasks.map((task) => (
            <div
              key={task.id}
              className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {task.completed ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      task.completed
                        ? 'text-slate-400 dark:text-slate-500 line-through'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {task.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.desc}</p>
                </div>
              </div>

              <button
                onClick={task.action}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors shrink-0 pt-1 cursor-pointer"
              >
                <span>{task.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};