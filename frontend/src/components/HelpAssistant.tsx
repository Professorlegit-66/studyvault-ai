// File: frontend/src/components/HelpAssistant.tsx
// NEW FILE — does not replace anything existing.
// Mount this once inside Dashboard.tsx, e.g. right before the closing tag
// of the top-level shell div, so it floats above every tab:
//
//   import HelpAssistant from '../components/HelpAssistant';
//   ...
//   <HelpAssistant />
//
// State is kept LOCAL to this component (not lifted to Dashboard.tsx),
// unlike AITutorChat's messages. That's intentional for Pass 1 — this
// widget doesn't need to persist across tab switches as urgently, and
// keeping its state local avoids repeating the file/state mix-up pattern
// this project has hit before.

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../api/client';

interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

// Safety net: the backend prompt asks Gemini not to use markdown, but
// occasionally it slips in **bold** or bullet asterisks anyway. Strip the
// common cases so the chat bubble never shows raw asterisks/hashes to the user.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1') // *italic*
    .replace(/^#{1,6}\s+/gm, '') // # headers
    .replace(/^[-*]\s+/gm, '• '); // bullet markers -> plain bullet
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

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
      // apiClient's baseURL already includes /api, so this hits
      // POST /api/assistant/query
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
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 w-80 max-w-[calc(100vw-3rem)] h-96 max-h-[70vh] flex flex-col rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-indigo-600 text-white">
            <span className="font-medium text-sm">Help Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white text-sm"
              aria-label="Close help assistant"
            >
              ✕
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

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask how to do something..."
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded-md bg-indigo-600 text-white px-3 py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 transition"
        aria-label="Toggle help assistant"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}