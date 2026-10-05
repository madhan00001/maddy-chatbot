import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText, Trash2, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

interface ChunkItem {
  id: string;
  chunk_index: number;
  page_number: number;
  text: string;
}

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded?: () => void;
}

export function DocumentManagerModal({ isOpen, onClose, onDocumentUploaded }: DocumentManagerModalProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setDocuments(data.documents || []);
      if (data.documents && data.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(data.documents[0].id);
        fetchChunks(data.documents[0].id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChunks = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/chunks`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setChunks(data.chunks || []);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    }
  };

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    fetchChunks(id);
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setDocuments(docs => docs.filter(d => d.id !== id));
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setChunks([]);
      }
      onDocumentUploaded?.();
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chunk_size', '800');
    formData.append('chunk_overlap', '100');

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage({ type: 'success', text: `Indexed "${file.name}" into ${data.document.chunk_count} vector chunks.` });
        await fetchDocuments();
        if (data.document?.id) {
          setSelectedDocId(data.document.id);
          fetchChunks(data.document.id);
        }
        onDocumentUploaded?.();
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Failed to upload document.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Network error during upload.' });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header - Clean 3-zone standard */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Knowledge Base & Vector Store
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span>RAG Document Corpus</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{documents.length} files indexed</span>
              <span aria-hidden="true">·</span>
              <span>Gemini Embeddings</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg border border-dashed border-zinc-750 bg-zinc-900/60 hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-3">
              <UploadCloud className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Upload Documents</div>
                <div className="text-[11px] text-zinc-400">PDF, TXT, DOCX, or Markdown up to 15MB. Chunking and embeddings run automatically.</div>
              </div>
            </div>

            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors shadow-xs">
                <span>{uploading ? 'Processing file...' : 'Choose Document'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {uploadMessage && (
            <div className={`mt-3 flex items-center gap-2 text-xs p-2.5 rounded-md ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border border-red-500/30'
            }`}>
              {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{uploadMessage.text}</span>
            </div>
          )}
        </div>

        {/* Content Split Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          
          {/* Documents Column */}
          <div className="p-4 overflow-y-auto space-y-1.5">
            <div className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider mb-2">
              Documents ({documents.length})
            </div>

            {loading ? (
              <div className="text-xs text-zinc-500 p-4 text-center">Loading files...</div>
            ) : documents.length === 0 ? (
              <div className="text-xs text-zinc-500 p-4 text-center">No documents in store. Upload a file above.</div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-colors ${
                    selectedDocId === doc.id
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 shadow-xs'
                      : 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-800/50 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <FileText className={`w-4 h-4 shrink-0 ${selectedDocId === doc.id ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <div className="truncate">
                      <div className="text-xs font-medium truncate text-zinc-200">{doc.filename}</div>
                      <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
                        {(doc.file_size / 1024).toFixed(1)} KB · {doc.chunk_count} chunks
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50 transition-colors"
                    title="Remove from index"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Chunks Inspector Column */}
          <div className="md:col-span-2 p-5 overflow-y-auto space-y-3 bg-zinc-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400 tracking-wider">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Indexed Vector Chunks ({chunks.length})</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono tabular-nums">800-char window · 100-char overlap</span>
            </div>

            {chunks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Select a document from the left list to review its chunked text and vector segments.
              </div>
            ) : (
              <div className="space-y-2.5">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-1.5 border-b border-zinc-800/60">
                      <span className="text-emerald-400 font-medium">Chunk #{chunk.chunk_index}</span>
                      <span className="tabular-nums">Page {chunk.page_number}</span>
                      <span className="text-zinc-500 tabular-nums">{chunk.text.length} chars</span>
                    </div>
                    <p className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
