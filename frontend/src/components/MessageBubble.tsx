import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, Edit2, X, Send, Bot, User, BookOpen } from 'lucide-react';

interface Message {
  id?: number | string;
  sender: 'user' | 'ai';
  text?: string;
  content?: string;
  sources?: string[];
}

interface MessageBubbleProps {
  message: Message;
  onResubmit?: (newText: string) => void;
  markdownComponents?: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onResubmit, markdownComponents }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const rawText = message.text || message.content || "";
  const [editValue, setEditValue] = useState(rawText);

  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndSubmit = () => {
    setIsEditing(false);
    if (onResubmit && editValue.trim() !== rawText) {
      onResubmit(editValue);
    }
  };

  // Intercept and merge custom table styling. Previously forced a fixed
  // min-width on the table (800px) AND on every th/td (150px each) - that
  // combination guaranteed overflow for any table with more than ~2
  // columns, regardless of the chat bubble's actual width, which is what
  // caused tables to get cropped and require horizontal scrolling even
  // for normal-sized content. table-fixed + no forced min-widths lets
  // columns share the available width and wrap text instead.
  const mergedComponents = {
    ...markdownComponents,
    table: ({ node, ...props }: any) => (
      <div className="not-prose w-full overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700 custom-scrollbar shadow-sm">
        <table className="w-full text-left border-collapse text-sm table-auto" {...props} />
      </div>
    ),
    th: ({ node, ...props }: any) => (
      <th className="bg-slate-100 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 whitespace-normal break-words" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="p-4 border-b border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 align-top leading-relaxed whitespace-normal break-words" {...props} />
    ),
  };

  return (
    <div className={`flex w-full gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* AI Avatar */}
      {!isUser && (
        <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg h-fit shrink-0 mt-1">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Container: Groups the Bubble and the Action Buttons underneath */}
      <div className={`flex flex-col max-w-[80%] md:max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* The Colored Speech Bubble */}
        <div className={`w-full rounded-2xl p-3.5 text-sm shadow-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-bl-none'
        }`}>
          
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[250px] sm:min-w-[300px]">
              <textarea
                className="w-full bg-slate-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                rows={4}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => { setIsEditing(false); setEditValue(rawText); }}
                  className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors text-white"
                >
                  <X size={14} /> Cancel
                </button>
                <button 
                  onClick={handleSaveAndSubmit}
                  className="flex items-center gap-1 text-xs bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-md transition-colors text-white"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              {isUser ? (
                 <span className="whitespace-pre-wrap break-words">{rawText}</span>
              ) : (
                 <div className="prose prose-invert max-w-none prose-sm overflow-hidden">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={mergedComponents}>
                     {rawText}
                   </ReactMarkdown>
                 </div>
              )}
              
              {/* Sources Block (Tutor Only) */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Sources: {message.sources.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* The Action Buttons (Outside the bubble, underneath) */}
        {!isEditing && (
          <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
            {isUser && onResubmit && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                title="Edit message"
              >
                <Edit2 size={13} />
              </button>
            )}
            <button 
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </div>
        )}

      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg h-fit shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};