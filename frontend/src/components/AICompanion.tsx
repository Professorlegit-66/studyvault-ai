// File: frontend/src/components/AICompanion.tsx

import aiCompanionIcon from '../assets/ai-companion-tab-icon.png';
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { Plus, Trash2, Send, Brain, X, MessageCircle, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

interface CompanionMessage {
  id: number;
  sender: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface Memory {
  id: number;
  content: string;
  created_at: string;
}

interface AICompanionProps {
  isActive?: boolean;
}

const COMPANION_MARKDOWN_COMPONENTS = {
  h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-md font-bold mt-2 mb-1 text-indigo-600 dark:text-indigo-400" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-2" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-1 mb-2" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 space-y-1 mb-2" {...props} />,
  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[13px] text-pink-600 dark:text-pink-400" {...props} />
    ) : (
      <code className="block bg-slate-800 text-slate-50 p-3 rounded-lg text-[13px] overflow-x-auto my-2" {...props} />
    ),
};

export const AICompanion: React.FC<AICompanionProps> = ({ isActive = true }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(() => {
    const saved = localStorage.getItem('studyvault_active_companion_id');
    return saved ? Number(saved) : null;
  });

  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [justRemembered, setJustRemembered] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await apiClient.get<Conversation[]>('/companion/conversations');
      setConversations(res.data);
      const savedId = localStorage.getItem('studyvault_active_companion_id');
      if (savedId && res.data.some(c => c.id === Number(savedId))) {
        fetchMessages(Number(savedId));
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get<CompanionMessage[]>(`/companion/conversations/${conversationId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await apiClient.get<Memory[]>('/companion/memories');
      setMemories(res.data);
    } catch (err) {
      console.error('Failed to load memories', err);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchConversations();
      fetchMemories();
    }
  }, [isActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    localStorage.setItem('studyvault_active_companion_id', String(id));
    fetchMessages(id);
  };

  const handleNewConversation = async () => {
    try {
      const res = await apiClient.post<Conversation>('/companion/conversations');
      setConversations((prev) => [res.data, ...prev]);
      setActiveConversationId(res.data.id);
      localStorage.setItem('studyvault_active_companion_id', String(res.data.id));
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/companion/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        localStorage.removeItem('studyvault_active_companion_id');
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    try {
      await apiClient.delete(`/companion/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue.trim();
    if (!textToSend || isSending) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const res = await apiClient.post<Conversation>('/companion/conversations');
        conversationId = res.data.id;
        setActiveConversationId(conversationId);
        localStorage.setItem('studyvault_active_companion_id', String(conversationId));
        setConversations((prev) => [res.data, ...prev]);
      } catch (err) {
        console.error('Failed to start new conversation', err);
        return;
      }
    }

    const optimisticUserMessage: CompanionMessage = {
      id: Date.now(),
      sender: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    if (!overrideText) setInputValue('');
    setIsSending(true);

    try {
      const res = await apiClient.post<{ reply: string; remembered: string | null }>(
        `/companion/conversations/${conversationId}/chat`,
        { message: textToSend }
      );
      const aiMessage: CompanionMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: res.data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (res.data.remembered) {
        setJustRemembered(res.data.remembered);
        fetchMemories();
        setTimeout(() => setJustRemembered(null), 4000);
      }
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message', err);
      const errorMessage: CompanionMessage = {
        id: Date.now() + 2,
        sender: 'ai',
        content: 'Sorry, something went wrong sending that. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleEditAndResubmit = async (msgId: number, newText: string) => {
    const index = messages.findIndex((m) => m.id === msgId);
    if (index === -1 || !activeConversationId) return;

    const priorMessages = messages.slice(0, index);
    setMessages(priorMessages);

    const editedUserMessage: CompanionMessage = {
      id: Date.now(),
      sender: 'user',
      content: newText,
      created_at: new Date().toISOString(),
    };
    setMessages([...priorMessages, editedUserMessage]);
    setIsSending(true);

    try {
      const chatRes = await apiClient.post<{ reply: string; remembered: string | null }>(
        `/companion/conversations/${activeConversationId}/chat`,
        { message: newText, edit_message_id: msgId }
      );
      const aiMessage: CompanionMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: chatRes.data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      fetchConversations();
    } catch (err) {
      console.error('Failed to edit and resubmit message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const companionAvatar = (
    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 pointer-events-none select-none bg-[#071d49] shadow-[0_0_10px_rgba(99,102,241,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.25)]">
      <img src={aiCompanionIcon} alt="AI Companion" className="w-full h-full object-cover scale-[1.25]" />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 w-full select-none pointer-events-none">
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg overflow-hidden bg-[#071d49] shadow-[0_0_10px_rgba(99,102,241,0.4)] dark:shadow-[0_0_10px_rgba(255,255,255,0.25)] flex items-center justify-center">
              <img src={aiCompanionIcon} alt="AI Companion" className="w-full h-full object-cover scale-[1.25]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              AI Companion
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Chat about anything - not limited to your documents. Ask me to remember things about you.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        
        <div className="w-full md:w-64 md:shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col min-h-[200px] md:min-h-0">
          <div className="space-y-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={() => setShowMemoryPanel(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5" />
              What I remember ({memories.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {loadingConversations ? (
              <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 px-2">
                No conversations yet. Start one above.
              </p>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => handleSelectConversation(convo.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
                    activeConversationId === convo.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate flex-1">{convo.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(convo.id, e)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                      activeConversationId === convo.id ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-rose-500'
                    }`}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col transition-colors duration-300">
          
          {justRemembered && (
            <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs flex items-center gap-2 shrink-0">
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span>I'll remember: {justRemembered}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4 flex flex-col gap-4">
            {loadingMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-400">Loading conversation...</p>
              </div>
            ) : !activeConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-slate-400">
                <MessageCircle className="w-10 h-10" />
                <p className="text-sm max-w-xs">
                  Start a new chat or pick one from the list to continue talking.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-400">Say hello to get the conversation going.</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={{ id: msg.id, sender: msg.sender, content: msg.content }} 
                    onResubmit={msg.sender === 'user' ? (newText) => handleEditAndResubmit(msg.id, newText) : undefined}
                    markdownComponents={COMPANION_MARKDOWN_COMPONENTS}
                    avatar={companionAvatar}
                  />
                ))}
                {isSending && (
                  <div className="flex gap-3 justify-start items-center text-slate-500 dark:text-slate-400 text-xs">
                    <div className="shrink-0 mt-1">{companionAvatar}</div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span>Recalling memories & thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} className="h-0 shrink-0" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 shrink-0">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything or tell me something to remember..."
              disabled={isSending}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {showMemoryPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                What I remember about you
              </h3>
              <button
                onClick={() => setShowMemoryPanel(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2">
              {memories.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nothing saved yet. Tell me to remember something in a chat.
                </p>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-start justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex-1">{mem.content}</span>
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="text-slate-400 hover:text-rose-500 shrink-0"
                      title="Forget this"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};