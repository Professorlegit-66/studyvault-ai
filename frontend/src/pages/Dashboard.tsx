import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, FileText, MessageSquare, Brain } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">StudyVault AI</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Welcome, <strong className="text-slate-200">{user?.name}</strong>
          </span>
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Placeholder */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Academic Knowledge Vault</h1>
          <p className="text-slate-400">
            Upload course materials, generate summaries, and interact with your AI study assistant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Documents Vault</h3>
            <p className="text-sm text-slate-400">
              Upload PDF lecture slides, syllabus documents, and textbooks.
            </p>
            <span className="mt-auto text-xs font-medium text-slate-500">Coming in Task 4B</span>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">AI Tutor Chat</h3>
            <p className="text-sm text-slate-400">
              Ask questions grounded strictly in your uploaded study material.
            </p>
            <span className="mt-auto text-xs font-medium text-slate-500">Queued Feature</span>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Student Memory</h3>
            <p className="text-sm text-slate-400">
              Personalized concept tracking and revision history.
            </p>
            <span className="mt-auto text-xs font-medium text-slate-500">Queued Feature</span>
          </div>
        </div>
      </main>
    </div>
  );
};