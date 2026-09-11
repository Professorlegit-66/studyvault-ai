import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Sidebar } from '../components/Sidebar';
import { HomeOverview } from '../components/HomeOverview';
import { DocumentManager } from '../components/DocumentManager';
import type { Document } from '../components/DocumentManager';
import { AITutorChat } from '../components/AITutorChat';
import type { Message } from '../components/AITutorChat';
import { ThemeToggle } from '../components/ThemeToggle';
import { Brain } from 'lucide-react';

const STORAGE_KEY = 'studyvault_chat_history';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Load initial chat messages from localStorage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      {
        sender: 'ai',
        text: 'Hello! Ask me anything grounded in your uploaded documents.',
      },
    ];
  });

  // Sync chat messages to localStorage whenever they update
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get<Document[]>('/documents/');
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded((prev) => !prev)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 capitalize">
            {activeTab === 'home' && 'Home Dashboard'}
            {activeTab === 'chat' && 'AI Tutor Chat'}
            {activeTab === 'documents' && 'Documents Vault'}
            {activeTab === 'memory' && 'Student Memory'}
          </h2>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Welcome, <strong className="text-slate-800 dark:text-slate-200">{user?.name}</strong>
            </span>
          </div>
        </header>

        <main className="p-8 max-w-5xl mx-auto w-full">
          {/* Home Overview Tab */}
          <div className={activeTab === 'home' ? 'block' : 'hidden'}>
            <HomeOverview
              userName={user?.name || 'Student'}
              documentCount={documents.length}
              onNavigate={setActiveTab}
            />
          </div>

          {/* Vault Documents Tab */}
          <div className={activeTab === 'documents' ? 'block' : 'hidden'}>
            <DocumentManager documents={documents} onDocumentsChange={fetchDocuments} />
          </div>

          {/* AI Tutor Chat Tab (Kept mounted continuously) */}
          <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
            <AITutorChat
              documents={documents}
              messages={messages}
              setMessages={setMessages}
            />
          </div>

          {/* Student Memory Tab */}
          <div className={activeTab === 'memory' ? 'block' : 'hidden'}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 h-[400px]">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <Brain className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Student Memory</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Personalized concept tracking and revision history module.
              </p>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50">
                Queued Feature
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};