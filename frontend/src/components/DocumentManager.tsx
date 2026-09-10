import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.get<Document[]>('/documents/');
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);

    try {
      await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(`"${selectedFile.name}" uploaded and processed successfully!`);
      fetchDocuments();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((item: any) => item.msg || 'Invalid field').join(', '));
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Documents Vault</h2>
          <p className="text-sm text-slate-400">Upload PDF or TXT files for AI analysis</p>
        </div>
        <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
              type="file"
              accept=".pdf,.txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{doc.filename}</h4>
                  <span className="text-xs text-slate-400">
                    {(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};