// src/components/TextViewer.tsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useTheme } from '../context/ThemeContext';

interface TextViewerProps {
  documentId: number;
  onSnippetSelect: (snippet: string) => void;
}

export const TextViewer: React.FC<TextViewerProps> = ({ documentId, onSnippetSelect }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [selectedText, setSelectedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [documentId]);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/documents/${documentId}/content`);
      setContent(res.data.content || res.data.text || 'No text content available.');
    } catch (err: any) {
      setError('Failed to load text document.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedText.trim()) return;
    onSnippetSelect(selectedText);
    setSelectedText('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
        <span>Highlight text to generate an AI flashcard</span>
        {selectedText && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Flashcard</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
      ) : (
        <div
          className={`max-w-2xl mx-auto border p-8 rounded-2xl shadow-sm leading-relaxed font-sans text-sm ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}
          onMouseUp={() => {
            const selection = window.getSelection();
            if (selection) setSelectedText(selection.toString().trim());
          }}
        >
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
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};