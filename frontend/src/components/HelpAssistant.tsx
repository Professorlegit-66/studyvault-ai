// File: frontend/src/components/HelpAssistant.tsx
//
// Docked in the header (next to the theme toggle / Welcome badge) rather
// than floating over the page - see Dashboard.tsx, where it's now rendered
// inside the header row instead of at the very end of the component. This
// replaces the earlier fixed-bottom-right floating bubble, which had no
// robust way to avoid overlapping page content (it always sat over
// whatever happened to be in that corner - see the various layout-overlap
// bugs this caused). Anchoring it to a header icon means there's
// structurally nothing for it to cover: it opens relative to a UI element
// that's always present and always in the same place.

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { apiClient } from '../api/client';

interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

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
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm the Help Assistant. Ask me how to use any feature in StudyVault AI.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Click-outside and Escape both close the panel - standard dropdown
  // behavior, since this is no longer a persistent floating window.
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

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: HelpMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
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
            fixed inset-x-4 bottom-20 md:bottom-auto
            md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2
            w-auto md:w-96 max-w-[calc(100vw-2rem)]
            h-[28rem] max-h-[70vh]
            flex flex-col rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 overflow-hidden z-50
          "
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-indigo-600 text-white shrink-0">
            <span className="font-medium text-sm">Help Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close help assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask how to do something..."
              className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="shrink-0 rounded-md bg-indigo-600 text-white px-3 py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}