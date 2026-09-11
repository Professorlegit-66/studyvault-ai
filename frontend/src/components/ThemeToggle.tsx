import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark/light mode"
      className="relative flex items-center bg-slate-300 dark:bg-slate-800 w-16 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none border border-slate-400/40 dark:border-slate-700/60 shadow-inner cursor-pointer"
    >
      {/* Sliding Pill Background */}
      <div
        className={`absolute top-1 bottom-1 w-7 bg-white dark:bg-slate-900 rounded-full shadow-md transition-transform duration-300 transform ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      />

      {/* Sun Icon (Left) */}
      <div className="z-10 flex-1 flex items-center justify-center">
        <Sun
          className={`w-4 h-4 transition-colors duration-300 ${
            !isDark ? 'text-amber-500 font-bold' : 'text-slate-500'
          }`}
        />
      </div>

      {/* Moon Icon (Right) */}
      <div className="z-10 flex-1 flex items-center justify-center">
        <Moon
          className={`w-4 h-4 transition-colors duration-300 ${
            isDark ? 'text-indigo-400 font-bold' : 'text-slate-500'
          }`}
        />
      </div>
    </button>
  );
};