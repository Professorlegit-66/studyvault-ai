import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Sidebar } from '../components/Sidebar';
import { HomeOverview } from '../components/HomeOverview';
import { DocumentManager } from '../components/DocumentManager';
import type { Document } from '../components/DocumentManager';
import { AITutorChat } from '../components/AITutorChat';
import type { Message } from '../components/AITutorChat';
import { StudentMemory } from '../components/StudentMemory';
import { ThemeToggle } from '../components/ThemeToggle';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'studyvault_chat_history';

export const Dashboard: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

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
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.name || user.full_name || 'Student';

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
              Welcome, <strong className="text-slate-800 dark:text-slate-200">{displayName}</strong>
            </span>
          </div>
        </header>

        <main className="p-8 max-w-5xl mx-auto w-full">
          {/* Home Overview Tab */}
          <div className={activeTab === 'home' ? 'block' : 'hidden'}>
            <HomeOverview
              userName={displayName}
              documentCount={documents.length}
              onNavigate={setActiveTab}
            />
          </div>

          {/* Vault Documents Tab */}
          <div className={activeTab === 'documents' ? 'block' : 'hidden'}>
            <DocumentManager documents={documents} onDocumentsChange={fetchDocuments} />
          </div>

          {/* AI Tutor Chat Tab */}
          <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
            <AITutorChat
              documents={documents}
              messages={messages}
              setMessages={setMessages}
            />
          </div>

          {/* Student Memory Tab */}
          <div className={activeTab === 'memory' ? 'block' : 'hidden'}>
            <StudentMemory />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;