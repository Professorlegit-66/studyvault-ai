import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface Document {
  id: number;
  title: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface DocumentManagerProps {
  documents: Document[];
  onDocumentsChange: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onDocumentsChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(`"${file.name}" uploaded and processed successfully!`);
      onDocumentsChange();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      onDocumentsChange();
    } catch (err) {
      setError('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-xl transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Documents Vault</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload PDF or TXT files for AI analysis
            </p>
          </div>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors shadow-md">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? 'Processing...' : 'Upload File'}</span>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-400 dark:text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                      {doc.title}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};