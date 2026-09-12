import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { FileText, FileCode, FileSpreadsheet, File, Upload, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export interface Document {
  id: number;
  title?: string;
  file_path?: string;
  created_at: string;
}

interface DocumentManagerProps {
  documents: Document[];
  onDocumentsChange: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onDocumentsChange }) => {
  const [uploading, setUploading] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onDocumentsChange();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateFlashcards = async (documentId: number) => {
    try {
      setGeneratingId(documentId);
      setMessage(null);
      const res = await apiClient.post(`/memory/generate/${documentId}`);
      setMessage(res.data.message || 'Flashcards generated successfully!');
    } catch (err) {
      console.error('Failed to generate flashcards', err);
      setMessage('Failed to generate flashcards. Please check your AI configuration.');
    } finally {
      setGeneratingId(null);
    }
  };

  const getFileIcon = (filename: string = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return { icon: FileText, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', label: 'PDF' };
      case 'docx':
      case 'doc':
        return { icon: FileText, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', label: 'DOC' };
      case 'txt':
        return { icon: FileCode, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'TXT' };
      case 'csv':
      case 'xlsx':
        return { icon: FileSpreadsheet, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', label: 'DATA' };
      default:
        return { icon: File, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', label: ext?.toUpperCase() || 'FILE' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Documents Vault</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upload study notes and generate AI-powered flashcards.</p>
        </div>

        <label className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/20">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Upload Document</span>
          <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.docx" />
        </label>
      </div>

      {message && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No documents uploaded yet. Upload a PDF or TXT file to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700/60">
            {documents.map((doc) => {
              const name = doc.title || `Document #${doc.id}`;
              const fileMeta = getFileIcon(name);
              const IconComponent = fileMeta.icon;

              return (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${fileMeta.color} relative flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5" />
                      <span className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1 bg-slate-900 text-slate-100 rounded">
                        {fileMeta.label}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{name}</p>
                      <p className="text-xs text-slate-400">Added on {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <button
                    disabled={generatingId === doc.id}
                    onClick={() => handleGenerateFlashcards(doc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {generatingId === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Generate Flashcards</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};