import React from 'react';
import { Menu, Compass, FileText, Bot, Brain, Plus, LogOut, BookOpen } from 'lucide-react';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isExpanded,
  onToggle,
  activeTab,
  onSelectTab,
  onLogout,
}) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Compass },
    { id: 'documents', label: 'Vault Documents', icon: FileText },
    { id: 'chat', label: 'AI Tutor Chat', icon: Bot },
    { id: 'memory', label: 'Student Memory', icon: Brain },
  ];

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex flex-col gap-6">
        {/* Toggle & Brand Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {isExpanded && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="p-1.5 bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                StudyVault AI
              </span>
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <button
          onClick={() => onSelectTab('documents')}
          className={`flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all ${
            isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
          }`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {isExpanded && <span className="text-sm">Upload File</span>}
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3.5 rounded-xl transition-colors relative ${
                  isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
                } ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute right-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-l-full" />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                {isExpanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3.5 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors ${
            isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};