import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { HomeOverview } from '../components/HomeOverview';
import { DocumentManager } from '../components/DocumentManager';
import type { Document } from '../components/DocumentManager';
import { StudentMemory } from '../components/StudentMemory';
import { AITutorChat } from '../components/AITutorChat';
import type { Message } from '../components/AITutorChat';
import { LayoutDashboard, FileText, Brain, MessageSquare, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HelpAssistant from '../components/HelpAssistant';

interface DashboardProps {
  onOpenProfile?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProfile }) => {
  const { user, logout } = useAuth() as { user: { name?: string; username?: string; email?: string } | null; logout: () => void };
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'home' | 'documents' | 'memory' | 'chat'>('home');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // Directly evaluate user name properties reactively
  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className={`border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between bg-white dark:bg-slate-950 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20 items-center px-3'}`}>
        <div className={`space-y-8 w-full overflow-hidden ${!isSidebarOpen ? 'flex flex-col items-center' : ''}`}>
          <div className={`flex items-center w-full ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {isSidebarOpen && (
              <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30 shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight truncate">StudyVault AI</span>
              </div>
            )}
          </div>

          <nav className={`space-y-1.5 w-full overflow-hidden ${!isSidebarOpen ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
              title="Overview"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">Overview</span>}
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
              title="Documents Vault"
            >
              <FileText className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">Documents Vault</span>}
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
              title="AI Tutor Chat"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">AI Tutor Chat</span>}
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${
                activeTab === 'memory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
              title="Student Memory"
            >
              <Brain className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">Student Memory</span>}
            </button>
          </nav>
        </div>

        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer overflow-hidden whitespace-nowrap ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isSidebarOpen && <span className="truncate">Sign Out</span>}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-center justify-end gap-4 mb-6">
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="relative flex items-center w-16 h-8 p-1 bg-slate-200 dark:bg-slate-900 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border border-slate-300 dark:border-slate-800"
          >
            <div
              className={`flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-md transform transition-transform duration-300 ${
                isDarkMode ? 'translate-x-8 text-slate-200' : 'translate-x-0 text-amber-500'
              }`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </div>
            <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none text-slate-400 dark:text-slate-600">
              <Sun className="w-3.5 h-3.5" />
              <Moon className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={onOpenProfile}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800"
            title="View Profile & Statistics"
          >
            Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto">
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

          {activeTab === 'memory' && <StudentMemory />}
        </div>
      </main>

      <HelpAssistant />
    </div>
  );
};