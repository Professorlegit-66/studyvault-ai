import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { Sparkles, Plus, Trash2, Send, Brain, X, MessageCircle } from 'lucide-react';

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

export const AICompanion: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
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
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get<CompanionMessage[]>(
        `/companion/conversations/${conversationId}/messages`
      );
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
    fetchConversations();
    fetchMemories();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    fetchMessages(id);
  };

  const handleNewConversation = async () => {
    try {
      const res = await apiClient.post<Conversation>('/companion/conversations');
      setConversations((prev) => [res.data, ...prev]);
      setActiveConversationId(res.data.id);
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

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    let conversationId = activeConversationId;

    // No active thread yet - create one transparently before sending
    if (!conversationId) {
      try {
        const res = await apiClient.post<Conversation>('/companion/conversations');
        conversationId = res.data.id;
        setActiveConversationId(conversationId);
        setConversations((prev) => [res.data, ...prev]);
      } catch (err) {
        console.error('Failed to start new conversation', err);
        return;
      }
    }

    const optimisticUserMessage: CompanionMessage = {
      id: Date.now(),
      sender: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const res = await apiClient.post<{ reply: string; remembered: string | null }>(
        `/companion/conversations/${conversationId}/chat`,
        { message: trimmed }
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

      // First message in a thread changes its title server-side - resync the list
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Conversation list sidebar */}
      <div className="w-64 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => setShowMemoryPanel(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5" />
            What I remember ({memories.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
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

      {/* Chat window */}
      <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Companion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chat about anything - not limited to your documents. Ask me to remember things about you.
          </p>
        </div>

        {justRemembered && (
          <div className="mx-4 mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 shrink-0" />
            <span>I'll remember: {justRemembered}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingMessages ? (
            <p className="text-sm text-slate-400 text-center py-10">Loading conversation...</p>
          ) : !activeConversationId ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-slate-400">
              <MessageCircle className="w-10 h-10" />
              <p className="text-sm max-w-xs">
                Start a new chat or pick one from the list to continue talking.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              Say hello to get the conversation going.
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-900 text-slate-400">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your AI Companion..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !inputValue.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Memory management panel */}
      {showMemoryPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {memories.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nothing saved yet. Tell me to remember something in a chat.
                </p>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-start justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-700 dark:text-slate-300"
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