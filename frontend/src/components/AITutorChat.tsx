// src/components/AITutorChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../api/client';
import type { Document } from './DocumentManager';
import { Send, Bot, User, Loader2, Sparkles, BookOpen, Filter, Check, ChevronDown, Layers, FileText } from 'lucide-react';

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

interface AITutorChatProps {
  documents: Document[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const AITutorChat: React.FC<AITutorChatProps> = ({
  documents,
  messages,
  setMessages,
}) => {
  const [input, setInput] = useState('');
  const [ragMode, setRagMode] = useState<'single' | 'multi'>('single');
  // Initialize to empty or single default instead of auto-selecting 'all'
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSwitch = (mode: 'single' | 'multi') => {
    setRagMode(mode);
    // Reset selection when switching modes so the user makes a deliberate choice
    setSelectedIds([]);
  };

  const handleToggleDoc = (id: string) => {
    if (ragMode === 'single') {
      setSelectedIds([id]);
      setIsDropdownOpen(false);
      return;
    }

    // Multi mode toggle logic
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (documents.length === 0) return;
    setSelectedIds(documents.map((d) => String(d.id)));
  };

  const getDropdownLabel = () => {
    if (selectedIds.length === 0) {
      return 'Select Document...';
    }
    if (selectedIds.length === 1) {
      const doc = documents.find((d) => String(d.id) === selectedIds[0]);
      return doc ? doc.title : '1 Document Selected';
    }
    if (documents.length > 0 && selectedIds.length === documents.length) {
      return 'All Vault Documents';
    }
    return `${selectedIds.length} Documents Selected`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const payload: { query: string; document_id?: number; document_ids?: number[] } = { query: userQuery };
      
      if (ragMode === 'single') {
        if (selectedIds.length > 0) {
          payload.document_id = Number(selectedIds[0]);
        }
      } else {
        const activeIds = selectedIds.map((id) => Number(id));
        if (activeIds.length > 0) {
          payload.document_ids = activeIds;
        }
      }

      const response = await apiClient.post('/rag/chat', payload);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: response.data.answer,
          sources: response.data.sources,
        },
      ]);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to retrieve an answer. Please verify your connection or uploaded files.';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **System Message:**\n${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-[calc(100vh-8rem)] transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              AI Tutor Chat <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Grounded strictly in your study vault</p>
          </div>
        </div>

        {/* Controls: Mode Switcher + Scoping Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mode Toggle Pill */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => handleModeSwitch('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                ragMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="Single Document Mode"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Single</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('multi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                ragMode === 'multi'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="Multi-Document Mode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Multi</span>
            </button>
          </div>

          {/* Scoping Dropdown */}
          <div className="relative flex-1 sm:w-60" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{getDropdownLabel()}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {ragMode === 'multi' && (
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 mb-1 gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className={`flex-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center ${
                        isAllSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="flex-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {documents.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">No documents uploaded</div>
                ) : (
                  documents.map((doc) => {
                    const isSelected = selectedIds.includes(String(doc.id));
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleDoc(String(doc.id))}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate pr-2">{doc.title}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg h-fit">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.sender === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              ) : (
                <div className="space-y-3 leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1 text-indigo-600 dark:text-indigo-400" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mb-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-2" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[13px] text-pink-600 dark:text-pink-400" {...props} />
                        ) : (
                          <code className="block bg-slate-800 text-slate-50 p-3 rounded-lg text-[13px] overflow-x-auto my-2" {...props} />
                        ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Sources: {msg.sources.join(', ')}</span>
                </div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg h-fit">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start items-center text-slate-500 dark:text-slate-400 text-xs">
            <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>Generating response from context...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your study materials..."
          disabled={loading}
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};