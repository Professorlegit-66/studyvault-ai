import React, { useState, useEffect } from 'react';
import logo from '../assets/studyvault-logo.png';
import { apiClient } from '../api/client';
import { HomeOverview } from '../components/HomeOverview';
import { DocumentManager } from '../components/DocumentManager';
import type { Document } from '../components/DocumentManager';
import { StudentMemory } from '../components/StudentMemory';
import { AITutorChat } from '../components/AITutorChat';
import type { Message } from '../components/AITutorChat';
import { LayoutDashboard, FileText, Brain, MessageSquare, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import HelpAssistant from '../components/HelpAssistant';
import { AICompanion } from '../components/AICompanion';
import { SecurityWarningBanner } from '../components/SecurityWarningBanner';

interface DashboardProps {
  onOpenProfile?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProfile }) => {
  const { user, logout } = useAuth() as { user: { name?: string; username?: string; email?: string } | null; logout: () => void };
  const [activeTab, setActiveTab] = useState<'home' | 'documents' | 'memory' | 'chat' | 'companion'>('home');
  const [documents, setDocuments] = useState<Document[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Tutor. Ask me anything about your uploaded study documents or notes!',
    },
  ]);

  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get<Document[]>('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Student';

  const labelClass = (open: boolean) =>
    `truncate overflow-hidden whitespace-nowrap transition-all duration-300 ${
      open ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
    }`;

  const isChatTab = activeTab === 'chat' || activeTab === 'companion';

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 overflow-hidden">
      <SecurityWarningBanner />

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-30 flex-shrink-0
          border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between
          bg-white dark:bg-slate-950 transition-all duration-300
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 md:w-20 -translate-x-full md:translate-x-0'}
          ${!isSidebarOpen ? 'md:items-center md:px-3' : ''}
        `}
      >
        <div className={`space-y-8 w-full overflow-hidden ${!isSidebarOpen ? 'md:flex md:flex-col md:items-center' : ''}`}>
          <div className={`flex items-center w-full gap-2 ${!isSidebarOpen ? 'md:justify-center' : ''}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${
                isSidebarOpen ? 'max-w-[200px] opacity-100 flex-1' : 'max-w-0 opacity-0'
              }`}
            >
              <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-transparent flex items-center justify-center">
                <img
                  src={logo}
                  alt="StudyVault AI Logo"
                  className="w-full h-full object-cover object-left scale-125 origin-left"
                />
              </div>

              <div className="min-w-0 flex-1">
                <span className="font-bold text-[16px] tracking-tight truncate block text-slate-900 dark:text-slate-50">
                  StudyVault AI
                </span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md leading-none">
                  Beta
                </span>
              </div>
            </div>

            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shrink-0 md:hidden"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className={`space-y-1.5 w-full overflow-hidden ${!isSidebarOpen ? 'md:flex md:flex-col md:items-center' : ''}`}>
            <button
              onClick={() => selectTab('home')}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
              title="Overview"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className={labelClass(isSidebarOpen)}>Overview</span>
            </button>

            <button
              onClick={() => selectTab('documents')}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
              title="Documents Vault"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className={labelClass(isSidebarOpen)}>Documents Vault</span>
            </button>

            <button
              onClick={() => selectTab('chat')}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
              title="AI Tutor Chat"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className={labelClass(isSidebarOpen)}>AI Tutor Chat</span>
            </button>

            <button
              onClick={() => selectTab('companion')}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'companion' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
                title="AI Companion"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className={labelClass(isSidebarOpen)}>AI Companion</span>
            </button>

            <button
              onClick={() => selectTab('memory')}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'memory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
              title="Student Memory"
            >
              <Brain className="w-4 h-4 shrink-0" />
              <span className={labelClass(isSidebarOpen)}>Student Memory</span>
            </button>
          </nav>
        </div>

        <button
          onClick={logout}
          className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-4 py-3 rounded-xl font-medium text-sm text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className={labelClass(isSidebarOpen)}>Sign Out</span>
        </button>
      </aside>

      <main className={`flex-1 w-full min-w-0 h-full flex flex-col p-4 sm:p-6 md:p-10 transition-all duration-300 ${isChatTab ? 'overflow-hidden' : 'overflow-x-hidden overflow-y-auto custom-scrollbar'}`}>
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 mb-6 shrink-0">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer md:hidden"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-4 ml-auto">
            <HelpAssistant />
            <ThemeToggle />

            <button
              onClick={onOpenProfile}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-nowrap"
              title="View Profile & Statistics"
            >
              Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
            </button>
          </div>
        </div>

        <div key={activeTab} className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col animate-fade-slide-in">
          {activeTab === 'home' && (
            <HomeOverview
              userName={displayName}
              documentCount={documents.length}
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentManager documents={documents} onDocumentsChange={fetchDocuments} />
          )}

          {activeTab === 'chat' && (
            <AITutorChat documents={documents} messages={messages} setMessages={setMessages} />
          )}

          {activeTab === 'companion' && <AICompanion />}

          {activeTab === 'memory' && <StudentMemory />}
        </div>
      </main>
    </div>
  );
};