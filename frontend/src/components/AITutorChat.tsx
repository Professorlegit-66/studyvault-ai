// File: frontend/src/components/AITutorChat.tsx

import aiTutorIcon from '../assets/ai-tutor-tab-icon.png';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';
import type { Document } from './DocumentManager';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, Filter, Check, ChevronDown, Layers, FileText, Trash2 } from 'lucide-react';

export interface Message {
  id?: number | string;
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

interface AITutorChatProps {
  documents: Document[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const DEFAULT_GREETING: Message = {
  id: 'greeting',
  sender: 'ai',
  text: 'Hello! I am your AI Tutor. Ask me any question about your uploaded documents, or select specific files above to focus our discussion.'
};

const parseBrTags = (content: React.ReactNode): React.ReactNode => {
  if (typeof content === 'string') {
    const parts = content.split(/<br\s*\/?>/gi);
    if (parts.length === 1) return content;
    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {part}
      </React.Fragment>
    ));
  }
  if (Array.isArray(content)) {
    return content.map((child, i) => <React.Fragment key={i}>{parseBrTags(child)}</React.Fragment>);
  }
  return content;
};

const fixMarkdownTables = (markdown: string): string => {
  if (!markdown || typeof markdown !== 'string') return markdown;
  const lines = markdown.split('\n');
  let inTable = false;
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      fixedLines.push(line);
    } else if (inTable && trimmed.startsWith('|')) {
      fixedLines.push(line);
    } else {
      if (inTable) {
        if (trimmed !== '' && !trimmed.startsWith('---') && !trimmed.startsWith('|')) {
          if (fixedLines.length > 0) {
            fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1].replace(/\|$/, ' <br /> ' + trimmed + ' |');
          } else {
            fixedLines.push(line);
            inTable = false;
          }
        } else {
          inTable = false;
          fixedLines.push(line);
        }
      } else {
        fixedLines.push(line);
      }
    }
  }
  return fixedLines.join('\n');
};

const MARKDOWN_COMPONENTS = {
  h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-md font-bold mt-2 mb-1 text-indigo-600 dark:text-indigo-400" {...props} />,
  p: ({ node, children, ...props }: any) => <p className="mb-2 leading-relaxed text-slate-800 dark:text-slate-200" {...props}>{parseBrTags(children)}</p>,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-1 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 space-y-1 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
  li: ({ node, children, ...props }: any) => <li className="pl-1" {...props}>{parseBrTags(children)}</li>,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-800 rounded-xl custom-scrollbar">
      <table className="w-full text-left border-collapse text-xs table-fixed" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300" {...props} />,
  tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-slate-200 dark:divide-slate-800" {...props} />,
  tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30" {...props} />,
  th: ({ node, children, ...props }: any) => <th className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 whitespace-normal break-words" {...props}>{parseBrTags(children)}</th>,
  td: ({ node, children, ...props }: any) => <td className="px-4 py-3 text-slate-700 dark:text-slate-300 align-top whitespace-normal break-words" {...props}>{parseBrTags(children)}</td>,
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[13px] text-pink-600 dark:text-pink-400 font-mono" {...props} />
    ) : (
      <code className="block bg-slate-800 text-slate-50 p-3 rounded-lg text-[13px] overflow-x-auto my-2 font-mono" {...props} />
    ),
};

