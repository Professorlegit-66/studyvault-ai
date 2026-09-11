import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../api/client';
import type { Document } from './DocumentManager';
import { Send, Bot, User, Loader2, Sparkles, BookOpen, Filter } from 'lucide-react';

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
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const payload: { query: string; document_id?: number } = { query: userQuery };
      if (selectedDocId !== 'all') {
        payload.document_id = Number(selectedDocId);
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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Failed to retrieve an answer. Please verify your connection or uploaded files.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              AI Tutor Chat <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-400">Grounded strictly in your study vault</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-800 text-slate-200">
              All Vault Documents
            </option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id} className="bg-slate-800 text-slate-200">
                {doc.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg h-fit">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-900/80 border border-slate-700/80 text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sources: {msg.sources.join(', ')}</span>
                </div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="p-2 bg-slate-700 text-slate-200 rounded-lg h-fit">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start items-center text-slate-400 text-xs">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-700/80">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
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
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};