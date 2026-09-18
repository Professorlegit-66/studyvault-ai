import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../api/client';
import type { Document } from './DocumentManager';
import { Send, Bot, User, Loader2, Sparkles, BookOpen, Filter } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

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
    } catch (err: any) {
      // Extract FastAPI custom error detail, or fallback to the Axios network/timeout error message
      const errorMessage = err.response?.data?.detail 
        || err.message 
        || 'Failed to retrieve an answer. Please verify your connection or uploaded files.';

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

        <CustomSelect
          className="w-full sm:w-56"
          value={selectedDocId}
          onChange={(v) => setSelectedDocId(v)}
          icon={<Filter className="w-3.5 h-3.5" />}
          options={[
            { value: 'all', label: 'All Vault Documents' },
            ...documents.map((doc) => ({ value: String(doc.id), label: doc.title })),
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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