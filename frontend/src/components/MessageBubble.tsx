import React, { useState } from 'react';
import { Bot, User, Pencil, Check, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: {
    id?: string | number;
    sender: 'user' | 'ai';
    text?: string;
    content?: string;
    sources?: string[];
  };
  onResubmit?: (newText: string) => void;
  markdownComponents?: any;
  avatar?: React.ReactNode;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onResubmit, markdownComponents, avatar }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || message.content || '');
  const [copied, setCopied] = useState(false);

  const content = message.text || message.content || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editText.trim() || !onResubmit) return;
    setIsEditing(false);
    onResubmit(editText.trim());
  };

  return (
    <div className={`flex gap-3 w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.sender === 'ai' && (
        <div className="shrink-0 mt-1">
          {avatar ? avatar : (
            <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col group max-w-[85%] sm:max-w-[75%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm shadow-xs transition-colors w-full ${
          message.sender === 'user'
            ? 'bg-indigo-600 text-white rounded-tr-xs'
            : 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-xs'
        }`}>
          {isEditing ? (
            <div className="space-y-2 w-full">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl border border-indigo-500 focus:outline-none text-sm resize-none"
                rows={3}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save & Resubmit
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {message.sender === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {content}
                  </ReactMarkdown>
                </div>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Sources:</span>
                  {message.sources.map((src, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-900 rounded-md text-[11px]">
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons underneath */}
        {!isEditing && (
          <div className={`flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 dark:text-slate-300 ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm px-1.5 py-0.5">
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                title="Copy text"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
              {message.sender === 'user' && onResubmit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                  title="Edit message"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {message.sender === 'user' && (
        <div className="shrink-0 mt-1">
          <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
            <User className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};