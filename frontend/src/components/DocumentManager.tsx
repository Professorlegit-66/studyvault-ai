import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { FileText, Upload, Sparkles, Trash2, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, Eye, X, Search, ArrowUpDown } from 'lucide-react';
import { PdfViewer } from './PdfViewer';
import { TextViewer } from './TextViewer';
import { CustomSelect } from './CustomSelect';
import { ConfirmDialog } from './ConfirmDialog';

export interface Document {
  id: number;
  title: string;
  file_type?: string;
  file_path?: string;
  file_size?: number;
  created_at?: string;
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DocumentManagerProps {
  documents: Document[];
  onDocumentsChange: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ 
  documents, 
  onDocumentsChange 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    e.target.value = '';

    setUploadError(null);
    setSuccessMsg(null);

    const isDuplicate = documents.some(
      (doc) => doc.title.toLowerCase() === file.name.toLowerCase()
    );
    if (isDuplicate) {
      setUploadError(`A document named "${file.name}" already exists. Rename the file, or delete the existing one first.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      });
      onDocumentsChange();
    } catch (err: any) {
      console.error('Failed to upload document', err);
      const detail = err.response?.data?.detail;
      setUploadError(
        typeof detail === 'string'
          ? detail
          : 'Failed to upload document. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const generateFlashcards = async (docId: number) => {
    setGeneratingId(docId);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post(`/memory/generate/${docId}`);
      setSuccessMsg(res.data.message || 'Flashcards successfully generated! Check Student Memory.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to generate flashcards', err);
      const errorMsg = err.response?.data?.detail || 'Failed to generate flashcards.';
      alert(errorMsg);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSnippetSelect = async (snippet: string) => {
    setSuccessMsg(null);
    try {
      await apiClient.post('/memory/generate-from-snippet', {
        snippet,
        title: selectedDoc?.title || 'Document Snippet',
        document_id: selectedDoc?.id ?? null,
      });
      setSuccessMsg('Flashcard successfully generated from highlighted text! Check Student Memory.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to generate flashcard from snippet', err);
      alert(err.response?.data?.detail || 'Failed to generate flashcard from snippet.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedDocuments.map(d => d.id));
    }
  };

  const toggleSelectDoc = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await apiClient.delete(`/documents/${id}`);
      }
      setSelectedIds([]);
      setIsSelectMode(false);
      setShowConfirm(false);
      onDocumentsChange();
    } catch (err) {
      console.error('Failed to delete documents', err);
      alert('Failed to delete some documents.');
    } finally {
      setDeleting(false);
    }
  };

  const displayedDocuments = documents
    .filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice()
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'size-asc':
          return (a.file_size ?? 0) - (b.file_size ?? 0);
        case 'size-desc':
          return (b.file_size ?? 0) - (a.file_size ?? 0);
        case 'date-asc':
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        case 'date-desc':
        default:
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Documents Vault</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upload study notes, view documents, highlight snippets, and generate AI-powered flashcards.</p>
        </div>
        <div className="flex items-center gap-3">
          {documents.length > 0 && (
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
                setShowConfirm(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border ${
                isSelectMode
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isSelectMode ? 'Cancel Selection' : 'Delete Documents'}</span>
            </button>
          )}

          <label className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-indigo-600/30">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 text-emerald-500 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {uploadError && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-rose-500 dark:text-rose-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {isSelectMode && documents.length > 0 && (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={toggleSelectAll}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {selectedIds.length === displayedDocuments.length ? 'Deselect All' : 'Select All'} ({selectedIds.length} selected)
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selectedIds.length === 0 || deleting}
            className="flex items-center gap-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete documents?"
        message={`Are you sure you want to delete ${selectedIds.length} selected document(s)? This cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowConfirm(false)}
      />

      {documents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No documents uploaded yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Upload text, PDF, or Word files to start chatting with your AI tutor, highlighting passages, and generating flashcards.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <CustomSelect
              className="sm:w-64"
              value={sortOption}
              onChange={(v) => setSortOption(v as SortOption)}
              icon={<ArrowUpDown className="w-4 h-4" />}
              options={[
                { value: 'date-desc', label: 'Date (Newest first)' },
                { value: 'date-asc', label: 'Date (Oldest first)' },
                { value: 'name-asc', label: 'Name (A → Z)' },
                { value: 'name-desc', label: 'Name (Z → A)' },
                { value: 'size-desc', label: 'Size (Largest first)' },
                { value: 'size-asc', label: 'Size (Smallest first)' },
              ]}
            />
          </div>

          {displayedDocuments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No matching documents</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Try a different search term.
              </p>
            </div>
          ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
          {displayedDocuments.map((doc) => {
            const isSelected = selectedIds.includes(doc.id);
            const isViewable = doc.title.toLowerCase().endsWith('.pdf') ||
                   doc.title.toLowerCase().endsWith('.txt') ||
                   doc.title.toLowerCase().endsWith('.md') ||
                   doc.title.toLowerCase().endsWith('.docx');
            return (
              <div
                key={doc.id}
                onClick={() => isSelectMode && toggleSelectDoc(doc.id)}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isSelectMode ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50' : ''
                } ${isSelected ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {isSelectMode && (
                    <div className="text-indigo-600 dark:text-indigo-400">
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                    </div>
                  )}
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Added {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recently'}
                      {doc.file_size !== undefined && ` • ${formatFileSize(doc.file_size)}`}
                    </p>
                  </div>
                </div>

                {!isSelectMode && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isViewable) {
                          setSelectedDoc(doc);
                        } else {
                          alert('Interactive viewing is currently supported for PDF, TXT, MD, and DOCX files. You can generate flashcards directly using the Generate Flashcards button.');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      title="View Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => generateFlashcards(doc.id)}
                      disabled={generatingId === doc.id}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-slate-700"
                    >
                      {generatingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      <span>Generate Flashcards</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl relative max-h-[90vh] overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate max-w-xl">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" /> {selectedDoc.title}
              </h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body without nested wrapper card */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/50">
              {selectedDoc.title.toLowerCase().endsWith('.pdf') ? (
                <PdfViewer
                  documentId={selectedDoc.id}
                  onSnippetSelect={handleSnippetSelect}
                />
              ) : (
                <TextViewer
                  documentId={selectedDoc.id}
                  onSnippetSelect={handleSnippetSelect}
                />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};