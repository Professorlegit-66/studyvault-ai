// File: frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import logo from '../assets/studyvault-main-logo.png';
import { apiClient } from '../api/client';
import { HomeOverview } from '../components/HomeOverview';
import { DocumentManager } from '../components/DocumentManager';
import type { Document } from '../components/DocumentManager';
import { StudentMemory } from '../components/StudentMemory';
import { AITutorChat } from '../components/AITutorChat';
import type { Message } from '../components/AITutorChat';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import HelpAssistant from '../components/HelpAssistant';
import { AICompanion } from '../components/AICompanion';
import { SecurityWarningBanner } from '../components/SecurityWarningBanner';

// Importing the individual tab icons
import overviewIcon from '../assets/overview-tab-icon.png';
import documentsVaultIcon from '../assets/documents-vault-tab-icon.png';
import aiTutorIcon from '../assets/ai-tutor-tab-icon.png';
import aiCompanionIcon from '../assets/ai-companion-tab-icon.png';
import memoryIcon from '../assets/memory-tab-icon.png';

interface DashboardProps {
  onOpenProfile?: () => void;
}

// Reusable component for the glowing sidebar icons
const SidebarIcon = ({ src, isActive }: { src: string; isActive: boolean }) => (
  <div 
    className={`w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-[#071d49] shadow-[0_0_8px_rgba(255,255,255,0.7)] dark:shadow-[0_0_8px_rgba(255,255,255,0.25)] transition-transform duration-300 pointer-events-none select-none ${
      isActive ? 'scale-110' : 'group-hover:scale-105'
    }`}
  >
    <img src={src} alt="Tab Icon" className="w-full h-full object-cover scale-[1.25]" />
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProfile }) => {
  const { user, logout } = useAuth() as { user: { name?: string; username?: string; email?: string } | null; logout: () => void };
  
  const [activeTab, setActiveTab] = useState<'home' | 'documents' | 'memory' | 'chat' | 'companion'>(() => {
    const savedTab = localStorage.getItem('studyvault_active_tab');
    return (savedTab as any) || 'home';
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('studyvault_tutor_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('studyvault_tutor_messages', JSON.stringify(messages));
    }
  }, [messages]);

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
    localStorage.setItem('studyvault_active_tab', tab);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Student';

  const labelClass = (open: boolean) =>
    `truncate overflow-hidden whitespace-nowrap transition-all duration-300 ${
      open ? 'max-w-[12rem] opacity-100' : 'max-w-0 opacity-0'
    }`;

  const isChatTab = activeTab === 'chat' || activeTab === 'companion';

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 overflow-hidden">
      
      <style>{`
        @keyframes tab-enter {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-tab-enter {
          animation: tab-enter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
      
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
          <div className={`flex items-center w-full cursor-default select-none ${isSidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 pointer-events-none" />
            </button>

            <div
              className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${
                isSidebarOpen ? 'max-w-[14rem] opacity-100 flex-1' : 'max-w-0 opacity-0'
              }`}
            >
              {/* Expanded logo container with radial gradient mask and white glowing aura */}
              <div className="shrink-0 w-11 h-11 flex items-center justify-center pointer-events-none select-none">
                <img
                  src={logo}
                  alt="StudyVault AI Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                  style={{
                    WebkitMaskImage: 'radial-gradient(circle, black 56%, transparent 86%)',
                    maskImage: 'radial-gradient(circle, black 56%, transparent 86%)',
                  }}
                />
              </div>

              <div className="min-w-0 flex-1 pointer-events-none select-none">
                <span className="font-bold text-base tracking-tight truncate block text-slate-900 dark:text-slate-50">
                  StudyVault AI
                </span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md leading-none">
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
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            )}
          </div>

          <nav className={`space-y-1.5 w-full overflow-hidden ${!isSidebarOpen ? 'md:flex md:flex-col md:items-center' : ''}`}>
            <button
              onClick={() => selectTab('home')}
              className={`group w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <SidebarIcon src={overviewIcon} isActive={activeTab === 'home'} />
              <span className={labelClass(isSidebarOpen)}>Overview</span>
            </button>

            <button
              onClick={() => selectTab('documents')}
              className={`group w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <SidebarIcon src={documentsVaultIcon} isActive={activeTab === 'documents'} />
              <span className={labelClass(isSidebarOpen)}>Documents Vault</span>
            </button>

            <button
              onClick={() => selectTab('chat')}
              className={`group w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <SidebarIcon src={aiTutorIcon} isActive={activeTab === 'chat'} />
              <span className={labelClass(isSidebarOpen)}>AI Tutor Chat</span>
            </button>

            <button
              onClick={() => selectTab('companion')}
              className={`group w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'companion' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <SidebarIcon src={aiCompanionIcon} isActive={activeTab === 'companion'} />
              <span className={labelClass(isSidebarOpen)}>AI Companion</span>
            </button>

            <button
              onClick={() => selectTab('memory')}
              className={`group w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'memory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
            >
              <SidebarIcon src={memoryIcon} isActive={activeTab === 'memory'} />
              <span className={labelClass(isSidebarOpen)}>Student Memory</span>
            </button>
          </nav>
        </div>

        <button
          onClick={logout}
          className={`w-full flex items-center ${isSidebarOpen ? 'gap-3' : 'gap-0'} px-3.5 py-2.5 rounded-xl font-medium text-sm text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0 pointer-events-none" />
          <span className={labelClass(isSidebarOpen)}>Sign Out</span>
        </button>
      </aside>

      <main className="flex-1 w-full min-w-0 h-full flex flex-col relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        
        <div className="w-full px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-10 pb-6 shrink-0 z-10 bg-slate-50 dark:bg-slate-950">
          <div className="w-full flex items-center justify-between gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer md:hidden shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-4 ml-auto -mt-5">
              <HelpAssistant />
              <ThemeToggle />

              <button
                onClick={onOpenProfile}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-nowrap"
              >
                Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 min-h-0 w-full px-4 sm:px-6 md:px-10 pb-4 sm:pb-6 md:pb-10 ${isChatTab ? 'overflow-hidden' : 'overflow-x-hidden overflow-y-auto custom-scrollbar'}`}>
          <div className="w-full max-w-7xl mx-auto flex flex-col h-full min-h-0 relative">
            
            <div className={`flex-col flex-1 min-h-0 w-full ${activeTab === 'home' ? 'flex animate-tab-enter' : 'hidden'}`}>
              <HomeOverview isActive={activeTab === 'home'} userName={displayName} documentCount={documents.length} onNavigate={(tab) => setActiveTab(tab as any)} />
            </div>

            <div className={`flex-col flex-1 min-h-0 w-full ${activeTab === 'documents' ? 'flex animate-tab-enter' : 'hidden'}`}>
              <DocumentManager documents={documents} onDocumentsChange={fetchDocuments} />
            </div>

            <div className={`flex-col flex-1 min-h-0 w-full ${activeTab === 'chat' ? 'flex animate-tab-enter' : 'hidden'}`}>
              <AITutorChat documents={documents} messages={messages} setMessages={setMessages} />
            </div>

            <div className={`flex-col flex-1 min-h-0 w-full ${activeTab === 'companion' ? 'flex animate-tab-enter' : 'hidden'}`}>
              <AICompanion isActive={activeTab === 'companion'} />
            </div>

            <div className={`flex-col flex-1 min-h-0 w-full ${activeTab === 'memory' ? 'flex animate-tab-enter' : 'hidden'}`}>
              <StudentMemory isActive={activeTab === 'memory'} />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};