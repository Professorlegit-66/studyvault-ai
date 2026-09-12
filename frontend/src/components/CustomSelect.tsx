import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  icon?: React.ReactNode;
  className?: string;
}

// Replaces native <select> elements, whose expanded option list is rendered
// by the browser/OS rather than by our CSS - this caused the same dropdown
// to look themed correctly in one browser and show a plain white list in
// another. This component renders the whole list ourselves, so it always
// matches the app's dark theme regardless of browser or OS settings.
export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, icon, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
          {icon}
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center gap-2 ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 cursor-pointer text-left transition-colors ${
          isOpen ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <span className="flex-1 truncate">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                opt.value === value
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};