export const AITutorChat: React.FC<AITutorChatProps> = ({ documents, messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [ragMode, setRagMode] = useState<'single' | 'multi'>('single');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, fetchingHistory]);

  const loadChatHistory = useCallback(async () => {
    if (initializedRef.current || messages.length > 0) return;
    initializedRef.current = true;
    setFetchingHistory(true);
    try {
      const res = await apiClient.get<Message[]>('/rag/history');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const sanitized = res.data.map((m) => ({
          ...m,
          text: fixMarkdownTables(m.text),
        }));
        setMessages(sanitized);
      } else {
        setMessages([DEFAULT_GREETING]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([DEFAULT_GREETING]);
    } finally {
      setFetchingHistory(false);
    }
  }, [messages.length, setMessages]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

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
    if (ragMode === mode) return;
    setRagMode(mode);
    if (mode === 'single' && selectedIds.length > 1) {
      setSelectedIds([selectedIds[0]]);
    }
  };

  const handleToggleDoc = (id: string) => {
    if (ragMode === 'single') {
      setSelectedIds([id]);
      setIsDropdownOpen(false);
      return;
    }
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (documents.length === 0) return;
    setSelectedIds(documents.map((d) => String(d.id)));
  };

  const handleClearHistory = async () => {
    try {
      await apiClient.delete('/rag/history');
      setMessages([DEFAULT_GREETING]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const getDropdownLabel = useMemo(() => {
    if (selectedIds.length === 0) return 'Select Document Context...';
    if (selectedIds.length === 1) {
      const doc = documents.find((d) => String(d.id) === selectedIds[0]);
      return doc ? doc.title : '1 Document Selected';
    }
    if (documents.length > 0 && selectedIds.length === documents.length) {
      return 'All Vault Documents';
    }
    return `${selectedIds.length} Documents Selected`;
  }, [selectedIds, documents]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userQuery = overrideText || input.trim();
    if (!userQuery || loading) return;

    if (!overrideText) setInput('');
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const payload: { query: string; document_id?: number; document_ids?: number[] } = { query: userQuery };
      if (ragMode === 'single') {
        if (selectedIds.length > 0) payload.document_id = Number(selectedIds[0]);
      } else {
        const activeIds = selectedIds.map((id) => Number(id));
        if (activeIds.length > 0) payload.document_ids = activeIds;
      }
      const response = await apiClient.post('/rag/chat', payload);
      const fixedAnswer = fixMarkdownTables(response.data.answer);
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: fixedAnswer, sources: response.data.sources }]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to retrieve an answer. Please verify your connection or uploaded files.';
      setMessages((prev) => [...prev, { id: Date.now() + 2, sender: 'ai', text: `⚠️ **System Message:**\n${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAndResubmit = async (msgId: string | number, newText: string) => {
    const index = messages.findIndex((m, idx) => (m.id ?? `msg-${idx}`) === msgId);
    if (index === -1) return;
    const truncated = messages.slice(0, index);
    setMessages(truncated);
    await handleSend(undefined, newText);
  };

  const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;

  const tutorAvatar = (
    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 pointer-events-none select-none bg-[#071d49] shadow-[0_0_10px_rgba(99,102,241,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.25)]">
      <img src={aiTutorIcon} alt="AI Tutor" className="w-full h-full object-cover scale-[1.25]" />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 w-full select-none pointer-events-none">
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg overflow-hidden bg-[#071d49] shadow-[0_0_10px_rgba(99,102,241,0.4)] dark:shadow-[0_0_10px_rgba(255,255,255,0.25)] flex items-center justify-center">
              <img src={aiTutorIcon} alt="AI Tutor" className="w-full h-full object-cover scale-[1.25]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              AI Tutor Chat
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Grounded strictly in your study vault
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto pointer-events-auto">
          {messages.length > 1 && !fetchingHistory && (
            <button
              onClick={handleClearHistory}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clear Chat</span>
            </button>
          )}

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleModeSwitch('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                ragMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-xs'
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
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="Multi-Document Mode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Multi</span>
            </button>
          </div>

          <div className="relative flex-1 sm:w-60 shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{getDropdownLabel}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 custom-scrollbar flex flex-col gap-1">
                {ragMode === 'multi' && (
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 mb-1 gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className={`flex-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center ${
                        isAllSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
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
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">
                    No documents uploaded
                  </div>
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
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col min-h-0 transition-colors duration-300">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4 flex flex-col gap-4">
          {fetchingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Restoring conversation...</span>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const msgId = msg.id ?? `msg-${idx}`;
              return (
                <MessageBubble 
                  key={msgId} 
                  message={msg} 
                  onResubmit={msg.sender === 'user' ? (newText) => handleEditAndResubmit(msgId, newText) : undefined}
                  markdownComponents={MARKDOWN_COMPONENTS}
                  avatar={tutorAvatar}
                />
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 justify-start items-center text-slate-500 dark:text-slate-400 text-xs">
              <div className="shrink-0 mt-1">{tutorAvatar}</div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Searching vault documents & generating response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-0 shrink-0" />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your study materials..."
            disabled={loading || fetchingHistory}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || fetchingHistory}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};