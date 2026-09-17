import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';

const OPTIONS: { mode: ThemeMode; icon: React.ElementType; label: string; activeColor: string }[] = [
  { mode: 'system', icon: Monitor, label: 'Use system setting', activeColor: 'text-emerald-500 dark:text-emerald-400' },
  { mode: 'light', icon: Sun, label: 'Light mode', activeColor: 'text-amber-500' },
  { mode: 'dark', icon: Moon, label: 'Dark mode', activeColor: 'text-indigo-500 dark:text-indigo-400' },
];

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`inline-flex items-center gap-0.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-full border border-slate-300 dark:border-slate-800 shadow-sm ${className}`}
    >
      {OPTIONS.map(({ mode, icon: Icon, label, activeColor }) => {
        const isActive = themeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setThemeMode(mode)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
              isActive
                ? `bg-white dark:bg-slate-800 shadow-sm ${activeColor}`
                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};