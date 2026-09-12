// src/components/PdfViewer.tsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useTheme } from '../context/ThemeContext';

interface PdfViewerProps {
  documentId: number;
  onSnippetSelect: (snippet: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ documentId, onSnippetSelect }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [selectedText, setSelectedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocumentContent();
  }, [documentId]);

  const fetchDocumentContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/documents/${documentId}/content`);
      setContent(res.data.content || res.data.text || 'No text content available.');
    } catch (err: any) {
      setError('Failed to load document content.');
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
          className={`max-w-2xl mx-auto border p-8 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap font-sans text-sm ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}
          onMouseUp={() => {
            const selection = window.getSelection();
            if (selection) setSelectedText(selection.toString().trim());
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};