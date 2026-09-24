// File: frontend/src/components/HelpAssistant.tsx

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Trash2, Copy, Check, Edit2, Send, Bot, User, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const DEFAULT_HELP_GREETING: HelpMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm the Help Assistant. Ask me how to use any feature in StudyVault AI.",
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ');
}

export default function HelpAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState<HelpMessage[]>(() => {
    const saved = localStorage.getItem('studyvault_help_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved help messages", e);
      }
    }
    return [DEFAULT_HELP_GREETING];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Inline editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('studyvault_help_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('studyvault_help_messages');
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText || input).trim();
    if (!trimmed || isLoading) return;

    const userMessage: HelpMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/assistant/query', {
        message: trimmed,
      });

      const assistantMessage: HelpMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: stripMarkdown(response.data.reply),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: HelpMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: "Sorry, something went wrong reaching the Help Assistant. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = (id: string, newText: string) => {
    const index = messages.findIndex((m) => m.id === id);
    if (index === -1) return;

    const truncated = messages.slice(0, index);
    setMessages(truncated);
    setEditingMessageId(null);
    handleSend(newText);
  };

  const handleClearHistory = () => {
    setMessages([DEFAULT_HELP_GREETING]);
    localStorage.removeItem('studyvault_help_messages');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close help assistant' : 'Open help assistant'}
        aria-expanded={isOpen}
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
        title="Help"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div
          className="
            fixed right-4 top-20 md:right-16 md:top-20
            w-96 max-w-[calc(100vw-2rem)]
            h-[30rem] max-h-[75vh]
            flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-900 overflow-hidden z-50 animate-fadeIn
          "
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-indigo-600 text-white shrink-0">
            <span className="font-bold text-sm">Help Assistant</span>
            
            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1 hover:bg-indigo-500 rounded-lg text-white/90 hover:text-white transition-colors cursor-pointer"
                  title="Clear chat history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-indigo-500 rounded-lg text-white/90 hover:text-white transition-colors cursor-pointer"
                aria-label="Close help assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex w-full gap-2.5 group ${isUser ? 'justify-end' : 'justify-start'}`}>
                  
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="p-1.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg h-fit shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Message Container: Groups the Bubble and Action Buttons */}
                  <div className={`flex flex-col max-w-[80%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                    
                    <div className={`w-full rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700/80'
                    }`}>
                      {editingMessageId === msg.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-slate-900 text-white p-2 rounded-lg text-xs outline-none resize-none border border-slate-700 focus:border-indigo-500"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded text-white"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg.id, editText)}
                              className="flex items-center gap-1 text-[11px] bg-indigo-500 hover:bg-indigo-400 px-2.5 py-1 rounded text-white"
                            >
                              <Send size={12} /> Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                      )}
                    </div>

                    {/* Action Buttons (Underneath bubble, revealed on group hover) */}
                    {!editingMessageId && (
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
                        {isUser && (
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditText(msg.text);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                            title="Edit message"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg h-fit shrink-0 mt-1">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 justify-start items-center text-slate-500 dark:text-slate-400 text-xs">
                <div className="p-1.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg h-fit shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>Looking up app features & guidance...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask how to use any feature..."
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}